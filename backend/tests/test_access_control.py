"""Role boundaries: every role is denied what it does not own, on the API itself."""

import pytest

from tests.conftest import PW, Client, doctor_id
from tests.test_workflows import _todays_appointment

from app.main import app

PDF = ("r.pdf", b"%PDF-1.4 demo", "application/pdf")


def _consult(patient, doctor, **extra) -> tuple[int, int]:
    aid = _todays_appointment(patient)
    body = {
        "notes": "Clinical notes",
        "prescription_items": [{"medication": "Syrup X", "dosage": "5 ml", "frequency": "TID", "duration_days": 5}],
        "lab_tests": ["CBC"],
        **extra,
    }
    assert doctor.post(f"/api/doctor/appointments/{aid}/consultation", json=body).status_code == 201
    return aid, patient.get("/api/auth/me").json()["patient_id"]


# ---------- permission matrix ----------
DENIED = {
    "patient": ["/api/lab/orders", "/api/billing/invoices", "/api/admin/users", "/api/doctor/dashboard"],
    "doctor": ["/api/lab/orders", "/api/billing/invoices", "/api/billing/patients", "/api/admin/users", "/api/patients/me"],
    "lab": ["/api/billing/invoices", "/api/admin/users", "/api/appointments", "/api/patients/me", "/api/doctor/dashboard", "/api/doctor/patients/1/history"],
    "billing": ["/api/lab/orders", "/api/admin/users", "/api/appointments", "/api/patients/me/records", "/api/doctor/patients/1/history"],
    "admin": ["/api/lab/orders", "/api/billing/invoices", "/api/billing/prescriptions", "/api/patients/me", "/api/doctor/patients/1/history"],
}
EMAILS = {"patient": "pat1@example.com", "doctor": "doc1@example.com", "lab": "lab1@example.com", "billing": "billing@example.com", "admin": "admin@example.com"}


@pytest.mark.parametrize("role,path", [(r, p) for r, paths in DENIED.items() for p in paths])
def test_role_cannot_reach_other_workspaces(role, path):
    c = Client(app)
    assert c.post("/api/auth/login", json={"email": EMAILS[role], "password": PW}).status_code == 200
    assert c.get(path).status_code == 403


def test_me_lists_permissions(lab, billing):
    assert lab.get("/api/auth/me").json()["permissions"] == ["lab.orders"]
    assert "billing.invoices" in billing.get("/api/auth/me").json()["permissions"]


# ---------- laboratory ----------
def test_lab_workflow_and_result_release(patient, doctor, doctor2, lab, lab2, billing, admin):
    _consult(patient, doctor)
    lab_id = patient.get("/api/patients/me/labs").json()[0]["id"]

    assert [o["id"] for o in lab.get("/api/lab/orders?scope=queue").json()["items"]] == [lab_id]
    assert lab.post(f"/api/lab/orders/{lab_id}/verify").status_code == 404  # not claimed yet
    assert lab.post(f"/api/lab/orders/{lab_id}/claim").json()["assigned_to"] == "Lab One"
    assert lab2.post(f"/api/lab/orders/{lab_id}/claim").status_code == 409
    assert lab2.get(f"/api/lab/orders/{lab_id}").status_code == 404  # not their order

    assert lab.post(f"/api/lab/orders/{lab_id}/result", data={"summary": "x"}).status_code == 409  # sample first
    assert lab.post(f"/api/lab/orders/{lab_id}/status", json={"status": "collected"}).json()["status"] == "collected"
    bad = lab.post(f"/api/lab/orders/{lab_id}/result", data={"summary": "ok"}, files={"file": ("x.pdf", b"MZ\x90evil", "application/pdf")})
    assert bad.status_code == 415
    entered = lab.post(f"/api/lab/orders/{lab_id}/result", data={"summary": "Normal"}, files={"file": ("../../r.pdf", *PDF[1:])})
    assert entered.json()["status"] == "resulted" and entered.json()["file_name"] == "r.pdf"

    # unverified results are not released
    mine = patient.get("/api/patients/me/labs").json()[0]
    assert mine["status"] == "resulted" and mine["result_summary"] is None and not mine["has_file"]
    assert patient.get(f"/api/labs/{lab_id}/file").status_code == 404

    assert lab.post(f"/api/lab/orders/{lab_id}/verify").json()["status"] == "completed"
    assert patient.get("/api/patients/me/labs").json()[0]["result_summary"] == "Normal"
    assert patient.get(f"/api/labs/{lab_id}/file").content.startswith(b"%PDF")
    assert doctor.get("/api/doctor/labs?status=completed").json()[0]["result_summary"] == "Normal"
    for other in (doctor2, billing, admin, lab2):
        assert other.get(f"/api/labs/{lab_id}/file").status_code == 404

    # verified results change only through an amendment with a reason
    assert lab.post(f"/api/lab/orders/{lab_id}/result", data={"summary": "Changed"}).status_code == 409
    assert lab.post(f"/api/lab/orders/{lab_id}/amend", data={"summary": "Corrected"}).status_code == 422
    amended = lab.post(f"/api/lab/orders/{lab_id}/amend", data={"summary": "Corrected", "reason": "Transcription error"})
    assert amended.json()["amendment_reason"] == "Transcription error"
    actions = [a["action"] for a in admin.get("/api/admin/audit-logs").json()["items"]]
    assert {"lab.claim", "lab.result_entered", "lab.verify", "lab.amend"} <= set(actions)
    # notifications never carry the test name
    assert all("CBC" not in n["message"] for n in patient.get("/api/notifications").json()["items"])


