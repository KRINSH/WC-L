"""add is_admin to users"""

from alembic import op
import sqlalchemy as sa


revision = "0003_add_is_admin_to_users"
down_revision = "0002_add_last_login_at_to_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()))

    # Bootstrap compatibility: keep the legacy `admin` user as admin after migration.
    op.execute("UPDATE users SET is_admin = 1 WHERE username = 'admin'")

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("is_admin", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("is_admin")

