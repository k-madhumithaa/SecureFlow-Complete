def test_get_empty_deployments(client):

    response = client.get("/api/deployments")

    assert response.status_code == 200

    data = response.get_json()

    assert data["count"] == 0
    assert data["deployments"] == []


def test_create_deployment(client):

    payload = {
        "version": "1.0.0",
        "environment": "staging",
        "status": "success"
    }

    response = client.post(
        "/api/deployments",
        json=payload
    )

    assert response.status_code == 201

    data = response.get_json()

    assert data["deployment"]["version"] == "1.0.0"
    assert data["deployment"]["environment"] == "staging"
    assert data["deployment"]["status"] == "success"


def test_reject_invalid_environment(client):

    payload = {
        "version": "1.0.0",
        "environment": "invalid",
        "status": "success"
    }

    response = client.post(
        "/api/deployments",
        json=payload
    )

    assert response.status_code == 400


def test_reject_missing_fields(client):

    response = client.post(
        "/api/deployments",
        json={"version": "1.0.0"}
    )

    assert response.status_code == 400