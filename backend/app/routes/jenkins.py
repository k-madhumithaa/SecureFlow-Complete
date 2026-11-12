
import base64
import json
import logging
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from flask import Blueprint, current_app, jsonify

jenkins_bp = Blueprint("jenkins", __name__)

logger = logging.getLogger(__name__)


@jenkins_bp.get("/api/jenkins/builds")
def get_jenkins_builds():
    config = current_app.config

    jenkins_url = (config.get("JENKINS_URL") or "").rstrip("/")
    username = config.get("JENKINS_USERNAME")
    api_token = config.get("JENKINS_API_TOKEN")
    job_name = config.get("JENKINS_JOB_NAME")
    timeout = config.get("JENKINS_TIMEOUT", 10)

    if not all([jenkins_url, username, api_token, job_name]):
        return jsonify({
            "status": "unconfigured",
            "error": "Jenkins integration is not configured."
        }), 503

    encoded_job = quote(job_name, safe="")
    endpoint = (
        f"{jenkins_url}/job/{encoded_job}/api/json"
        "?tree=name,color,"
        "lastBuild[number,result,timestamp,duration,url],"
        "builds[number,result,timestamp,duration,url]{0,10}"
    )

    credentials = f"{username}:{api_token}".encode("utf-8")
    auth_value = base64.b64encode(credentials).decode("ascii")

    request = Request(
        endpoint,
        headers={
            "Authorization": f"Basic {auth_value}",
            "Accept": "application/json"
        }
    )

    try:
        with urlopen(request, timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8"))

        builds = [
            {
                "number": build.get("number"),
                "result": build.get("result") or "RUNNING",
                "timestamp": build.get("timestamp"),
                "duration": build.get("duration"),
                "url": build.get("url")
            }
            for build in data.get("builds", [])
        ]

        last_build = data.get("lastBuild")

        return jsonify({
            "status": "ok",
            "job": data.get("name"),
            "job_color": data.get("color"),
            "last_build": last_build,
            "builds": builds,
            "build_count": len(builds)
        }), 200

    except HTTPError as error:
        logger.warning(
            "Jenkins API returned HTTP %s",
            error.code
        )

        return jsonify({
            "status": "error",
            "error": "Jenkins rejected the API request.",
            "upstream_status": error.code
        }), 502

    except (URLError, TimeoutError, OSError):
        logger.exception("Unable to reach Jenkins")

        return jsonify({
            "status": "error",
            "error": "Jenkins is currently unreachable."
        }), 502

    except (ValueError, json.JSONDecodeError):
        logger.exception("Invalid JSON response from Jenkins")

        return jsonify({
            "status": "error",
            "error": "Jenkins returned an invalid response."
        }), 502
