from datetime import timedelta

from app.db import SessionLocal
from app.models import Appointment
from app.utils import now_local
from tests.conftest import doctor_id, future_slot


def _book(client, did, slot=None, **kw):
    return client.post("/api/appointments", json={"doctor_id": did, "start_at": slot or future_slot(), **kw})


# ---------- appointments ----------
def test_slots_exclude_booked(patient):
    did = doctor_id(patient)
    day = future_slot()[:10]
    before = patient.get(f"/api/doctors/{did}/slots", params={"day": day}).json()
    assert _book(patient, did).status_code == 201
    after = patient.get(f"/api/doctors/{did}/slots", params={"day": day}).json()
    assert len(after) == len(before) - 1
    assert future_slot() not in [s["start_at"] for s in after]


def test_double_booking_prevented(patient, patient2):
    did = doctor_id(patient)
    assert _book(patient, did).status_code == 201
    r = _book(patient2, did)
    assert r.status_code == 409


def test_cancelled_slot_can_be_rebooked(patient, patient2):
    did = doctor_id(patient)
    a = _book(patient, did).json()
    assert patient.post(f"/api/appointments/{a['id']}/cancel").json()["status"] == "cancelled"
    assert _book(patient2, did).status_code == 201


def test_invalid_slots_rejected(patient):
    did = doctor_id(patient)
    past = (now_local() - timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0).isoformat()
    assert _book(patient, did, past).status_code == 422
    misaligned = future_slot()[:-5] + "10:07"
    assert _book(patient, did, misaligned.replace("T10:00:", "T10:")).status_code == 422
    assert _book(patient, did, future_slot(days=400)).status_code == 422


def test_reschedule(patient, patient2):
    did = doctor_id(patient)
    a = _book(patient, did).json()
    _book(patient2, did, future_slot(hour=11))
    assert patient.post(f"/api/appointments/{a['id']}/reschedule", json={"start_at": future_slot(hour=11)}).status_code == 409
    r = patient.post(f"/api/appointments/{a['id']}/reschedule", json={"start_at": future_slot(hour=12)})
    assert r.status_code == 200 and r.json()["start_at"].startswith(future_slot(hour=12)[:13])


def test_patient_cannot_see_others_appointments(patient, patient2):
    a = _book(patient, doctor_id(patient)).json()
    assert patient2.get(f"/api/appointments/{a['id']}").status_code == 404
    assert patient2.post(f"/api/appointments/{a['id']}/cancel").status_code == 404
    assert patient2.get("/api/appointments").json()["total"] == 0


def test_booking_notifies_doctor_and_status_notifies_patient(patient, doctor):
    a = _book(patient, doctor_id(patient)).json()
    n = doctor.get("/api/notifications").json()
    assert n["unread"] == 1 and "booked" in n["items"][0]["message"]
    assert doctor.patch(f"/api/appointments/{a['id']}/status", json={"status": "confirmed"}).status_code == 200
    assert patient.get("/api/notifications").json()["unread"] == 1
    patient.post("/api/notifications/read-all")
    assert patient.get("/api/notifications").json()["unread"] == 0


def test_role_permissions(patient, doctor, doctor2):
    a = _book(patient, doctor_id(patient)).json()
    assert patient.patch(f"/api/appointments/{a['id']}/status", json={"status": "confirmed"}).status_code == 403
    assert doctor2.patch(f"/api/appointments/{a['id']}/status", json={"status": "confirmed"}).status_code == 404
    assert patient.get("/api/admin/stats").status_code == 403
    assert doctor.get("/api/admin/users").status_code == 403
    assert patient.get("/api/doctor/dashboard").status_code == 403


def test_invalid_transitions(patient, doctor):
    a = _book(patient, doctor_id(patient)).json()
    # future appointment can't be completed
    assert doctor.patch(f"/api/appointments/{a['id']}/status", json={"status": "completed"}).status_code == 409
    doctor.patch(f"/api/appointments/{a['id']}/status", json={"status": "cancelled"})
    assert doctor.patch(f"/api/appointments/{a['id']}/status", json={"status": "confirmed"}).status_code == 409


