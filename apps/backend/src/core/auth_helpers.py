import hashlib

from core.database import execute_write_transaction
from core.security import create_access_token, create_refresh_token


def create_and_store_refresh_token(user_id: int) -> str:
    refresh_token, token_hash, expires_at = create_refresh_token()
    execute_write_transaction(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
        (user_id, token_hash, expires_at),
    )
    result: str = refresh_token
    return result


def build_access_token(user_id: int, username: str, is_admin: bool = False) -> str:
    result: str = create_access_token(
        data={
            "userId": user_id,
            "sub": username,
            "isAdmin": is_admin,
        }
    )
    return result


def revoke_refresh_token(refresh_token_value: str) -> None:
    token_hash = hashlib.sha256(refresh_token_value.encode()).hexdigest()
    execute_write_transaction(
        "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = %s",
        (token_hash,),
    )
