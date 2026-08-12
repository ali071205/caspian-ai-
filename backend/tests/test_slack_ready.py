import json

from app.caspian_bridge import sender_name


def test_slack_sender_id_can_be_mapped(monkeypatch):
    monkeypatch.setenv("CASPIAN_SENDER_MAP", json.dumps({"U12345": "Rahul"}))
    assert sender_name({"id": "U12345", "name": "rahul"}) == "Rahul"


def test_slack_message_channel_is_preserved(client):
    client.post("/members", json={"name": "Rahul", "role": "Backend"})
    response = client.post(
        "/chat",
        json={
            "sender_name": "Rahul",
            "channel": "slack",
            "message": "Rahul, Monday tak API complete kar dena.",
        },
    )
    assert response.status_code == 200
    from app.database import SessionLocal
    from app.models import ConversationSummary
    from sqlalchemy import select

    with SessionLocal() as db:
        summary = db.scalar(select(ConversationSummary))
        assert summary.channel == "slack"
