import subprocess
import sys
from pathlib import Path

SCRIPT_NAMES = [
    "job_runner_1.py",
    "job_runner_2.py",
    "job_runner_3.py",
    "job_runner_4.py",
    "job_runner_5.py",
]


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    processes = []

    print("Launching 5 concurrent MCP test jobs...")

    for script_name in SCRIPT_NAMES:
        script_path = base_dir / script_name
        process = subprocess.Popen([sys.executable, str(script_path)])
        processes.append((script_name, process))
        print(f"Started {script_name} with PID {process.pid}")

    exit_code = 0

    for script_name, process in processes:
        process.wait()
        print(f"{script_name} finished with exit code {process.returncode}")
        if process.returncode != 0:
            exit_code = process.returncode

    if exit_code == 0:
        print("All hardcore test jobs completed.")
    else:
        print("One or more hardcore test jobs failed.")

    raise SystemExit(exit_code)


if __name__ == "__main__":
    main()
