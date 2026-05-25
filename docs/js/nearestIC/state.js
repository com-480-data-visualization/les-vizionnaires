import { DEFAULT_REACHABLE_INFO_STATE, DEFAULT_STATE } from "./config.js";

export const state = {
  accessibilityLayer: null,
  accessibilityFeatures: [],
  accessibilityBounds: null,
  accessibilityDimmed: false,
  currentHexRes: null,
  overlayVisible: false,
  selectedOriginLayer: null,
  reachableDestinationsLayer: null,
  reachableFromAll: null,
  legendControl: null,
  reachableInfoControl: null,
  selectedOriginFeature: null,
  currentState: { ...DEFAULT_STATE },
  reachableInfoState: { ...DEFAULT_REACHABLE_INFO_STATE }
};

export function resetReachableInfoState() {
  state.reachableInfoState = { ...DEFAULT_REACHABLE_INFO_STATE };
}