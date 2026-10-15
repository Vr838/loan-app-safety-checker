"""Integration tests for FastAPI endpoints, pagination, filtering, and admin auth."""

import pytest
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["database_connected"] is True
    assert "components" in data


@pytest.mark.asyncio
async def test_list_apps_pagination(client: AsyncClient):
    resp = await client.get("/api/v1/apps?page=1&page_size=2")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) <= 2
    assert data["page"] == 1
    assert data["page_size"] == 2


@pytest.mark.asyncio
async def test_search_apps(client: AsyncClient):
    resp = await client.get("/api/v1/apps?q=Bajaj")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert any("Bajaj" in item["title"] for item in data["items"])


@pytest.mark.asyncio
async def test_filter_by_risk_category(client: AsyncClient):
    resp = await client.get("/api/v1/apps?risk_category=High concern")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    for item in data["items"]:
        assert item["latest_assessment"]["risk_category"] == "High concern"


@pytest.mark.asyncio
async def test_get_app_detail_success(client: AsyncClient):
    pkg_id = "com.bajajfinserv.customerapp"
    resp = await client.get(f"/api/v1/apps/{pkg_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["package_id"] == pkg_id
    assert "evidence_items" in data
    assert "latest_assessment" in data


@pytest.mark.asyncio
async def test_get_app_detail_not_found(client: AsyncClient):
    resp = await client.get("/api/v1/apps/com.nonexistent.app")
    assert resp.status_code == 404
    data = resp.json()
    assert "not found" in data["detail"].lower()


@pytest.mark.asyncio
async def test_get_app_evidence(client: AsyncClient):
    pkg_id = "com.bajajfinserv.customerapp"
    resp = await client.get(f"/api/v1/apps/{pkg_id}/evidence")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_app_history(client: AsyncClient):
    pkg_id = "com.bajajfinserv.customerapp"
    resp = await client.get(f"/api/v1/apps/{pkg_id}/history")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_latest_scan(client: AsyncClient):
    resp = await client.get("/api/v1/scans/latest")
    assert resp.status_code == 200
    data = resp.json()
    assert data is not None
    assert "scan_uuid" in data
    assert "apps_discovered_count" in data


@pytest.mark.asyncio
async def test_admin_scan_trigger_unauthorized(client: AsyncClient):
    # Missing token -> 401
    resp = await client.post("/api/v1/scans/admin/trigger", json={})
    assert resp.status_code == 401

    # Invalid token -> 401
    resp_invalid = await client.post(
        "/api/v1/scans/admin/trigger",
        headers={"Authorization": "Bearer wrong-secret-token"},
        json={},
    )
    assert resp_invalid.status_code == 401


from unittest.mock import patch

@pytest.mark.asyncio
async def test_admin_scan_trigger_authorized(client: AsyncClient):
    valid_token = settings.ADMIN_API_TOKEN
    with patch("app.api.routes.scans._run_background_scan") as mock_scan:
        resp = await client.post(
            "/api/v1/scans/admin/trigger",
            headers={"Authorization": f"Bearer {valid_token}"},
            json={"max_apps_per_query": 2, "max_reviews_per_app": 5},
        )
        assert resp.status_code == 202
        data = resp.json()
        assert data["status"] == "accepted"
        assert "message" in data
