"""Migrations must keep existing rows, including child rows of rebuilt SQLite tables."""

import os
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]


def _alembic(url: str, *args: str) -> None:
    env = {**os.environ, "HCPP_DATABASE_URL": url}
    subprocess.run([sys.executable, "-m", "alembic", *args], cwd=BACKEND, env=env, check=True, capture_output=True)


def test_upgrade_preserves_existing_records():
    path = os.path.join(tempfile.mkdtemp(), "mig.db")
    url = f"sqlite:///{path}"
    _alembic(url, "upgrade", "2dacebefede2")
    c = sqlite3.connect(path)
    c.executescript(
        """
        INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at)
          VALUES (1,'d@example.com','x','Doc','doctor',1,'2026-01-01'), (2,'p@example.com','x','Pat','patient',1,'2026-01-01');
        INSERT INTO doctors (id, user_id, specialty, qualifications, registration_number, experience_years, consultation_fee, is_approved)
          VALUES (1,1,'GP','MBBS','R1',1,500,1);
        INSERT INTO patients (id, user_id) VALUES (1,2);
        INSERT INTO prescriptions (id, patient_id, doctor_id, created_at) VALUES (1,1,1,'2026-01-01');
        INSERT INTO prescription_items (id, prescription_id, medication, dosage, frequency, duration_days) VALUES (1,1,'A','1','OD',3),(2,1,'B','1','OD',3);
        INSERT INTO lab_reports (id, patient_id, doctor_id, test_name, status, requested_at) VALUES (1,1,1,'CBC','completed','2026-01-01');
        INSERT INTO invoices (id, patient_id, description, amount, status, issued_at) VALUES (1,1,'Visit',500,'paid','2026-01-01');
        """
    )
    c.commit()
    c.close()

    _alembic(url, "upgrade", "head")
    c = sqlite3.connect(path)
    count = lambda t: c.execute(f"SELECT count(*) FROM {t}").fetchone()[0]  # noqa: E731
    assert count("prescription_items") == 2
    assert count("prescriptions") == count("lab_reports") == count("invoices") == count("patients") == 1
    assert c.execute("SELECT fulfilment_status FROM prescriptions").fetchone()[0] == "pending"
    assert c.execute("SELECT status FROM lab_reports").fetchone()[0] == "completed"
    assert c.execute("SELECT insurance_status FROM patients").fetchone()[0] == "unverified"
    c.close()

    _alembic(url, "downgrade", "2dacebefede2")
    c = sqlite3.connect(path)
    assert c.execute("SELECT count(*) FROM prescription_items").fetchone()[0] == 2
