from typing import Annotated

from core.database import get_active_version
from core.security import get_current_user, require_admin
from fastapi import Depends

CurrentUser = Annotated[dict, Depends(get_current_user)]
CurrentAdmin = Annotated[dict, Depends(require_admin)]
ActiveVersion = Annotated[int, Depends(get_active_version)]
