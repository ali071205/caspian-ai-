from sqlalchemy import select

from app.database import SessionLocal
from app.models import ConversationSummary, Dependency, Notification, Task, TaskStatusHistory
from app.teamops import detect_secret, extract_intent


def add_member(client, name, role):
    return client.post("/members", json={"name": name, "role": role}).json()


def create_task(client, title, owner_id):
    response = client.post("/tasks", json={"title": title, "owner_id": owner_id})
    assert response.status_code == 201
    return response.json()


def test_contextfence_blocks_secrets_and_redacts_memory(client):
    lead = add_member(client, "Ali", "Team Lead")
    response = client.post("/chat", json={"sender_name": "Ali", "message": "Please use AWS_SECRET_ACCESS_KEY=super-secret-value-now"})
    assert response.json()["intent"]["intent"] == "CONTEXT_FENCE"
    task = client.get("/tasks").json()[0]
    assert task["title"] == "Security exposure review"
    assert "super-secret" not in task["description"]
    with SessionLocal() as db:
        summary = db.scalar(select(ConversationSummary))
        assert "super-secret" not in summary.summary
        alerts = list(db.scalars(select(Notification).where(Notification.user_id == lead["id"])))
        assert any("safely blocked" in alert.body for alert in alerts)


def test_contextfence_does_not_block_normal_assignment():
    assert detect_secret("Please update the API task today") is False
    assert detect_secret("Set API_KEY=short") is False


def test_delay_marks_task_and_transitively_marks_dependents_at_risk(client):
    rahul = add_member(client, "Rahul", "Backend")
    neha = add_member(client, "Neha", "Team Lead")
    base = create_task(client, "API", rahul["id"])
    middle = create_task(client, "Integration", neha["id"])
    final = create_task(client, "Release", rahul["id"])
    assert client.post("/dependencies", json={"task_id": middle["id"], "depends_on_task_id": base["id"]}).status_code == 201
    assert client.post("/dependencies", json={"task_id": final["id"], "depends_on_task_id": middle["id"]}).status_code == 201

    result = client.post("/chat", json={"sender_name": "Rahul", "message": "API will be 2 hours late"})
    assert result.json()["intent"]["intent"] == "REPORT_DELAY"
    tasks = {task["title"]: task for task in client.get("/tasks").json()}
    assert tasks["API"]["status"] == "DELAYED"
    assert tasks["Integration"]["at_risk"] is True
    assert tasks["Release"]["at_risk"] is True
    notifications = client.get(f"/notifications?user_id={neha['id']}").json()
    assert any(item["title"] == "Task At Risk" and item["severity"] == "critical" for item in notifications)


def test_dependency_rejects_duplicates_and_cycles(client):
    rahul = add_member(client, "Rahul", "Backend")
    first = create_task(client, "First", rahul["id"])
    second = create_task(client, "Second", rahul["id"])
    assert client.post("/dependencies", json={"task_id": second["id"], "depends_on_task_id": first["id"]}).status_code == 201
    assert client.post("/dependencies", json={"task_id": second["id"], "depends_on_task_id": first["id"]}).status_code == 409
    assert client.post("/dependencies", json={"task_id": first["id"], "depends_on_task_id": second["id"]}).status_code == 400


def test_ci_failure_event_marks_owner_tasks_at_risk_and_commits_notifications(client):
    rahul = add_member(client, "Rahul", "Backend")
    ali = add_member(client, "Ali", "Team Lead")
    task = create_task(client, "API", rahul["id"])
    response = client.post("/events", json={"source": "github", "category": "github_actions", "summary": "CI failed. Owner: Rahul"})
    assert response.status_code == 201
    assert client.get("/tasks").json()[0]["at_risk"] is True
    with SessionLocal() as db:
        notifications = list(db.scalars(select(Notification)))
        assert any(item.user_id == rahul["id"] and item.title == "CI Failure" for item in notifications)
        assert any(item.user_id == ali["id"] and item.title == "Team CI Failure" for item in notifications)


def test_non_ci_event_does_not_alert(client):
    rahul = add_member(client, "Rahul", "Backend")
    create_task(client, "API", rahul["id"])
    client.post("/events", json={"source": "github", "category": "issue", "summary": "Issue opened"})
    assert client.get("/notifications").json() == []


def test_delay_intent_supports_delayed_wording():
    result = extract_intent("API is 3 hours delayed")
    assert result["intent"] == "REPORT_DELAY"
    assert result["task"] == "API"
    assert result["hours"] == 3
