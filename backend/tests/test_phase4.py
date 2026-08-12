import json

from app.caspian_bridge import handle_caspian_message, sender_name


class FakeMessage:
    def __init__(self, text, sender=None, channel="email"):
        self.text = text
        self.sender = sender or {}
        self.channel = channel
        self.replies = []

    def reply(self, text):
        self.replies.append(text)


def add_member(client, name, role):
    return client.post("/members", json={"name": name, "role": role}).json()


def test_sender_mapping_is_case_insensitive(monkeypatch):
    monkeypatch.setenv("CASPIAN_SENDER_MAP", json.dumps({"rahul@example.com": "Rahul"}))
    assert sender_name({"address": "Rahul@Example.com"}) == "Rahul"


def test_caspian_message_enters_teamops_and_replies(client):
    rahul = add_member(client, "Rahul", "Backend")
    message = FakeMessage("Rahul, Monday tak API complete kar dena.", {"address": "ali@example.com", "name": "Ali"})
    result = handle_caspian_message(message)
    assert result["intent"]["intent"] == "CREATE_TASK"
    assert "Task created for Rahul" in message.replies[0]
    assert client.get(f"/tasks?owner_id={rahul['id']}").json()[0]["status"] == "PENDING_ACK"


def test_mapped_member_can_accept_through_caspian(client, monkeypatch):
    rahul = add_member(client, "Rahul", "Backend")
    client.post("/tasks", json={"title": "Complete API", "owner_id": rahul["id"]})
    monkeypatch.setenv("CASPIAN_SENDER_MAP", '{"rahul@example.com":"Rahul"}')
    message = FakeMessage("Accepted", {"address": "rahul@example.com"})
    result = handle_caspian_message(message)
    assert result["intent"]["intent"] == "ACKNOWLEDGE_TASK"
    assert "IN_PROGRESS" in message.replies[0]


def test_notification_can_be_marked_read(client):
    rahul = add_member(client, "Rahul", "Backend")
    client.post("/chat", json={"message": "Rahul, Monday tak API complete kar dena.", "sender_name": "Ali"})
    item = client.get(f"/notifications?user_id={rahul['id']}&unread_only=true").json()[0]
    updated = client.patch(f"/notifications/{item['id']}/read")
    assert updated.status_code == 200
    assert updated.json()["read"] is True
