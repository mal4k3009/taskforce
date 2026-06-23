import os
import uuid
import time
import logging
from typing import Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, field_validator
from jose import jwt, JWTError, ExpiredSignatureError
from jose.constants import ALGORITHMS
import httpx
from eth_account.messages import encode_defunct
from eth_account import Account

from database import AsyncSessionLocal
from models import User as UserModel
from sqlalchemy import select

logger = logging.getLogger(__name__)

# --- Config ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
JWT_ALGORITHM = "RS256"
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

security = HTTPBearer()

router = APIRouter(prefix="/api/auth", tags=["auth"])

# --- In-memory nonce store for wallet verification ---
_nonce_store: dict = {}

# --- Pydantic schemas ---

class RegisterRequest(BaseModel):
    email: str
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class ConnectWalletRequest(BaseModel):
    wallet_address: str
    signature: str
    nonce: str


class UserResponse(BaseModel):
    user_id: str
    email: str
    wallet_address: Optional[str] = None
    full_name: Optional[str] = None
    bio: Optional[str] = None

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str


async def _verify_supabase_jwt(token: str) -> Optional[dict]:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_ANON_KEY,
                }
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid token")
            data = resp.json()
            return {"sub": data["id"], "email": data["email"]}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.error(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Token verification failed")


# --- FastAPI Dependency ---

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserModel:
    token = credentials.credentials
    payload = await _verify_supabase_jwt(token)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    email = payload.get("email") or f"{sub}@taskforce.local"

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(UserModel).where(UserModel.user_id == sub)
        )
        user = result.scalar_one_or_none()
        if not user:
            user = UserModel(
                user_id=sub,
                email=email,
                password_hash="supabase_managed",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
        return user


# --- Auth Endpoints ---

@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    supabase_url = f"{SUPABASE_URL}/auth/v1/signup"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                supabase_url,
                json={"email": body.email, "password": body.password},
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                },
            )
            data = resp.json()
            if resp.status_code not in (200, 201):
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=data.get("msg", data.get("error_description", "Registration failed")),
                )

            supabase_user = data.get("user", data.get("id", {}))
            user_id = supabase_user.get("id") if isinstance(supabase_user, dict) else data.get("id", "")
            email = body.email
            access_token = data.get("access_token", "")

            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(UserModel).where(UserModel.user_id == user_id)
                )
                user = result.scalar_one_or_none()
                if not user:
                    user = UserModel(
                        user_id=user_id,
                        email=email,
                        password_hash="supabase_managed",
                    )
                    session.add(user)
                    await session.commit()
                    await session.refresh(user)

            return AuthResponse(
                user=UserResponse(
                    user_id=user.user_id, 
                    email=user.email, 
                    wallet_address=user.wallet_address,
                    full_name=user.full_name,
                    bio=user.bio
                ),
                access_token=access_token,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration service unavailable")


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    supabase_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                supabase_url,
                json={"email": body.email, "password": body.password},
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                },
            )
            data = resp.json()
            if resp.status_code != 200:
                detail = data.get("error_description") or data.get("msg") or data.get("error", "Login failed")
                raise HTTPException(status_code=resp.status_code, detail=detail)

            user_id = data["user"]["id"]
            email = data["user"]["email"]
            access_token = data["access_token"]

            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(UserModel).where(UserModel.user_id == user_id)
                )
                user = result.scalar_one_or_none()
                if not user:
                    user = UserModel(
                        user_id=user_id,
                        email=email,
                        password_hash="supabase_managed",
                    )
                    session.add(user)
                    await session.commit()
                    await session.refresh(user)

            return AuthResponse(
                user=UserResponse(
                    user_id=user.user_id, 
                    email=user.email, 
                    wallet_address=user.wallet_address,
                    full_name=user.full_name,
                    bio=user.bio
                ),
                access_token=access_token,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login service unavailable")


@router.get("/nonce")
async def get_nonce(current_user: UserModel = Depends(get_current_user)):
    nonce = str(uuid.uuid4())
    _nonce_store[current_user.user_id] = {"nonce": nonce, "expires": time.time() + 300}
    return {"nonce": nonce}


@router.post("/connect-wallet")
async def connect_wallet(
    body: ConnectWalletRequest,
    current_user: UserModel = Depends(get_current_user),
):
    stored = _nonce_store.get(current_user.user_id)
    if not stored or stored["nonce"] != body.nonce:
        raise HTTPException(status_code=400, detail="Invalid or expired nonce")
    if time.time() > stored["expires"]:
        raise HTTPException(status_code=400, detail="Nonce expired")

    try:
        message = encode_defunct(text=body.nonce)
        recovered = Account.recover_message(message, signature=body.signature)
        if recovered.lower() != body.wallet_address.lower():
            raise HTTPException(status_code=400, detail="Signature does not match wallet address")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Signature verification failed: {str(e)}")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(UserModel).where(UserModel.user_id == current_user.user_id)
        )
        user = result.scalar_one_or_none()
        if user:
            user.wallet_address = body.wallet_address
            await session.commit()

    _nonce_store.pop(current_user.user_id, None)

    return {"status": "connected", "wallet_address": body.wallet_address}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserModel = Depends(get_current_user)):
    return UserResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        wallet_address=current_user.wallet_address,
        full_name=current_user.full_name,
        bio=current_user.bio
    )

@router.put("/me", response_model=UserResponse)
async def update_profile(
    body: ProfileUpdateRequest,
    current_user: UserModel = Depends(get_current_user)
):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(UserModel).where(UserModel.user_id == current_user.user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if body.full_name is not None:
            user.full_name = body.full_name
        if body.bio is not None:
            user.bio = body.bio
            
        await session.commit()
        await session.refresh(user)
        
        return UserResponse(
            user_id=user.user_id,
            email=user.email,
            wallet_address=user.wallet_address,
            full_name=user.full_name,
            bio=user.bio
        )
