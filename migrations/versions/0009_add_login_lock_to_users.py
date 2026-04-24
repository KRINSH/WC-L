"""add login lock field to users"""

from alembic import op
import sqlalchemy as sa


revision = "0009_add_login_lock_to_users"
down_revision = "0008_add_password_reset_tokens_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("login_locked_until", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "login_locked_until")

