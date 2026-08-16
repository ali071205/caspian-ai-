import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_team_code_verification(client):
    # Valid default code
    res = client.post("/team/verify-code", json={"team_code": "CASPIAN-2026"})
    assert res.status_code == 200
    assert res.json()["valid"] is True
    assert "team_name" in res.json()

    # Invalid code
    res_bad = client.post("/team/verify-code", json={"team_code": "WRONG-CODE-999"})
    assert res_bad.status_code == 404


def test_self_serve_join_and_approval_flow(client):
    # 1. New user submits join request with role and skills
    join_payload = {
        "team_code": "CASPIAN-2026",
        "name": "Kavya",
        "email": "kavya@company.com",
        "role": "QA Automation Engineer",
        "contact": "+1-555-0199",
        "skills_description": "Playwright, Cypress, API testing, load regression"
    }
    res_join = client.post("/team/join-request", json=join_payload)
    assert res_join.status_code == 201
    join_data = res_join.json()
    assert join_data["status"] == "pending_approval"
    user_id = join_data["member"]["user_id"]

    # 2. Unapproved member cannot log in
    res_login = client.post("/auth/member/login", json={"name": "Kavya", "team_code": "CASPIAN-2026"})
    assert res_login.status_code == 403

    # 3. Check pending list
    res_pending = client.get("/members/pending", params={"team_code": "CASPIAN-2026"})
    assert res_pending.status_code == 200
    pending_names = [m["name"] for m in res_pending.json()]
    assert "Kavya" in pending_names

    # 4. Admin approves Kavya
    res_approve = client.patch(f"/members/{user_id}/approve", json={"approved": True, "team_code": "CASPIAN-2026"})
    assert res_approve.status_code == 200
    assert res_approve.json()["approved"] is True
    assert res_approve.json()["active"] is True

    # 5. Approved member can now log in
    res_login_ok = client.post("/auth/member/login", json={"name": "Kavya", "team_code": "CASPIAN-2026"})
    assert res_login_ok.status_code == 200
    assert res_login_ok.json()["name"] == "Kavya"

    # 6. Active directory now contains Kavya with skills
    res_members = client.get("/members")
    assert res_members.status_code == 200
    kavya_member = next(m for m in res_members.json() if m["name"] == "Kavya")
    assert kavya_member["role"] == "QA Automation Engineer"
    assert "Playwright" in kavya_member["skills_description"]


def test_reject_join_request(client):
    join_payload = {
        "team_code": "CASPIAN-2026",
        "name": "Spammer",
        "email": "spam@example.com",
        "role": "Unknown",
    }
    res_join = client.post("/team/join-request", json=join_payload)
    assert res_join.status_code == 201
    user_id = res_join.json()["member"]["user_id"]

    # Reject
    res_reject = client.delete(f"/members/{user_id}/reject", params={"team_code": "CASPIAN-2026"})
    assert res_reject.status_code == 204

    # Ensure deleted
    res_login = client.post("/auth/member/login", json={"name": "Spammer", "team_code": "CASPIAN-2026"})
    assert res_login.status_code == 401


def test_multiple_admin_workspaces_are_isolated(client):
    first = client.post("/auth/admin/signup", json={
        "email": "owner-one@example.com", "password": "secret123",
        "name": "Owner One", "workspace_name": "One Team",
    })
    second = client.post("/auth/admin/signup", json={
        "email": "owner-two@example.com", "password": "secret123",
        "name": "Owner Two", "workspace_name": "Two Team",
    })
    assert first.status_code == 201
    assert second.status_code == 201
    code_one = first.json()["team_code"]
    code_two = second.json()["team_code"]
    assert code_one != code_two

    join = client.post("/team/join-request", json={
        "team_code": code_one, "name": "Developer One",
        "email": "developer-one@example.com", "role": "Backend Developer",
    })
    assert join.status_code == 201
    member_id = join.json()["member"]["user_id"]

    assert [m["name"] for m in client.get("/members/pending", params={"team_code": code_one}).json()] == ["Developer One"]
    assert client.get("/members/pending", params={"team_code": code_two}).json() == []
    assert client.patch(f"/members/{member_id}/approve", json={"approved": True, "team_code": code_two}).status_code == 404
    assert client.patch(f"/members/{member_id}/approve", json={"approved": True, "team_code": code_one}).status_code == 200

    assert client.post("/auth/member/login", json={"name": "Developer One", "team_code": code_two}).status_code == 401
    assert client.post("/auth/member/login", json={"name": "Developer One", "team_code": code_one}).status_code == 200

    owner_id = first.json()["user_id"]
    message = client.post("/messages/direct", json={
        "sender_id": owner_id,
        "recipient_id": member_id,
        "team_code": code_one,
        "message": "Please check the deployment notes.",
    })
    assert message.status_code == 201
    notifications = client.get("/notifications", params={"user_id": member_id}).json()
    assert any(item["title"] == "Message from Owner One" for item in notifications)


def test_admin_can_add_remove_and_restore_member(client):
    admin = client.post("/auth/admin/signup", json={
        "email": "team-manager@example.com", "password": "secret123",
        "name": "Team Manager", "workspace_name": "Managed Team",
    })
    assert admin.status_code == 201
    code = admin.json()["team_code"]

    added = client.post("/team/members", json={
        "team_code": code, "name": "Direct Member",
        "email": "direct-member@example.com", "role": "Designer",
    })
    assert added.status_code == 201
    member_id = added.json()["id"]
    assert client.post("/auth/member/login", json={"name": "Direct Member", "team_code": code}).status_code == 200

    removed = client.delete(f"/team/members/{member_id}", params={"team_code": code})
    assert removed.status_code == 204
    assert client.post("/auth/member/login", json={"name": "Direct Member", "team_code": code}).status_code == 403
    assert "Direct Member" not in [m["name"] for m in client.get("/members", params={"team_code": code}).json()]

    restored = client.post("/team/members", json={
        "team_code": code, "name": "Direct Member",
        "email": "direct-member@example.com", "role": "Lead Designer",
    })
    assert restored.status_code == 201
    assert restored.json()["id"] == member_id
    assert restored.json()["role"] == "Lead Designer"
    assert client.delete(f"/team/members/{admin.json()['user_id']}", params={"team_code": code}).status_code == 400
