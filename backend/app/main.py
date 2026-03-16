from fastapi import FastAPI

from backend.app.api.router import router
from backend.app.db import init_db

app = FastAPI(title="Dividend Blueprint API")
app.include_router(router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
