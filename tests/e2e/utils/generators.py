import random
import string


def random_username() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_{suffix}"


def random_password() -> str:
    return "Test@123" + "".join(random.choices(string.ascii_lowercase, k=4))


def random_word(prefix: str = "test") -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"{prefix}_{suffix}"
