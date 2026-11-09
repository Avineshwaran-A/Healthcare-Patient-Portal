"""Role -> permission map. The single source of truth for what each role may do.

Endpoints depend on a *permission* (via `deps.require_perm`), never on a role
name, so a role's scope can be read and reviewed in one place. Ownership and
assignment checks (own records, treated patients, assigned lab orders) are
applied on top of these in the services.
"""

import enum

from app.models import Role


class Perm(str, enum.Enum):
    # patient self-service
    own_profile = "own.profile"
    own_appointments = "own.appointments"
    own_records = "own.records"
    own_billing = "own.billing"
    # clinical (doctor)
    clinical_schedule = "clinical.schedule"
    clinical_records_read = "clinical.records.read"  # treated patients only
    clinical_records_write = "clinical.records.write"  # own notes, prescriptions, lab requests
    clinical_emergency_access = "clinical.emergency_access"
    # laboratory
    lab_orders = "lab.orders"  # queue, claim, status, results, verify, amend (assigned only)
    # billing / insurance / fulfilment
    billing_invoices = "billing.invoices"
    billing_insurance = "billing.insurance"
    billing_fulfilment = "billing.fulfilment"
    # administration
    admin_users = "admin.users"
    admin_config = "admin.config"  # departments, doctor settings, schedules
    admin_operations = "admin.operations"  # appointment oversight (no clinical detail)
    admin_reports = "admin.reports"
    admin_audit = "admin.audit"


P = Perm
ROLE_PERMISSIONS: dict[Role, frozenset[Perm]] = {
    Role.patient: frozenset({P.own_profile, P.own_appointments, P.own_records, P.own_billing}),
    Role.doctor: frozenset(
        {P.clinical_schedule, P.clinical_records_read, P.clinical_records_write, P.clinical_emergency_access}
    ),
    Role.lab: frozenset({P.lab_orders}),
    Role.billing: frozenset({P.billing_invoices, P.billing_insurance, P.billing_fulfilment}),
    # Administration does not include clinical or financial editing.
    Role.admin: frozenset({P.admin_users, P.admin_config, P.admin_operations, P.admin_reports, P.admin_audit}),
}

# Roles an administrator may assign to staff accounts. Patients self-register;
# doctors register with credentials and are approved.
STAFF_ROLES = (Role.lab, Role.billing, Role.admin)


def has(role: Role, perm: Perm) -> bool:
    return perm in ROLE_PERMISSIONS.get(role, frozenset())
