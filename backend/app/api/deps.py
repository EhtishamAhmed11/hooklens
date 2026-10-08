from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import decode_access_token
from app.config import settings


security = HTTPBearer()

def get_current_user(
    credentials:HTTPAuthorizationCredentials=Depends(security),
)->str:
    """
    Dependency that validates the Bearer JWT and returns the subject (username).
    Inject this into any route that requires authentication.
    """
    return decode_access_token(credentials.credentials)

__all__ = ["get_db", "get_current_user"]