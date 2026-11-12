#!/bin/sh
set -eu

mkdir -p /tmp/prometheus
rm -f /tmp/prometheus/*

exec gunicorn \
    --config gunicorn.conf.py \
    --bind=0.0.0.0:5000 \
    --workers=2 \
    --access-logfile=- \
    --error-logfile=- \
    run:app
