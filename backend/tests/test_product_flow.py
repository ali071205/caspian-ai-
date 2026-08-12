from app.teamops import extract_intent


def add_member(client, name, role):
    response = client.post("/members", json={"name": name, "role": role})
    assert response.status_code == 201
    return response.json()


def test_signal_from_slack_is_routed_to_ui_role(client):
    add_member(client, "Ali", "Team Lead")
    priya = add_member(client, "Priya", "UI Developer")
    response = client.post("/chat", json={"sender_name": "Ali", "channel": "slack", "message": "The login screen is blank after the release."})
    assert response.status_code == 200
    assert response.json()["intent"]["intent"] == "ROUTE_INCIDENT"
    tasks = client.get(f"/tasks?owner_id={priya['id']}").json()
    assert tasks[0]["title"] == "UI incident"
    assert tasks[0]["at_risk"] is True
    assert "slack" in tasks[0]["description"]


def test_exposed_credential_creates_redacted_security_task_for_devops(client):
    devops = add_member(client, "Maya", "AWS / DevOps")
    response = client.post("/chat", json={"channel": "email", "message": "AWS_SECRET_ACCESS_KEY=super-secret-value-now"})
    assert response.json()["intent"]["intent"] == "CONTEXT_FENCE"
    task = client.get(f"/tasks?owner_id={devops['id']}").json()[0]
    assert task["title"] == "Security exposure review"
    assert "super-secret" not in task["description"]


def test_voice_style_tonight_assignment_is_structured(client):
    rahul = add_member(client, "Rahul", "Backend Developer")
    intent = extract_intent("Rahul, implement the login feature by tonight")
    assert intent["intent"] == "CREATE_TASK"
    created = client.post("/chat", json={"sender_name": "Ali", "message": "Rahul, implement the login feature by tonight"})
    assert created.json()["intent"]["intent"] == "CREATE_TASK"
    task = client.get(f"/tasks?owner_id={rahul['id']}").json()[0]
    assert task["title"] == "Implement the login feature"
    assert task["deadline"] is not None


def test_connection_status_is_truthful_when_caspian_is_not_configured(client, monkeypatch):
    monkeypatch.delenv("CASPIAN_API_KEY", raising=False)
    connections = client.get("/connections")
    assert {item["channel"] for item in connections.json()} == {"email", "slack"}
    response = client.post("/connections/slack/start")
    assert response.status_code == 200
    assert response.json()["status"] == "needs_configuration"
    assert "CASPIAN_API_KEY" in response.json()["detail"]


def test_ai_router_creates_task_only_for_valid_active_owner(client, monkeypatch):
    from app.ai_router import AIRoutingDecision

    ali = add_member(client, "Ali", "Team Lead")
    priya = add_member(client, "Priya", "UI Developer")
    monkeypatch.setattr(
        "app.teamops.route_with_gemini",
        lambda *_args: AIRoutingDecision(
            needs_task=True,
            category="ui",
            priority="high",
            owner_id=priya["id"],
            title="Fix payment-screen contrast",
            description="A customer reports unreadable text in the payment screen.",
            deadline_hours=8,
            confidence=0.93,
            rationale="Priya owns UI work.",
        ),
    )
    response = client.post("/chat", json={"sender_name": "Ali", "channel": "slack", "message": "Customers cannot read the payment labels."})
    assert response.json()["intent"]["intent"] == "AI_ROUTE"
    task = client.get(f"/tasks?owner_id={priya['id']}").json()[0]
    assert task["title"] == "Fix payment-screen contrast"
    assert task["description"].startswith("AI-routed from slack")


def test_ai_router_rejects_invalid_owner_or_low_confidence(client, monkeypatch):
    from app.ai_router import AIRoutingDecision

    add_member(client, "Ali", "Team Lead")
    monkeypatch.setattr(
        "app.teamops.route_with_gemini",
        lambda *_args: AIRoutingDecision(needs_task=True, category="general", owner_id=999, title="Do unsafe work", confidence=0.99),
    )
    response = client.post("/chat", json={"message": "Just checking in", "channel": "slack"})
    assert response.json()["intent"]["intent"] == "UNKNOWN"
    assert client.get("/tasks").json() == []
