import logging
from typing import TYPE_CHECKING

from core.auth_helpers import build_access_token, create_and_store_refresh_token, revoke_refresh_token
from core.config import RATE_LIMIT_ENABLED
from core.database import execute_write_transaction, query_db
from core.error_handler import handle_api_errors
from core.schema_loader import load_schemas
from core.security import get_current_user, hash_password, verify_password, verify_refresh_token
from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

if TYPE_CHECKING:
    from generated.schemas import RefreshTokenRequest, TokenResponse, UserLogin, UserRegistration, UserResponse

RefreshTokenRequest, TokenResponse, UserLogin, UserRegistration, UserResponse = load_schemas(
    "RefreshTokenRequest", "TokenResponse", "UserLogin", "UserRegistration", "UserResponse"
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address, enabled=RATE_LIMIT_ENABLED)


def get_username_for_rate_limit(request: Request) -> str:
    try:
        if hasattr(request.state, "username"):
            return f"login:{request.state.username}"
        return f"ip:{get_remote_address(request)}"
    except Exception as e:
        logger.debug(f"Failed to get username for rate limit: {e}")
        return f"ip:{get_remote_address(request)}"


login_limiter = Limiter(key_func=get_username_for_rate_limit, enabled=RATE_LIMIT_ENABLED)


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("3/minute;10/hour")
@handle_api_errors("Registration")
def register_user(request: Request, user_data: UserRegistration) -> TokenResponse:
    logger.info(f"Starting registration for user: {user_data.username}")

    existing_user = query_db("SELECT id FROM users WHERE username = %s", (user_data.username,), one=True)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )

    hashed_password = hash_password(user_data.password)
    result = execute_write_transaction(
        "INSERT INTO users (username, password) VALUES (%s, %s) RETURNING id, is_admin",
        (user_data.username, hashed_password),
        fetch_results=True,
        one=True,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user",
        )

    user_id = result["id"]
    is_admin = result.get("is_admin", False)
    logger.info(f"Successfully created user {user_data.username} with id {user_id}")

    token = build_access_token(user_id, user_data.username, is_admin)
    refresh_token = create_and_store_refresh_token(user_id)

    return TokenResponse(
        token=token,
        refresh_token=refresh_token,
        expires_in="15m",
        user=UserResponse(id=user_id, username=user_data.username, is_admin=is_admin),
    )


@router.post("/login", response_model=TokenResponse)
@login_limiter.limit("5/minute;10/hour")
@handle_api_errors("Login")
def login_user(request: Request, user_data: UserLogin) -> TokenResponse:
    request.state.username = user_data.username
    logger.info(f"Login attempt for user: {user_data.username}")
    user = query_db(
        "SELECT id, username, password, is_admin FROM users WHERE username = %s",
        (user_data.username,),
        one=True,
    )

    if not user or not verify_password(user_data.password, user["password"]):
        logger.warning(f"Invalid login attempt for user: {user_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    is_admin = user.get("is_admin", False)
    token = build_access_token(user["id"], user["username"], is_admin)
    refresh_token = create_and_store_refresh_token(user["id"])

    logger.info(f"Successful login for user: {user_data.username}")

    return TokenResponse(
        token=token,
        refresh_token=refresh_token,
        expires_in="15m",
        user=UserResponse(id=user["id"], username=user["username"], is_admin=is_admin),
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("100/15minutes")
@handle_api_errors("Token refresh")
def refresh_access_token(request: Request, refresh_request: RefreshTokenRequest) -> TokenResponse:
    logger.info("Access token refresh attempt")
    user_data = verify_refresh_token(refresh_request.refresh_token)

    user = query_db(
        "SELECT id, username, is_admin FROM users WHERE id = %s",
        (user_data["user_id"],),
        one=True,
    )

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    is_admin = user.get("is_admin", False)
    new_access_token = build_access_token(user["id"], user["username"], is_admin)

    revoke_refresh_token(refresh_request.refresh_token)
    new_refresh_token = create_and_store_refresh_token(user["id"])

    logger.info(f"Access token refreshed for user: {user['username']}")

    return TokenResponse(
        token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in="15m",
        user=UserResponse(id=user["id"], username=user["username"], is_admin=is_admin),
    )


@router.delete("/delete-account")
@handle_api_errors("Account deletion")
def delete_account(
    current_user: dict = Depends(get_current_user),
) -> dict[str, str]:
    logger.info(f"Account deletion request for user: {current_user['username']}")
    result = execute_write_transaction("DELETE FROM users WHERE id = %s", (current_user["user_id"],))

    if result == 0:
        logger.warning(f"Account deletion failed - user not found: {current_user['username']}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    logger.info(f"Account successfully deleted for user: {current_user['username']}")
    return {"message": "Account deleted successfully"}
