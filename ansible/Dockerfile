FROM python:3.13.18-slim-trixie

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /workspace

RUN python -m pip install --no-cache-dir --upgrade pip==26.2.2 \
    && python -m pip install --no-cache-dir \
       ansible-core==2.19.2 \
       docker==7.1.0

COPY requirements.yml /workspace/requirements.yml

RUN ansible-galaxy collection install \
    -r /workspace/requirements.yml

CMD ["ansible-playbook", "--version"]