# ---------- consultation ----------
def _todays_appointment(patient) -> int:
    """Book a future slot, then move it to the past directly (simulates the visit happening)."""
    a = _book(patient, doctor_id(patient)).json()
    db = SessionLocal()
    appt = db.get(Appointment, a["id"])
    start = now_local().replace(second=0, microsecond=0) - timedelta(minutes=30)
    appt.start_at, appt.end_at = start, start + timedelta(minutes=30)
    db.commit()
    db.close()
    return a["id"]


def test_consultation_workflow(patient, doctor, doctor2):
    aid = _todays_appointment(patient)
    pid = patient.get("/api/auth/me").json()["patient_id"]

    # treatment relationship required
    assert doctor2.get(f"/api/doctor/patients/{pid}/history").status_code == 404
    assert doctor.get(f"/api/doctor/patients/{pid}/history").status_code == 200

    body = {
        "chief_complaint": "Cough",
        "notes": "Clinical notes",
        "prescription_items": [{"medication": "Syrup X", "dosage": "5 ml", "frequency": "TID", "duration_days": 5}],
        "lab_tests": ["CBC"],
    }
    assert doctor2.post(f"/api/doctor/appointments/{aid}/consultation", json=body).status_code == 404
    assert doctor.post(f"/api/doctor/appointments/{aid}/consultation", json=body).status_code == 201
    assert doctor.post(f"/api/doctor/appointments/{aid}/consultation", json=body).status_code == 409

    assert patient.get(f"/api/appointments/{aid}").json()["status"] == "completed"
    rx = patient.get("/api/patients/me/prescriptions").json()
    assert rx[0]["items"][0]["medication"] == "Syrup X"
    assert patient.get("/api/patients/me/records").json()[0]["notes"] == "Clinical notes"
    labs = patient.get("/api/patients/me/labs").json()
    assert labs[0]["status"] == "requested"
    inv = patient.get("/api/patients/me/invoices").json()
    assert len(inv) == 1 and inv[0]["status"] == "unpaid"

    # results are entered by the lab, not by doctors (see test_access_control.py)
    assert doctor.post(f"/api/doctor/labs/{labs[0]['id']}/result", data={"summary": "x"}).status_code in (404, 405)


def test_audit_log_records_access(patient, doctor, admin):
    _todays_appointment(patient)
    pid = patient.get("/api/auth/me").json()["patient_id"]
    doctor.get(f"/api/doctor/patients/{pid}/history")
    actions = [a["action"] for a in admin.get("/api/admin/audit-logs").json()["items"]]
    assert "record.view" in actions and "appointment.book" in actions


# ---------- admin ----------
def test_admin_departments_and_stats(admin, patient):
    r = admin.post("/api/admin/departments", json={"name": "Cardiology"})
    assert r.status_code == 201
    assert admin.post("/api/admin/departments", json={"name": "Cardiology"}).status_code == 409
    gm = next(d for d in admin.get("/api/departments").json() if d["name"] == "General Medicine")
    assert admin.delete(f"/api/admin/departments/{gm['id']}").status_code == 409  # has doctors
    assert admin.delete(f"/api/admin/departments/{r.json()['id']}").status_code == 200
    _book(patient, doctor_id(patient))
    s = admin.get("/api/admin/stats").json()
    assert s["patients"] == 2 and s["doctors"] == 2 and s["appointments_upcoming"] == 1


def test_availability_overlap_rejected(doctor):
    w = {"weekday": 0, "start_time": "09:00", "end_time": "12:00", "slot_minutes": 30}
    w2 = {**w, "start_time": "11:00", "end_time": "13:00"}
    assert doctor.put("/api/doctor/availability", json={"windows": [w, w2]}).status_code == 422
    assert len(doctor.put("/api/doctor/availability", json={"windows": [w]}).json()) == 1