# ---------- billing ----------
def test_billing_owns_invoices_and_finalised_records_are_locked(patient, doctor, billing, admin):
    _consult(patient, doctor)
    inv = billing.get("/api/billing/invoices").json()["items"][0]
    assert admin.patch(f"/api/admin/invoices/{inv['id']}", json={"status": "paid"}).status_code in (404, 405)
    paid = billing.post(f"/api/billing/invoices/{inv['id']}/pay", json={"method": "upi", "reference": "UPI-1"})
    assert paid.json()["status"] == "paid" and paid.json()["payment_method"] == "upi"
    assert billing.post(f"/api/billing/invoices/{inv['id']}/void", json={"reason": "duplicate"}).status_code == 409
    assert billing.post(f"/api/billing/invoices/{inv['id']}/pay", json={"method": "cash"}).status_code == 409
    assert patient.get("/api/patients/me/invoices").json()[0]["payment_method"] == "upi"

    pid = patient.get("/api/auth/me").json()["patient_id"]
    new = billing.post("/api/billing/invoices", json={"patient_id": pid, "description": "Dressing", "amount": "250.00"})
    assert new.status_code == 201
    assert billing.post("/api/billing/invoices", json={"patient_id": pid, "description": "Bad", "amount": "-1"}).status_code == 422


def test_insurance_claims(patient, doctor, billing):
    _consult(patient, doctor)
    pid = patient.get("/api/auth/me").json()["patient_id"]
    inv = billing.get("/api/billing/invoices").json()["items"][0]
    assert billing.post("/api/billing/claims", json={"invoice_id": inv["id"], "amount_claimed": "100"}).status_code == 409  # unverified
    assert billing.put(f"/api/billing/patients/{pid}/insurance", json={"status": "verified"}).status_code == 422
    ins = billing.put(f"/api/billing/patients/{pid}/insurance", json={"insurer": "Demo Ins", "policy_number": "P-1", "status": "verified"})
    assert ins.json()["patient_code"] == f"PT-{pid:06d}"
    assert patient.get("/api/patients/me").json()["insurance_status"] == "verified"

    too_much = str(float(inv["amount"]) + 1)
    assert billing.post("/api/billing/claims", json={"invoice_id": inv["id"], "amount_claimed": too_much}).status_code == 422
    claim = billing.post("/api/billing/claims", json={"invoice_id": inv["id"], "amount_claimed": "100"}).json()
    assert billing.post("/api/billing/claims", json={"invoice_id": inv["id"], "amount_claimed": "50"}).status_code == 409
    assert billing.patch(f"/api/billing/claims/{claim['id']}", json={"status": "settled"}).status_code == 409
    assert billing.patch(f"/api/billing/claims/{claim['id']}", json={"status": "approved"}).status_code == 422
    assert billing.patch(f"/api/billing/claims/{claim['id']}", json={"status": "approved", "amount_approved": "80"}).json()["status"] == "approved"
    assert billing.patch(f"/api/billing/claims/{claim['id']}", json={"status": "settled"}).json()["status"] == "settled"
    assert patient.get("/api/patients/me/claims").json()[0]["status"] == "settled"


