from flask import Blueprint, jsonify

status_bp = Blueprint("status", __name__)


@status_bp.route("/api/status", methods=["GET"])
def application_status():
    return jsonify({
        "application": "SecureFlow",
        "version": "1.0.0",
        "environment": "development",
        "status": "running"
    }), 200