import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.routers import admin, appointments, auth, catalog, doctor, notifications, patients

settings = get_settings()
log = logging.getLogger("hcpp")

app = FastAPI(
    title=settings.app_name,
    docs_url="/api/docs" if settings.environment != "production" else None,
    openapi_url="/api/openapi.json" if settings.environment != "production" else None,
)

app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-Requested-With"],
)

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    # CSRF defence in depth (on top of SameSite=Lax cookies): state-changing
    # requests must carry a custom header, which cross-site forms cannot set
    # and cross-origin scripts cannot send without passing CORS.
    if request.method not in SAFE_METHODS and request.url.path.startswith("/api/"):
        if request.headers.get("x-requested-with") != "hcpp":
            return JSONResponse({"detail": "Missing CSRF header"}, status_code=403)
    try:
        response = await call_next(request)
    except Exception:  # never leak stack traces or data to clients
        log.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse({"detail": "Internal server error"}, status_code=500)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "same-origin")
    if request.url.path.startswith("/api/") and "cache-control" not in response.headers:
        response.headers["Cache-Control"] = "no-store"  # patient data must not be cached
    return response


for r in (auth, catalog, patients, appointments, doctor, notifications, admin):
    app.include_router(r.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
