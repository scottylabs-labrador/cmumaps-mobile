"""Singleton clients for the dataflow application."""

from ._api_client import ALL_TABLE_NAMES, TableName, get_api_client_singleton
from ._floorplans import get_floorplan_json, uses_local_floorplans
from ._s3_client import get_s3_client_singleton

__all__ = [
    "ALL_TABLE_NAMES",
    "TableName",
    "get_api_client_singleton",
    "get_floorplan_json",
    "get_s3_client_singleton",
    "uses_local_floorplans",
]
