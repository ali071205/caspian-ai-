import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app


def test_admin_signup_flow(client):
    signup_payload = {
        "email": "ceo@sentinel.ai",
        "password": "supersecretpassword123",
        "name": "Sarah Connor",
        "workspace_name": "SkyNet Ops Sentinel"
    }
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"id": "supa-123", "email": "ceo@sentinel.ai"})
        res = client.post("/auth/admin/signup", json=signup_payload)
        assert res.status_code == 201
        data = res.json()
        assert data["email"] == "ceo@sentinel.ai"
        assert data["name"] == "Sarah Connor"
        assert "CASPIAN-" in data["team_code"]
        assert "token" in data


def test_admin_password_login_flow(client):
    # Register admin first
    client.post("/auth/admin/signup", json={
        "email": "admin@company.com",
        "password": "securepassword",
        "name": "Admin Boss",
        "workspace_name": "Sentinel HQ"
    })

    # Login with valid password
    res = client.post("/auth/admin/login", json={
        "email": "admin@company.com",
        "password": "securepassword"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "admin@company.com"
    assert "CASPIAN-" in data["team_code"]
    assert "token" in data

    # Login with invalid email
    res_bad = client.post("/auth/admin/login", json={
        "email": "wrong@company.com",
        "password": "wrong"
    })
    assert res_bad.status_code == 401


def test_admin_otp_dispatch_and_verification(client):
    # Register admin
    client.post("/auth/admin/signup", json={
        "email": "otp_admin@company.com",
        "password": "mypassword",
        "name": "OTP Lead",
        "workspace_name": "OTP Workspace"
    })

    # 1. Send OTP (Forgot Password / Passwordless)
    res_otp = client.post("/auth/admin/send-otp", json={"email": "otp_admin@company.com"})
    assert res_otp.status_code == 200
    assert res_otp.json()["status"] == "sent"

    # 2. Verify OTP code
    res_verify = client.post("/auth/admin/verify-otp", json={
        "email": "otp_admin@company.com",
        "token_code": "123456"
    })
    assert res_verify.status_code == 200
    data = res_verify.json()
    assert data["name"] == "OTP Lead"
    assert "token" in data


def test_member_login_flow(client):
    # Create approved member
    client.post("/members", json={
        "name": "Devon",
        "role": "Frontend Engineer",
        "email": "devon@company.com"
    })

    # Member logs in
    res = client.post("/auth/member/login", json={"name": "Devon", "team_code": "CASPIAN-2026"})
    assert res.status_code == 200
    assert res.json()["name"] == "Devon"
    assert "token" in res.json()
