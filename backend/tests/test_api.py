from fastapi.testclient import TestClient

from backend.app.main import app


def test_etf_list_and_detail_and_simulation() -> None:
    with TestClient(app) as client:
        list_resp = client.get("/api/etf")
        assert list_resp.status_code == 200
        etfs = list_resp.json()
        assert len(etfs) >= 1
        assert {"ticker", "name", "price", "dividend_yield"}.issubset(etfs[0].keys())

        ticker = etfs[0]["ticker"]
        detail_resp = client.get(f"/api/etf/{ticker}")
        assert detail_resp.status_code == 200
        assert {
            "ticker",
            "name",
            "price",
            "dividend_yield",
            "dividend_frequency",
            "expense_ratio",
        }.issubset(detail_resp.json().keys())

        not_found_resp = client.get("/api/etf/UNKNOWN")
        assert not_found_resp.status_code == 404

        sim_resp = client.post(
            "/api/simulation",
            json={
                "ticker": ticker,
                "initial_investment": 10000,
                "monthly_investment": 500,
                "period_years": 5,
            },
        )
        assert sim_resp.status_code == 200
        payload = sim_resp.json()
        assert {"final_asset", "total_dividend", "yearly_projection"}.issubset(payload.keys())
        assert len(payload["yearly_projection"]) == 5


def test_openapi_exposes_three_api_paths() -> None:
    with TestClient(app) as client:
        schema = client.get("/openapi.json").json()
        paths = schema["paths"]
        assert "/api/etf" in paths
        assert "/api/etf/{ticker}" in paths
        assert "/api/simulation" in paths
