#!/usr/bin/env python3

import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request


def wait_for_service(url: str, name: str, max_attempts: int = 30, interval: float = 2):
    for attempt in range(max_attempts):
        try:
            urllib.request.urlopen(url, timeout=5)
            print(f"✓ {name} is ready ({url})")
            return
        except OSError:
            if attempt < max_attempts - 1:
                time.sleep(interval)
            else:
                print(f"✗ {name} not ready after {max_attempts * interval:.0f}s ({url})")


def wait_for_all_services(api_url: str, frontend_url: str):
    for url, name in [(api_url + "/health", "Backend"), (frontend_url, "Frontend")]:
        wait_for_service(url, name)
    print()


def build_pytest_command(workers: str, test_type: str) -> list[str]:
    cmd = [
        sys.executable,
        "-m",
        "pytest",
        ".",
        "-v",
        "--tb=short",
        "--html=reports/test_report.html",
        "--self-contained-html",
        "-n",
        workers,
        "--dist=loadfile",
    ]

    if test_type == "integration":
        cmd.extend(["-m", "integration"])
    elif test_type == "e2e":
        cmd.extend(["-m", "e2e"])

    return cmd


def run_tests(cmd: list[str]) -> int:
    try:
        result = subprocess.run(cmd, check=False)
        return result.returncode
    except FileNotFoundError:
        print("❌ pytest not found. Please install requirements.txt")
        return 1
    except KeyboardInterrupt:
        print("❌ Tests interrupted by user")
        return 130


def main():
    os.chdir(Path(__file__).parent)

    api_url = os.getenv("API_URL", "http://localhost:9000/api")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:80")
    skip_tts = os.getenv("SKIP_TTS_TESTS", "true")

    print("=== Integration and E2E Test Runner ===")
    print(f"API URL: {api_url}")
    print(f"Frontend URL: {frontend_url}")
    print(f"Skip TTS Tests: {skip_tts}")
    print()

    wait_for_all_services(api_url, frontend_url)

    workers = os.getenv("PYTEST_WORKERS", "8")
    test_type = os.getenv("TEST_TYPE", "all")
    cmd = build_pytest_command(workers, test_type)

    print("Running command:", " ".join(cmd))
    print("=" * 50)

    Path("reports").mkdir(exist_ok=True)

    exit_code = run_tests(cmd)

    print("=" * 50)

    if exit_code == 0:
        print("✅ All tests passed!")
    else:
        print(f"❌ Tests failed with exit code {exit_code}")

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
