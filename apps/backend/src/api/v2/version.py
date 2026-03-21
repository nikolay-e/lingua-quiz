from core.database import query_words_db
from core.dependencies import CurrentUser
from core.error_handler import handle_api_errors
from core.logging import get_logger
from core.rate_limit import limiter
from fastapi import APIRouter, HTTPException, Request, status
from generated.schemas import ContentVersionResponse

logger = get_logger(__name__)
router = APIRouter(prefix="/api", tags=["Content Version"])


@router.get("/content-version")
@limiter.limit("100/minute")
@handle_api_errors("Get content version")
def get_active_content_version(request: Request, current_user: CurrentUser) -> ContentVersionResponse:
    version = query_words_db(
        "SELECT id as version_id, version_name, is_active FROM content_versions WHERE is_active = TRUE LIMIT 1",
        one=True,
    )

    if not version:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No active content version found",
        )

    return ContentVersionResponse.model_validate(dict(version))
