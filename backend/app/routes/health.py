from flask import Blueprint, jsonify

from ..extensions import db

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "SecureFlow API"
    }), 200


@health_bp.route("/ready", methods=["GET"])
def readiness():
    try:
        db.session.execute(db.text("SELECT 1"))

        return jsonify({
            "status": "ready",
            "database": "connected"
        }), 200

    except Exception:
        db.session.rollback()

        return jsonify({
            "status": "not_ready",
            "database": "disconnected"
        }), 503