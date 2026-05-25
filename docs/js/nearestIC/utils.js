import { MAX_TIME_MAP, TRAVEL_TIME_BUCKETS } from "./config.js";

export function formatMaxTimeForPath(minutes) {
  return MAX_TIME_MAP[minutes] || "240min";
}

export function formatMaxTimeForDisplay(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function getBucketByKey(key) {
  return TRAVEL_TIME_BUCKETS.find((bucket) => bucket.key === key) || null;
}

export function getBucketLabel(bucket) {
  if (bucket === "all") return "All";
  return getBucketByKey(bucket)?.label ?? "All";
}

export function matchesBucket(minutes, bucket) {
  if (bucket === "all") return true;
  if (minutes == null || Number.isNaN(minutes)) return false;

  const bucketDef = getBucketByKey(bucket);
  if (!bucketDef || bucketDef.key === "nodata") return false;

  return minutes >= bucketDef.min && minutes <= bucketDef.max;
}

export function getTravelTimeColor(value) {
  if (value == null || Number.isNaN(value)) {
    return getBucketByKey("nodata").color;
  }

  const bucket = TRAVEL_TIME_BUCKETS.find(
    (b) => b.key !== "nodata" && value >= b.min && value <= b.max
  );

  return bucket ? bucket.color : getBucketByKey("nodata").color;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function normalizeDestinations(destinations, maxTravelTime = Infinity) {
  return destinations
    .map((dest) => ({
      name: dest.name || dest.stop_name || dest.destination_name || `Stop ${dest.id ?? ""}`,
      minutes: Number(dest.travel_time ?? dest.minutes ?? dest.duration ?? NaN)
    }))
    .filter((dest) => Number.isFinite(dest.minutes) && dest.name && dest.minutes <= maxTravelTime)
    .sort((a, b) => a.minutes - b.minutes);
}

export function resForZoom(zoom) {
  if (zoom <= 6) return 4;
  if (zoom <= 7) return 5;
  if (zoom <= 9) return 6;
  return 7;
}