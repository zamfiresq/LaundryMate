#!/usr/bin/env python

import os
import sys
import environ           # for reading environment variables from .env file

# read the environment variables from the .env file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = environ.Env()
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

ROBOFLOW_API_KEY = env("ROBOFLOW_API_KEY")


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_backend.settings')

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
