"""Validated storage for lab report files.

Files are stored under a random key outside any web root and only served
through an authorised endpoint. The type is decided by magic bytes, not by
the client-supplied filename or Content-Type.
"""

import re
import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

SIGNATURES = {
    b"%PDF-": ("application/pdf", ".pdf"),
    b"\x89PNG\r\n\x1a\n": ("image/png", ".png"),
    b"\xff\xd8\xff": ("image/jpeg", ".jpg"),
}


def _dir() -> Path:
    p = Path(get_settings().upload_dir).resolve()
    p.mkdir(parents=True, exist_ok=True)
    return p


def _safe_name(name: str | None, ext: str) -> str:
    stem = re.sub(r"[^A-Za-z0-9._ -]", "_", Path(name or "report").stem)[:80] or "report"
    return stem + ext


async def save_upload(upload: UploadFile) -> tuple[str, str, str]:
    """Returns (file_key, display_name, mime)."""
    limit = get_settings().max_upload_bytes
    data = await upload.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File exceeds 5 MB limit")
    if not data:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "File is empty")
    for sig, (mime, ext) in SIGNATURES.items():
        if data.startswith(sig):
            break
    else:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Only PDF, PNG or JPEG files are allowed")
    key = secrets.token_hex(16) + ext
    (_dir() / key).write_bytes(data)
    return key, _safe_name(upload.filename, ext), mime


def path_for(key: str) -> Path:
    if not re.fullmatch(r"[0-9a-f]{32}\.(pdf|png|jpg)", key):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    p = _dir() / key
    if not p.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    return p


def delete(key: str | None) -> None:
    if key:
        try:
            path_for(key).unlink()
        except HTTPException:
            pass
