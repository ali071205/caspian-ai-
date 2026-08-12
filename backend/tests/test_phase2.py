from datetime import datetime

from app.teamops import extract_intent


def add_member(client, name, role):
    return client.post("/members", json={"name": name, "role": role}).json()


def test_hinglish_task_extraction_is_structured():
    result = extract_intent("Rahul, Monday tak API complete kar dena.", now=datetime(2026, 8, 12, 10))
    assert result["intent"] == "CREATE_TASK"
    assert result["owner"] == "Rahul"
    assert result["task"] == "API complete"
    assert result["deadline"] == datetime(2026, 8, 17, 18)
    assert result["status"] == "PENDING_ACK"


def test_message_creates_task_and_owner_accepts(client):
    rahul = add_member(client, "Rahul", "Backend")
    created = client.post("/chat", json={"sender_name": "Ali", "message": "Rahul, Monday tak API complete kar dena."})
    assert created.status_code == 200
    assert created.json()["intent"]["intent"] == "CREATE_TASK"
    tasks = client.get(f"/tasks?owner_id={rahul['id']}").json()
    assert tasks[0]["status"] == "PENDING_ACK"
    notifications = client.get(f"/notifications?user_id={rahul['id']}").json()
    assert notifications[0]["title"] == "New commitment"

    accepted = client.post("/chat", json={"sender_name": "Rahul", "message": "Accepted"})
    assert accepted.json()["intent"]["intent"] == "ACKNOWLEDGE_TASK"
    assert client.get(f"/tasks?owner_id={rahul['id']}").json()[0]["status"] == "IN_PROGRESS"


def test_queries_use_database_state(client):
    rahul = add_member(client, "Rahul", "Backend")
    add_member(client, "Neha", "UI")
    task = client.post("/tasks", json={"title": "Complete API", "owner_id": rahul["id"]}).json()
    client.patch(f"/tasks/{task['id']}", json={"status": "BLOCKED"})

    today = client.post("/chat", json={"sender_name": "Ali", "message": "Aaj team ko kya karna hai?"}).json()["reply"]
    status = client.post("/chat", json={"sender_name": "Ali", "message": "Rahul ka status kya hai?"}).json()["reply"]
    blockers = client.post("/chat", json={"sender_name": "Ali", "message": "Koi blocker hai?"}).json()["reply"]
    assert "Rahul" in today and "Complete API" in today and "BLOCKED" in today
    assert "Complete API: BLOCKED" in status
    assert "Rahul: Complete API" in blockers


def test_unknown_member_does_not_create_task(client):
    response = client.post("/chat", json={"message": "Ghost, Monday tak API complete kar dena."}).json()
    assert "not a team member" in response["reply"]
    assert client.get("/tasks").json() == []


def test_conversation_summary_is_compact(client):
    add_member(client, "Rahul", "Backend")
    client.post("/chat", json={"sender_name": "Ali", "channel": "telegram", "message": "Rahul, Monday tak API complete kar dena."})
    from app.database import SessionLocal
    from app.models import ConversationSummary
    from sqlalchemy import select
    with SessionLocal() as db:
        summary = db.scalar(select(ConversationSummary))
        assert summary.channel == "telegram"
        assert len(summary.summary) < 700


def test_help_and_extension_are_explicit_requests(client):
    rahul = add_member(client, "Rahul", "Backend")
    client.post("/tasks", json={"title": "Complete API", "owner_id": rahul["id"]})
    extension = client.post("/chat", json={"sender_name": "Rahul", "message": "Need extension"}).json()
    assert extension["intent"]["intent"] == "REQUEST_EXTENSION"
    assert "deadline is unchanged" in extension["reply"]
    help_request = client.post("/chat", json={"sender_name": "Rahul", "message": "Help"}).json()
    assert help_request["intent"]["intent"] == "REQUEST_HELP"
    assert client.get(f"/tasks?owner_id={rahul['id']}").json()[0]["status"] == "BLOCKED"
