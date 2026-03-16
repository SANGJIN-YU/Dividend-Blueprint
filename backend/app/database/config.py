import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dividend_blueprint.db")
