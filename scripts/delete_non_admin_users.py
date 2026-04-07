"""Удалить из БД всех пользователей, кроме основного админа (см. ADMIN_USERNAME / get_settings)."""

from __future__ import annotations

import argparse

from sqlalchemy import delete, select

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.user import User


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Удалить всех, кроме пользователя с именем ADMIN_USERNAME (по умолчанию admin)"
    )
    p.add_argument(
        "--yes",
        action="store_true",
        help="Выполнить удаление (без флага только показать, кого удалят)",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    settings = get_settings()
    keep_name = settings.admin_username

    with SessionLocal() as db:
        keeper = db.scalar(select(User).where(User.username == keep_name))
        if keeper is None:
            raise SystemExit(
                f"Пользователь с username={keep_name!r} не найден. Создайте админа: python scripts/create_admin.py --email ..."
            )

        all_users = list(db.scalars(select(User)).all())
        to_delete = [u for u in all_users if u.id != keeper.id]

        print(f"Остаётся только админ: id={keeper.id}  {keeper.username!r}  {keeper.email!r}\n")
        print("Будут удалены:")
        for u in to_delete:
            print(f"  id={u.id}  {u.username!r}  {u.email!r}  is_admin={u.is_admin}")

        if not to_delete:
            print("Нечего удалять.")
            return

        if not args.yes:
            print("\nДобавьте --yes для фактического удаления.")
            return

        db.execute(delete(User).where(User.id != keeper.id))
        db.commit()
        print(f"\nУдалено записей: {len(to_delete)}")


if __name__ == "__main__":
    main()
