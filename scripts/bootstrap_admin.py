"""Create or promote the first RoadScan administrator using local backend access."""

from datetime import datetime, timezone
from getpass import getpass

from sqlalchemy import func

from database import SessionLocal
from models import User
from routers.auth import password_hash


def main() -> None:
    email = input("Administrator email: ").strip().lower()
    username = input("Display name: ").strip()
    password = getpass("New password (minimum 8 characters): ")
    confirmation = getpass("Confirm password: ")
    if len(password) < 8:
        raise SystemExit("Password must be at least 8 characters.")
    if password != confirmation:
        raise SystemExit("Passwords did not match.")

    db = SessionLocal()
    try:
        user = db.query(User).filter(func.lower(User.email) == email).first()
        if user is None:
            user = User(email=email, username=username, points=0, level="Beginner", created_at=datetime.now(timezone.utc))
            db.add(user)
        user.username = username
        user.password_hash = password_hash.hash(password)
        user.role = "admin"
        db.commit()
        print("Administrator account is ready. Sign in at http://localhost:3000/account.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
