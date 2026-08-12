def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_member_task_and_done_flow(client):
    member = client.post("/members", json={"name": "Rahul", "role": "Backend"})
    assert member.status_code == 201
    user_id = member.json()["id"]

    task = client.post("/tasks", json={"title": "Complete API", "owner_id": user_id, "deadline": "2026-08-17T18:00:00"})
    assert task.status_code == 201
    assert task.json()["status"] == "PENDING_ACK"

    updated = client.patch(f"/tasks/{task.json()['id']}", json={"status": "DONE"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "DONE"
    assert client.get(f"/tasks?owner_id={user_id}").json()[0]["title"] == "Complete API"


def test_rejects_unknown_owner(client):
    response = client.post("/tasks", json={"title": "Impossible task", "owner_id": 999})
    assert response.status_code == 404

