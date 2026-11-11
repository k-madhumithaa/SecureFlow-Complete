import logging
from pathlib import Path

from flask import Flask, jsonify

from .config import Config
from .extensions import db


def create_app(test_config=None):

    app = Flask(
        __name__,
        instance_relative_config=True
    )

    app.config.from_object(Config)

    if test_config:
        app.config.update(test_config)

    Path(app.instance_path).mkdir(
        parents=True,
        exist_ok=True
    )

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )

    db.init_app(app)

    from .routes.health import health_bp
    from .routes.status import status_bp
    from .routes.deployments import deployments_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(status_bp)
    app.register_blueprint(deployments_bp)

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "error": "Resource not found"
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()

        app.logger.exception("Internal server error")

        return jsonify({
            "error": "Internal server error"
        }), 500

    with app.app_context():
        db.create_all()

    app.logger.info("SecureFlow application initialized")

    return app