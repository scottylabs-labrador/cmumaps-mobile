"""Read floorplan JSON from S3 or from the repo data directory."""

import json
import os
from pathlib import Path
from typing import Any, cast

from logger import get_app_logger

from ._s3_client import get_s3_client_singleton


def uses_local_floorplans() -> bool:
    """Local populate reads the repo data directory when S3 is not configured."""
    return not os.getenv("S3_ENDPOINT")


def get_floorplan_json(object_name: str) -> dict[str, Any] | None:
    """Load a floorplan JSON object from S3 or from data/."""
    if not uses_local_floorplans():
        return get_s3_client_singleton().get_json_file(object_name)
    return _read_local_floorplan(object_name)


def _read_local_floorplan(object_name: str) -> dict[str, Any] | None:
    logger = get_app_logger()
    path = _data_dir() / object_name
    try:
        with path.open(encoding="utf-8") as file:
            return cast("dict[str, Any]", json.load(file))
    except Exception:
        logger.exception("Error reading %s", path)
        return None


def _data_dir() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "data" / "floorplans").is_dir():
            return parent / "data"
    msg = "Could not find data/floorplans from the dataflow package"
    raise FileNotFoundError(msg)
