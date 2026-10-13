from clients import get_api_client_singleton, get_floorplan_json
from logger import get_app_logger


def populate_poi_table() -> None:
    """Populate the Poi table using osm-pois.json."""
    logger = get_app_logger()
    api_client = get_api_client_singleton()

    pois = get_floorplan_json("floorplans/osm-pois.json")
    if pois is None:
        msg = "Failed to get osm-pois data"
        logger.critical(msg)
        raise ValueError(msg)

    poi_data = list(pois.values())

    if not api_client.populate_table("Poi", poi_data):
        msg = "Failed to populate the Poi table"
        logger.critical(msg)
        raise RuntimeError(msg)

    logger.debug("Populated %d pois", len(poi_data))
