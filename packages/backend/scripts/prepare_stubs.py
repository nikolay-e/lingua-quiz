#!/usr/bin/env python3
from pathlib import Path

STUB = """from pydantic import BaseModel
from typing import Any

class BulkProgressUpdateRequest(BaseModel): pass
class ContentVersionResponse(BaseModel): pass
class HealthResponse(BaseModel): pass
class ProgressUpdateRequest(BaseModel): pass
class RefreshTokenRequest(BaseModel): pass
class TokenResponse(BaseModel):
    token: str = ""
    refresh_token: str = ""
    expires_in: str = ""
    user: Any = None
class TTSLanguagesResponse(BaseModel): pass
class TTSRequest(BaseModel): pass
class TTSResponse(BaseModel): pass
class UserLogin(BaseModel): pass
class UserProgressResponse(BaseModel): pass
class UserRegistration(BaseModel): pass
class UserResponse(BaseModel): pass
class VersionResponse(BaseModel): pass
class VocabularyItemCreate(BaseModel): pass
class VocabularyItemDetailResponse(BaseModel): pass
class VocabularyItemResponse(BaseModel): pass
class VocabularyItemUpdate(BaseModel): pass
class WordListResponse(BaseModel): pass
"""

repo = Path(__file__).resolve().parents[3]
gen_dir = repo / "packages/backend/src/generated"
gen_dir.mkdir(exist_ok=True)
(gen_dir / "__init__.py").write_text("")
(gen_dir / "schemas.py").write_text(STUB)
