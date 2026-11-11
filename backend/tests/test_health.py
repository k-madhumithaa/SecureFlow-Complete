def test_health_endpoint(client):

    response = client.get("/health")

    assert response.status_code == 200

    data = response.get_json()

    assert data["status"] == "ok"
    assert data["service"] == "SecureFlow API"


def test_readiness_endpoint(client):

    response = client.get("/ready")

    assert response.status_code == 200

    data = response.get_json()

    assert data["status"] == "ready"
    assert data["database"] == "connected"


def test_application_status(client):

    response = client.get("/api/status")

    assert response.status_code == 200

    data = response.get_json()

    assert data["application"] == "SecureFlow"
    assert data["status"] == "running"