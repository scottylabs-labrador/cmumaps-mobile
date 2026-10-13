import { env } from "@/env";
import { placePath, type Place } from "@/lib/place";

export const shareUrl = (
  place: Place,
  query: { src?: string; dst?: string; floor?: string },
) => {
  const url = new URL(placePath(place), env.webOrigin);
  if (query.src) {
    url.searchParams.set("src", query.src);
  }
  if (query.dst) {
    url.searchParams.set("dst", query.dst);
  }
  if (query.floor) {
    url.searchParams.set("floor", query.floor);
  }
  return url.toString();
};
