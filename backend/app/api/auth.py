from fastapi import APIRouter,HTTPException,status
from app.core.security import create_access_token
from app.config import settings
from app.schemas.auth import LoginRequest, TokenResponse


router = APIRouter()

@router.post("/login",response_model=TokenResponse,summary="Obtain a JWT access token")
def login(body:LoginRequest)->TokenResponse:
    """
    Authenticates with hardcoded admin credentials (demo).
    In production: look up user in DB, verify bcrypt hash.
    """
    username_match = body.username == settings.admin_username
    password_match = body.password == settings.admin_password

    if not (username_match and password_match):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    token = create_access_token(subject=body.username)
    return TokenResponse(access_token=token)