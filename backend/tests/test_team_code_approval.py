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
    res_login = client.post("/auth/login", json={"name": "Kavya"})
    assert res_login.status_code == 403

    # 3. Check pending list
    res_pending = client.get("/members/pending")
    assert res_pending.status_code == 200
    pending_names = [m["name"] for m in res_pending.json()]
    assert "Kavya" in pending_names

    # 4. Admin approves Kavya
    res_approve = client.patch(f"/members/{user_id}/approve", json={"approved": True})
    assert res_approve.status_code == 200
    assert res_approve.json()["approved"] is True
    assert res_approve.json()["active"] is True

    # 5. Approved member can now log in
    res_login_ok = client.post("/auth/login", json={"name": "Kavya"})
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
    res_reject = client.delete(f"/members/{user_id}/reject")
    assert res_reject.status_code == 204

    # Ensure deleted
    res_login = client.post("/auth/login", json={"name": "Spammer"})
    assert res_login.status_code == 401
