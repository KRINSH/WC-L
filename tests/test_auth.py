from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


# This test covers the full auth flow: register, login, then fetch `/me`.
def test_register_login_me_flow() -> None:
    with TestClient(app) as client:
        suffix = uuid4().hex[:8]
        username = f"player_{suffix}"
        email = f"{username}@example.com"
        password = "strongpassword123"

        # Step 1: create a new account.
        register_response = client.post(
            "/api/v1/auth/register",
            json={
                "username": username,
                "email": email,
                "password": password,
            },
        )

        assert register_response.status_code == 201
        user_payload = register_response.json()
        assert user_payload["username"] == username
        assert user_payload["email"] == email
        assert user_payload["is_admin"] is False
        assert user_payload["is_banned"] is False

        # Step 2: log in with the same credentials to get a bearer token.
        login_response = client.post(
            "/api/v1/auth/login",
            json={"login": username, "password": password},
        )

        assert login_response.status_code == 200
        token_payload = login_response.json()
        assert token_payload["token_type"] == "bearer"
        assert token_payload["access_token"]

        # Step 3: use the token to call the protected `/me` endpoint.
        me_response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token_payload['access_token']}"},
        )

        assert me_response.status_code == 200
        me_payload = me_response.json()
        assert me_payload["username"] == username
        assert me_payload["email"] == email
        assert me_payload["is_admin"] is False
        assert me_payload["is_banned"] is False


# This test proves the login endpoint rejects bad passwords.
def test_login_rejects_invalid_password() -> None:
    with TestClient(app) as client:
        suffix = uuid4().hex[:8]
        username = f"badpass_{suffix}"
        email = f"{username}@example.com"

        # Create a valid account first so the failed login is meaningful.
        client.post(
            "/api/v1/auth/register",
            json={
                "username": username,
                "email": email,
                "password": "strongpassword123",
            },
        )

        login_response = client.post(
            "/api/v1/auth/login",
            json={"login": username, "password": "wrongpassword"},
        )

        assert login_response.status_code == 401
        assert login_response.json()["detail"] == "Invalid credentials"


