class VocabularyError(Exception):
    pass


class VocabularyFetchError(VocabularyError):
    def __init__(self, list_name: str, cause: Exception | None = None):
        self.list_name = list_name
        self.cause = cause
        message = f"Failed to fetch vocabulary for list '{list_name}'"
        if cause:
            message += f": {cause}"
        super().__init__(message)


class VocabularyUpdateError(VocabularyError):
    def __init__(self, item_id: str, cause: Exception | None = None):
        self.item_id = item_id
        self.cause = cause
        message = f"Failed to update vocabulary item '{item_id}'"
        if cause:
            message += f": {cause}"
        super().__init__(message)


class VocabularyCreateError(VocabularyError):
    def __init__(self, source_text: str, cause: Exception | None = None):
        self.source_text = source_text
        self.cause = cause
        message = f"Failed to create vocabulary item '{source_text}'"
        if cause:
            message += f": {cause}"
        super().__init__(message)


class VocabularyDeleteError(VocabularyError):
    def __init__(self, item_id: str, cause: Exception | None = None):
        self.item_id = item_id
        self.cause = cause
        message = f"Failed to delete vocabulary item '{item_id}'"
        if cause:
            message += f": {cause}"
        super().__init__(message)


class MissingCredentialsError(VocabularyError):
    pass


class ConfigurationError(VocabularyError):
    pass


class ValidationError(VocabularyError):
    def __init__(self, field: str, message: str):
        self.field = field
        super().__init__(f"Validation error for '{field}': {message}")
