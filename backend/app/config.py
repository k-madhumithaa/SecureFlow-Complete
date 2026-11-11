import os
from pathlib import Path


class Config:
    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        "development-only-secret-key"
    )

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(Path(__file__).resolve().parents[1] / 'instance' / 'secureflow.db').as_posix()}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False