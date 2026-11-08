from datetime import datetime
from zoneinfo import ZoneInfo

from app.core.config import get_settings


def now_local() -> datetime:
    """Current hospital wall-clock time as a naive datetime (second precision)."""
    tz = ZoneInfo(get_settings().timezone)
    return datetime.now(tz).replace(tzinfo=None, microsecond=0)
