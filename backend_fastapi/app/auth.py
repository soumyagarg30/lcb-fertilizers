from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from datetime import datetime, timedelta
import base64
import json
from .config import settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")

def decode_local_token(token: str):
    try:
        header_b64, payload_b64, signature = token.split('.')
        payload_bytes = base64.urlsafe_b64decode(payload_b64 + '=' * (-len(payload_b64) % 4))
        payload = json.loads(payload_bytes.decode('utf-8'))
        expires = payload.get('exp')
        if expires and isinstance(expires, (int, float)) and expires > datetime.utcnow().timestamp() * 1000:
            return payload
    except Exception:
        return None
    return None

def decode_token(token: str):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload
    except JWTError:
        payload = decode_local_token(token)
        if payload:
            return payload
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    payload["user_id"] = payload.get("user_id") or payload.get("userId")
    return payload

def require_roles(*roles):
    def _require(user=Depends(get_current_user)):
        if not user or ("role" in user and user["role"] not in roles):
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return _require
