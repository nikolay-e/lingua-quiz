from dataclasses import dataclass


@dataclass
class VocabularyEntry:
    id: str
    source_text: str
    target_text: str
    source_language: str
    target_language: str
    list_name: str
    source_usage_example: str = ""
    target_usage_example: str = ""
    difficulty_level: str | None = None
    is_active: bool = True

    @classmethod
    def from_api_dict(cls, data: dict) -> "VocabularyEntry":
        return cls(
            id=data.get("id", ""),
            source_text=data.get("sourceText", ""),
            target_text=data.get("targetText", ""),
            source_language=data.get("sourceLanguage", ""),
            target_language=data.get("targetLanguage", ""),
            list_name=data.get("listName", ""),
            source_usage_example=data.get("sourceUsageExample", "") or "",
            target_usage_example=data.get("targetUsageExample", "") or "",
            difficulty_level=data.get("difficultyLevel"),
            is_active=data.get("isActive", True),
        )

    @classmethod
    def from_db_row(cls, row: dict) -> "VocabularyEntry":
        return cls(
            id=str(row["id"]),
            source_text=row["source_text"],
            target_text=row["target_text"],
            source_language=row["source_language"],
            target_language=row["target_language"],
            list_name=row["list_name"],
            source_usage_example=row["source_usage_example"] or "",
            target_usage_example=row["target_usage_example"] or "",
            difficulty_level=row["difficulty_level"],
            is_active=row["is_active"],
        )

    def to_api_dict(self) -> dict:
        return {
            "id": self.id,
            "sourceText": self.source_text,
            "targetText": self.target_text,
            "sourceLanguage": self.source_language,
            "targetLanguage": self.target_language,
            "listName": self.list_name,
            "difficultyLevel": self.difficulty_level,
            "sourceUsageExample": self.source_usage_example,
            "targetUsageExample": self.target_usage_example,
            "isActive": self.is_active,
        }

    def to_db_dict(self) -> dict:
        return {
            "id": self.id,
            "source_text": self.source_text,
            "target_text": self.target_text,
            "source_language": self.source_language,
            "target_language": self.target_language,
            "list_name": self.list_name,
            "difficulty_level": self.difficulty_level,
            "source_usage_example": self.source_usage_example,
            "target_usage_example": self.target_usage_example,
            "is_active": self.is_active,
        }


__all__ = ["VocabularyEntry"]
