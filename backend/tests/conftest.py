import os
import tempfile

os.environ["HCPP_DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["HCPP_UPLOAD_DIR"] = tempfile.mkdtemp()
os.environ["HCPP_ENVIRONMENT"] = "test"

from datetime import datetime, time, timedelta  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Department, Doctor, DoctorAvailability, Patient, Role, User  # noqa: E402
from app.routers import auth as auth_router  # noqa: E402
from app.utils import now_local  # noqa: E402

PW = "Password123"


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    auth_router._failures.clear()
    db = SessionLocal()
    pw = hash_password(PW)
    dep = Department(name="General Medicine")
    db.add(dep)
    db.add(User(email="admin@example.com", password_hash=pw, full_name="Admin", role=Role.admin))
    db.add(User(email="lab1@example.com", password_hash=pw, full_name="Lab One", role=Role.lab))
    db.add(User(email="lab2@example.com", password_hash=pw, full_name="Lab Two", role=Role.lab))
    db.add(User(email="billing@example.com", password_hash=pw, full_name="Billing", role=Role.billing))
    for i, email in enumerate(["doc1@example.com", "doc2@example.com"]):
        u = User(email=email, password_hash=pw, full_name=f"Doctor {i + 1}", role=Role.doctor)
        u.doctor = Doctor(
            department=dep,
            specialty="GP",
            qualifications="MBBS",
            registration_number=f"REG{i}",
            is_approved=True,
            availability=[DoctorAvailability(weekday=d, start_time=time(0), end_time=time(23, 30), slot_minutes=30) for d in range(7)],
        )
        db.add(u)
    for email in ["pat1@example.com", "pat2@example.com"]:
        u = User(email=email, password_hash=pw, full_name=email.split("@")[0], role=Role.patient)
        u.patient = Patient()
        db.add(u)
    db.commit()
    db.close()
    yield


class Client(TestClient):
    """TestClient that sends the CSRF header like the real frontend."""

    def request(self, method, url, **kw):
        headers = kw.pop("headers", None) or {}
        headers.setdefault("X-Requested-With", "hcpp")
        return super().request(method, url, headers=headers, **kw)


def login(email: str) -> Client:
    c = Client(app)
    r = c.post("/api/auth/login", json={"email": email, "password": PW})
    assert r.status_code == 200, r.text
    return c


@pytest.fixture
def anon():
    return Client(app)


@pytest.fixture
def patient():
    return login("pat1@example.com")


@pytest.fixture
def patient2():
    return login("pat2@example.com")


@pytest.fixture
def doctor():
    return login("doc1@example.com")


@pytest.fixture
def doctor2():
    return login("doc2@example.com")


@pytest.fixture
def admin():
    return login("admin@example.com")


def future_slot(days: int = 1, hour: int = 10) -> str:
    return datetime.combine(now_local().date() + timedelta(days=days), time(hour)).isoformat()


def doctor_id(client, n: int = 1) -> int:
    items = client.get("/api/doctors").json()["items"]
    return next(d["id"] for d in items if d["full_name"] == f"Doctor {n}")


@pytest.fixture
def lab():
    return login("lab1@example.com")


@pytest.fixture
def lab2():
    return login("lab2@example.com")


@pytest.fixture
def billing():
    return login("billing@example.com")
