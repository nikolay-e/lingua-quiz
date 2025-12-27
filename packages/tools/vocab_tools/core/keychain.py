import subprocess
from dataclasses import dataclass


class KeychainError(Exception):
    pass


def get_keychain_value(service: str) -> str | None:
    try:
        result = subprocess.run(  # nosec B607
            ["security", "find-generic-password", "-s", service, "-a", subprocess.os.environ.get("USER", ""), "-w"],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return None


@dataclass
class WordsDatabaseCredentials:
    host: str
    port: int
    name: str
    user: str
    password: str


def get_words_db_credentials() -> WordsDatabaseCredentials:
    host = get_keychain_value("lingua-quiz-words-db-host")
    port = get_keychain_value("lingua-quiz-words-db-port")
    name = get_keychain_value("lingua-quiz-words-db-name")
    user = get_keychain_value("lingua-quiz-words-db-user")
    password = get_keychain_value("lingua-quiz-words-db-password")

    if not all([host, port, name, user, password]):
        missing = []
        if not host:
            missing.append("lingua-quiz-words-db-host")
        if not port:
            missing.append("lingua-quiz-words-db-port")
        if not name:
            missing.append("lingua-quiz-words-db-name")
        if not user:
            missing.append("lingua-quiz-words-db-user")
        if not password:
            missing.append("lingua-quiz-words-db-password")

        raise KeychainError(
            f"Missing Keychain credentials: {', '.join(missing)}\nSee gitops/CLAUDE.md for setup instructions."
        )

    return WordsDatabaseCredentials(
        host=host,
        port=int(port),
        name=name,
        user=user,
        password=password,
    )
