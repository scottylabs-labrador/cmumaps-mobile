"""Main module for the deserializer application."""

from collections.abc import Callable

import dotenv

from clients import (
    ALL_TABLE_NAMES,
    TableName,
    get_api_client_singleton,
    uses_local_floorplans,
)
from logger import log_operation, print_section

from .tables import (
    populate_alias_table,
    populate_building_table,
    populate_edge_table,
    populate_floor_table,
    populate_node_table,
    populate_poi_table,
    populate_room_table,
)

dotenv.load_dotenv()


def populate_table(
    table_name: TableName,
    populate_function: Callable[[], None],
) -> None:
    """Populate a table with the given function."""
    print_section(f"Populating {table_name} table")
    with log_operation(f"populate {table_name} table"):
        populate_function()


LOCAL_TABLE_NAMES: list[TableName] = [
    "Building",
    "Floor",
    "Room",
    "Alias",
    "Node",
    "Edge",
]


def main() -> None:
    """Entry point to populate the tables."""
    api_client = get_api_client_singleton()
    table_names = (
        LOCAL_TABLE_NAMES if uses_local_floorplans() else ALL_TABLE_NAMES
    )
    populators: dict[TableName, Callable[[], None]] = {
        "Building": populate_building_table,
        "Floor": populate_floor_table,
        "Room": populate_room_table,
        "Alias": populate_alias_table,
        "Node": populate_node_table,
        "Edge": populate_edge_table,
        "Poi": populate_poi_table,
    }

    with log_operation("drop tables"):
        api_client.drop_tables(table_names)

    for table_name in table_names:
        populate_table(table_name, populators[table_name])
