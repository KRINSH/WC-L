"""replace status with is_banned"""

from alembic import op
import sqlalchemy as sa


revision = "0004_replace_status_with_is_banned"
down_revision = "0003_add_is_admin_to_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("is_banned", sa.Boolean(), nullable=False, server_default=sa.false()))

    op.execute("UPDATE users SET is_banned = 1 WHERE status = 'banned'")

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("status")
        batch_op.drop_column("last_login_at")
        batch_op.alter_column("is_banned", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("status", sa.String(length=16), nullable=False, server_default=sa.text("'active'")))
        batch_op.add_column(sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))

    op.execute("UPDATE users SET status = 'banned' WHERE is_banned = 1")
    op.execute("UPDATE users SET status = 'active' WHERE is_banned = 0")

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("is_banned")
        batch_op.alter_column("status", server_default=None)

