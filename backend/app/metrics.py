
import os
import time

from flask import Response, request, g
from prometheus_client import (
    CollectorRegistry,
    CONTENT_TYPE_LATEST,
    Counter,
    Histogram,
    generate_latest,
    multiprocess,
)

REQUEST_COUNT = Counter(
    "secureflow_http_requests_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status"],
)

REQUEST_LATENCY = Histogram(
    "secureflow_http_request_duration_seconds",
    "HTTP request processing duration in seconds",
    ["method", "endpoint"],
)


def register_metrics(app):

    @app.before_request
    def start_request_timer():
        g.request_start_time = time.perf_counter()

    @app.after_request
    def record_request_metrics(response):

        if request.path != "/metrics":
            endpoint = request.endpoint or "unknown"
            method = request.method

            REQUEST_COUNT.labels(
                method=method,
                endpoint=endpoint,
                status=str(response.status_code),
            ).inc()

            start_time = getattr(g, "request_start_time", None)

            if start_time is not None:
                REQUEST_LATENCY.labels(
                    method=method,
                    endpoint=endpoint,
                ).observe(time.perf_counter() - start_time)

        return response

    @app.route("/metrics", methods=["GET"])
    def metrics():
        if os.environ.get("PROMETHEUS_MULTIPROC_DIR"):
            registry = CollectorRegistry()
            multiprocess.MultiProcessCollector(registry)
        else:
            registry = None

        return Response(
            generate_latest(registry),
            mimetype=CONTENT_TYPE_LATEST,
        )
