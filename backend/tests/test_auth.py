from tests.conftest import PW, Client, app


def test_register_patient_sets_httponly_cookie(anon):
    r = anon.post(
        "/api/auth/register/patient",
        json={"email": "New@Example.com", "password": "Secure12345", "full_name": "New Person"},
    )
    assert r.status_code == 201
    assert r.json()["role"] == "patient"
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie
    assert anon.get("/api/auth/me").json()["email"] == "new@example.com"
    assert "password" not in r.text


def test_duplicate_email_case_insensitive(anon):
    r = anon.post("/api/auth/register/patient", json={"email": "PAT1@example.com", "password": "Secure12345", "full_name": "X Y"})
    assert r.status_code == 409


def test_weak_password_rejected(anon):
    r = anon.post("/api/auth/register/patient", json={"email": "a@example.com", "password": "short", "full_name": "A B"})
    assert r.status_code == 422


def test_bad_login_generic_error(anon):
    r = anon.post("/api/auth/login", json={"email": "pat1@example.com", "password": "wrong-password1"})
    assert r.status_code == 401
    r2 = anon.post("/api/auth/login", json={"email": "nobody@example.com", "password": "wrong-password1"})
    assert r2.json() == r.json()


def test_login_rate_limited(anon):
    for _ in range(5):
        anon.post("/api/auth/login", json={"email": "pat1@example.com", "password": "nope-nope-1"})
    r = anon.post("/api/auth/login", json={"email": "pat1@example.com", "password": PW})
    assert r.status_code == 429


def test_csrf_header_required(anon):
    from fastapi.testclient import TestClient

    raw = TestClient(app)
    r = raw.post("/api/auth/login", json={"email": "pat1@example.com", "password": PW})
    assert r.status_code == 403


def test_unauthenticated_blocked(anon):
    assert anon.get("/api/appointments").status_code == 401
    assert anon.get("/api/doctors").status_code == 401


def test_logout_clears_session(patient):
    patient.post("/api/auth/logout")
    patient.cookies.clear()
    assert patient.get("/api/auth/me").status_code == 401


def test_doctor_registration_requires_approval(anon, admin):
    r = anon.post(
        "/api/auth/register/doctor",
        json={
            "email": "newdoc@example.com",
            "password": "Secure12345",
            "full_name": "Dr New",
            "specialty": "Dermatology",
            "qualifications": "MBBS",
            "registration_number": "REG-NEW",
        },
    )
    assert r.status_code == 201
    r = anon.post("/api/auth/login", json={"email": "newdoc@example.com", "password": "Secure12345"})
    assert r.status_code == 403
    pending = admin.get("/api/admin/doctors?approved=false").json()["items"]
    assert len(pending) == 1
    assert admin.post(f"/api/admin/doctors/{pending[0]['id']}/approve").status_code == 200
    c = Client(app)
    assert c.post("/api/auth/login", json={"email": "newdoc@example.com", "password": "Secure12345"}).status_code == 200


def test_deactivated_user_loses_access(admin, patient):
    me = patient.get("/api/auth/me").json()
    assert admin.patch(f"/api/admin/users/{me['id']}", json={"is_active": False}).status_code == 200
    assert patient.get("/api/auth/me").status_code == 401
