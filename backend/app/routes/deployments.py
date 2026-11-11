from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Deployment

deployments_bp = Blueprint(
    "deployments",
    __name__
)

ALLOWED_ENVIRONMENTS = {
    "development",
    "staging",
    "production"
}

ALLOWED_STATUSES = {
    "pending",
    "success",
    "failed"
}


@deployments_bp.route(
    "/api/deployments",
    methods=["GET"]
)
def get_deployments():

    deployments = Deployment.query.order_by(
        Deployment.id.desc()
    ).all()

    return jsonify({
        "deployments": [
            deployment.to_dict()
            for deployment in deployments
        ],
        "count": len(deployments)
    }), 200


@deployments_bp.route(
    "/api/deployments",
    methods=["POST"]
)
def create_deployment():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "A valid JSON object is required"
        }), 400

    version = data.get("version")
    environment = data.get("environment")
    status = data.get("status")

    if not all(
        isinstance(value, str) and value.strip()
        for value in (version, environment, status)
    ):
        return jsonify({
            "error": "version, environment and status are required"
        }), 400

    version = version.strip()
    environment = environment.strip().lower()
    status = status.strip().lower()

    if len(version) > 50:
        return jsonify({
            "error": "Version must not exceed 50 characters"
        }), 400

    if environment not in ALLOWED_ENVIRONMENTS:
        return jsonify({
            "error": "Invalid deployment environment"
        }), 400

    if status not in ALLOWED_STATUSES:
        return jsonify({
            "error": "Invalid deployment status"
        }), 400

    deployment = Deployment(
        version=version,
        environment=environment,
        status=status
    )

    db.session.add(deployment)
    db.session.commit()

    return jsonify({
        "message": "Deployment record created",
        "deployment": deployment.to_dict()
    }), 201