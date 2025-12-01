import logging

from core.database import query_db
from core.error_handler import handle_api_errors
from core.security import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Request, status
from schemas.version import ContentVersionResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from utils import convert_keys_to_camel_case

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Content Version"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/content-version", response_model=ContentVersionResponse)
@limiter.limit("100/minute")
@handle_api_errors("Get content version")
async def get_active_content_version(request: Request, current_user: dict = Depends(get_current_user)) -> ContentVersionResponse:
    version = query_db(
        "SELECT id as version_id, version_name, is_active FROM content_versions WHERE is_active = TRUE LIMIT 1",
        one=True,
    )

    if not version:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No active content version found",
        )

    return convert_keys_to_camel_case(dict(version))
