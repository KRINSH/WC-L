"""add last_login_at to users"""

from alembic import op
import sqlalchemy as sa


revision = "0002_add_last_login_at_to_users"
down_revision = "0001_initial_user_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("last_login_at")

