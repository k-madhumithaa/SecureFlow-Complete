
# ==========================================
# Stage 1: Build application dependencies
# ==========================================
FROM python:3.13.18-slim-trixie AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /build

RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /build/requirements.txt

RUN python -m pip install --no-cache-dir --upgrade pip==26.2.2 \
    && python -m pip install --no-cache-dir \
       --prefix=/install \
       -r /build/requirements.txt \
    && python -m pip install --no-cache-dir \
       --prefix=/install \
       certifi==2026.10.23 \
       msgpack==1.2.3 \
       setuptools==80.10.2 \
       urllib3==2.8.0

# ==========================================
# Stage 2: Production runtime
# ==========================================
FROM python:3.13.18-slim-trixie AS runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install/ /usr/local/

# Remove pip and ensurepip from the production runtime
RUN rm -rf \
    /usr/local/lib/python3.13/site-packages/pip \
    /usr/local/lib/python3.13/site-packages/pip-*.dist-info \
    /usr/local/lib/python3.13/ensurepip \
    /usr/local/bin/pip \
    /usr/local/bin/pip3 \
    /usr/local/bin/pip3.13

COPY backend/ /app/backend/

WORKDIR /app/backend

RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p instance \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5000/health', timeout=3)" || exit 1

CMD ["gunicorn", "--bind=0.0.0.0:5000", "--workers=2", "--access-logfile=-", "--error-logfile=-", "run:app"]