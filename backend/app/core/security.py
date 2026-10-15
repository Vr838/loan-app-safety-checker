"""Security dependencies for protecting administrative endpoints."""

import secrets
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.config import settings

security_bearer = HTTPBearer(auto_error=False)


async def verify_admin_token(
    credentials: HTTPAuthorizationCredentials = Security(security_bearer),
) -> bool:
    """Verifies that the provided Bearer token matches the configured ADMIN_API_TOKEN.

    Uses secrets.compare_digest to prevent timing attacks.
    Raises HTTPException(401) on missing or invalid tokens.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing administrative authorization token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Constant time comparison
    is_valid = secrets.compare_digest(
        credentials.credentials.strip(),
        settings.ADMIN_API_TOKEN.strip(),
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrative authorization token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return True