def test_fulfilment_never_touches_clinical_content(patient, doctor, billing):
    _consult(patient, doctor)
    rx = billing.get("/api/billing/prescriptions").json()["items"][0]
    assert "assessment" not in rx and "chief_complaint" not in rx
    r = billing.patch(f"/api/billing/prescriptions/{rx['id']}/fulfilment", json={"status": "ready", "items": [], "notes": "x"})
    assert r.json()["fulfilment_status"] == "ready" and r.json()["items"][0]["medication"] == "Syrup X"
    assert billing.patch(f"/api/billing/prescriptions/{rx['id']}/fulfilment", json={"status": "pending"}).status_code == 409
    assert patient.get("/api/patients/me/prescriptions").json()[0]["fulfilment_status"] == "ready"


# ---------- doctor ----------
def test_doctor_amends_only_own_notes(patient, doctor, doctor2, admin):
    _consult(patient, doctor, follow_up_in_days=14)
    rec = patient.get("/api/patients/me/records").json()[0]
    assert rec["follow_up_date"] is not None
    body = {"notes": "Updated", "follow_up_date": rec["follow_up_date"], "reason": "Added detail"}
    assert doctor2.put(f"/api/doctor/records/{rec['id']}", json=body).status_code == 404
    assert doctor.put(f"/api/doctor/records/{rec['id']}", json={**body, "reason": ""}).status_code == 422
    assert doctor.put(f"/api/doctor/records/{rec['id']}", json=body).json()["amendment_reason"] == "Added detail"
    assert patient.put(f"/api/doctor/records/{rec['id']}", json=body).status_code == 403
    assert "record.amend" in [a["action"] for a in admin.get("/api/admin/audit-logs").json()["items"]]


def test_emergency_access_is_reasoned_audited_and_flagged(patient, doctor2, admin):
    pid = patient.get("/api/auth/me").json()["patient_id"]
    assert doctor2.get(f"/api/doctor/patients/{pid}/history").status_code == 404
    url = f"/api/doctor/patients/{pid}/emergency-access"
    assert doctor2.post(url, json={"reason": "need it"}).status_code == 422
    assert doctor2.post(url, json={"reason": "Unconscious in casualty, allergy check"}).status_code == 200
    assert "record.emergency_access" in [a["action"] for a in admin.get("/api/admin/audit-logs").json()["items"]]
    assert any(n["title"] == "Emergency record access" for n in admin.get("/api/notifications").json()["items"])


# ---------- administration ----------
def test_admin_manages_staff_without_clinical_or_financial_edits(admin, patient, doctor):
    r = admin.post("/api/admin/staff", json={"email": "newlab@example.com", "full_name": "New Lab", "role": "lab", "password": "Password123"})
    assert r.status_code == 201
    new = Client(app)
    assert new.post("/api/auth/login", json={"email": "newlab@example.com", "password": "Password123"}).json()["role"] == "lab"
    assert admin.patch(f"/api/admin/users/{r.json()['id']}/role", json={"role": "billing"}).json()["role"] == "billing"
    pat_user = patient.get("/api/auth/me").json()["id"]
    assert admin.patch(f"/api/admin/users/{pat_user}/role", json={"role": "admin"}).status_code == 409
    assert admin.post("/api/admin/staff", json={"email": "x@example.com", "full_name": "X", "role": "doctor", "password": "Password123"}).status_code == 422

    aid = _todays_appointment(patient)
    assert admin.get(f"/api/appointments/{aid}").json()["reason"] is None  # visit reason is clinical
    assert admin.patch(f"/api/appointments/{aid}/status", json={"status": "completed"}).status_code == 403
    assert admin.patch(f"/api/appointments/{aid}/status", json={"status": "cancelled"}).status_code == 200
    assert doctor_id(admin)  # catalogue stays readable
    actions = [a["action"] for a in admin.get("/api/admin/audit-logs").json()["items"]]
    assert {"staff.create", "user.role"} <= set(actions)
