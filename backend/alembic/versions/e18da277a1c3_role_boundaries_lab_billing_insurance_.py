"""role boundaries: lab, billing, insurance, fulfilment

Revision ID: e18da277a1c3
Revises: 2dacebefede2
Create Date: 2026-11-09 19:29:07.564222

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e18da277a1c3'
down_revision: Union[str, Sequence[str], None] = '2dacebefede2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Additive only: new nullable columns (or columns with server defaults) and one new
# table, so existing rows keep their meaning. Role and status columns are
# VARCHAR-backed enums, so the new values (lab, billing, collected, ...) need no
# type change. Existing "completed" lab reports stay completed (verified).


def upgrade() -> None:
    with op.batch_alter_table("patients") as b:
        b.add_column(sa.Column("insurer", sa.String(120), nullable=True))
        b.add_column(sa.Column("policy_number", sa.String(60), nullable=True))
        b.add_column(sa.Column("insurance_status", sa.String(20), nullable=False, server_default="unverified"))

    with op.batch_alter_table("medical_records") as b:
        b.add_column(sa.Column("follow_up_date", sa.Date(), nullable=True))
        b.add_column(sa.Column("amended_at", sa.DateTime(), nullable=True))
        b.add_column(sa.Column("amendment_reason", sa.String(300), nullable=True))

    with op.batch_alter_table("prescriptions") as b:
        b.add_column(sa.Column("fulfilment_status", sa.String(20), nullable=False, server_default="pending"))
        b.add_column(sa.Column("fulfilment_note", sa.String(300), nullable=True))
        b.add_column(sa.Column("fulfilment_updated_at", sa.DateTime(), nullable=True))
        b.add_column(sa.Column("fulfilment_by_id", sa.Integer(), nullable=True))
        b.create_foreign_key("fk_rx_fulfilment_by", "users", ["fulfilment_by_id"], ["id"], ondelete="SET NULL")
        b.create_index("ix_prescriptions_fulfilment_status", ["fulfilment_status"])

    with op.batch_alter_table("lab_reports") as b:
        b.add_column(sa.Column("assigned_to_id", sa.Integer(), nullable=True))
        b.add_column(sa.Column("resulted_by_id", sa.Integer(), nullable=True))
        b.add_column(sa.Column("verified_by_id", sa.Integer(), nullable=True))
        b.add_column(sa.Column("collected_at", sa.DateTime(), nullable=True))
        b.add_column(sa.Column("amended_at", sa.DateTime(), nullable=True))
        b.add_column(sa.Column("amendment_reason", sa.String(300), nullable=True))
        b.create_foreign_key("fk_lab_assigned_to", "users", ["assigned_to_id"], ["id"], ondelete="SET NULL")
        b.create_foreign_key("fk_lab_resulted_by", "users", ["resulted_by_id"], ["id"], ondelete="SET NULL")
        b.create_foreign_key("fk_lab_verified_by", "users", ["verified_by_id"], ["id"], ondelete="SET NULL")
        b.create_index("ix_lab_reports_assigned_to_id", ["assigned_to_id"])
        b.create_index("ix_lab_reports_status", ["status"])

    with op.batch_alter_table("invoices") as b:
        b.add_column(sa.Column("payment_method", sa.String(20), nullable=True))
        b.add_column(sa.Column("payment_reference", sa.String(80), nullable=True))
        b.add_column(sa.Column("finalized_by_id", sa.Integer(), nullable=True))
        b.add_column(sa.Column("note", sa.String(300), nullable=True))
        b.create_foreign_key("fk_invoice_finalized_by", "users", ["finalized_by_id"], ["id"], ondelete="SET NULL")

    op.create_table(
        "insurance_claims",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("insurer", sa.String(120), nullable=False),
        sa.Column("policy_number", sa.String(60), nullable=False),
        sa.Column("amount_claimed", sa.Numeric(10, 2), nullable=False),
        sa.Column("amount_approved", sa.Numeric(10, 2), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("note", sa.String(300), nullable=True),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("amount_claimed > 0", name="ck_claim_amount_pos"),
        sa.CheckConstraint("amount_approved IS NULL OR amount_approved >= 0", name="ck_claim_approved_nonneg"),
    )
    op.create_index("ix_insurance_claims_invoice_id", "insurance_claims", ["invoice_id"])
    op.create_index("ix_insurance_claims_patient_id", "insurance_claims", ["patient_id"])
    op.create_index("ix_insurance_claims_status", "insurance_claims", ["status"])


def downgrade() -> None:
    op.drop_table("insurance_claims")
    with op.batch_alter_table("invoices") as b:
        b.drop_constraint("fk_invoice_finalized_by", type_="foreignkey")
        for c in ("note", "finalized_by_id", "payment_reference", "payment_method"):
            b.drop_column(c)
    with op.batch_alter_table("lab_reports") as b:
        b.drop_index("ix_lab_reports_status")
        b.drop_index("ix_lab_reports_assigned_to_id")
        for fk in ("fk_lab_verified_by", "fk_lab_resulted_by", "fk_lab_assigned_to"):
            b.drop_constraint(fk, type_="foreignkey")
        for c in ("amendment_reason", "amended_at", "collected_at", "verified_by_id", "resulted_by_id", "assigned_to_id"):
            b.drop_column(c)
    with op.batch_alter_table("prescriptions") as b:
        b.drop_index("ix_prescriptions_fulfilment_status")
        b.drop_constraint("fk_rx_fulfilment_by", type_="foreignkey")
        for c in ("fulfilment_by_id", "fulfilment_updated_at", "fulfilment_note", "fulfilment_status"):
            b.drop_column(c)
    with op.batch_alter_table("medical_records") as b:
        for c in ("amendment_reason", "amended_at", "follow_up_date"):
            b.drop_column(c)
    with op.batch_alter_table("patients") as b:
        for c in ("insurance_status", "policy_number", "insurer"):
            b.drop_column(c)
