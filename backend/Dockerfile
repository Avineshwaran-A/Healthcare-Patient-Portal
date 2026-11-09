FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app

RUN useradd --create-home appuser && mkdir -p /data/uploads && chown appuser /data/uploads
USER appuser

EXPOSE 8000
# Apply migrations, then serve with WEB_CONCURRENCY worker processes (default 2).
# Seeding is a separate, explicit step.
ENV WEB_CONCURRENCY=2
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY} --proxy-headers --forwarded-allow-ips='*'"]
