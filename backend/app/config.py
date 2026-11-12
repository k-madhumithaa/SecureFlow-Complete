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

    JENKINS_URL = os.getenv(
        "JENKINS_URL",
        "http://127.0.0.1:8080"
    )

    JENKINS_USERNAME = os.getenv("JENKINS_USERNAME")
    JENKINS_API_TOKEN = os.getenv("JENKINS_API_TOKEN")
    JENKINS_JOB_NAME = os.getenv(
        "JENKINS_JOB_NAME",
        "SecureFlow-CI-CD"
    )
    JENKINS_TIMEOUT = 10