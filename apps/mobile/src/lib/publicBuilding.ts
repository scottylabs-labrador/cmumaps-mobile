const PUBLIC_BUILDING_CODES = ["CUC"];

export const isPublicBuilding = (
  buildingCode: string | undefined | null,
): boolean => {
  if (!buildingCode) {
    return false;
  }
  return PUBLIC_BUILDING_CODES.includes(buildingCode);
};
