from datetime import datetime, timezone

from .extensions import db


class Deployment(db.Model):
    __tablename__ = "deployments"

    id = db.Column(db.Integer, primary_key=True)

    version = db.Column(
        db.String(50),
        nullable=False
    )

    environment = db.Column(
        db.String(30),
        nullable=False
    )

    status = db.Column(
        db.String(30),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self):
        return {
            "id": self.id,
            "version": self.version,
            "environment": self.environment,
            "status": self.status,
            "created_at": self.created_at.isoformat()
        }