export const TRAVEL_TIME_BUCKETS = [
  { key: "30", label: "≤ 30 min", color: "#1a9850", min: 0, max: 30 },
  { key: "60", label: "31–60 min", color: "#91cf60", min: 31, max: 60 },
  { key: "120", label: "1h-2h", color: "#d9ef8b", min: 61, max: 120 },
  { key: "180", label: "2h-3h", color: "#fee08b", min: 121, max: 180 },
  { key: "240", label: "3h-4h", color: "#fc8d59", min: 181, max: 240 },
  { key: "999", label: "> 4h", color: "#d73027", min: 241, max: Infinity },
  { key: "nodata", label: "No data", color: "#bdbdbd", min: null, max: null }
];

export const MAX_TIME_MAP = {
  30: "030min",
  60: "060min",
  90: "090min",
  120: "120min",
  150: "150min",
  180: "180min",
  210: "210min",
  240: "240min"
};

export const DEFAULT_STATE = {
  dayType: "weekday",
  departureTime: "09:00",
  maxTravelTime: 240
};

export const DEFAULT_REACHABLE_INFO_STATE = {
  allDestinations: [],
  filteredDestinations: [],
  activeBucket: "all",
  expanded: false,
  originId: null,
  nearestIcMinutes: null
};