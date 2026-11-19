import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import TokenResponse, UserRegister, UserResponse

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
ALGORITHM = "HS256"
DEFAULT_TOKEN_MINUTES = 30


def _jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY", "")
    if len(secret) < 32:
        raise HTTPException(status_code=503, detail="Authentication is not configured on this server.")
    return secret


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired login. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except HTTPException:
        raise
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise unauthorized
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise unauthorized
    return user


def _issue_token(user: User) -> TokenResponse:
    minutes = max(1, int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", DEFAULT_TOKEN_MINUTES)))
    expires = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    token = jwt.encode({"sub": str(user.id), "exp": expires}, _jwt_secret(), algorithm=ALGORITHM)
    return TokenResponse(access_token=token, expires_in=minutes * 60, user=user)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    _jwt_secret()
    email = str(user_data.email).strip().lower()
    existing = db.query(User).filter(User.email.ilike(email)).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account already exists for this email. Sign in or contact support to activate it.")
    user = User(
        email=email,
        username=user_data.username.strip(),
        password_hash=password_hash.hash(user_data.password),
        role="admin" if email in {item.strip().lower() for item in os.getenv("ADMIN_EMAILS", "").split(",") if item.strip()} else "citizen",
        points=0,
        level="Beginner",
        created_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_token(user)


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email.ilike(form.username.strip())).first()
    if user is None or not user.password_hash or not password_hash.verify(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.", headers={"WWW-Authenticate": "Bearer"})
    return _issue_token(user)


@router.get("/me", response_model=UserResponse)
def read_current_user(user: User = Depends(get_current_user)):
    return user
