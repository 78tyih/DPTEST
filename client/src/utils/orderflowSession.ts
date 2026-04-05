import type { DiagnosticTrackId } from "@/data/orderflowDiagnostic";

const ORDERFLOW_TRACK_KEY = "orderflow_diagnostic_track";

export function setActiveOrderflowTrack(trackId: DiagnosticTrackId) {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(ORDERFLOW_TRACK_KEY, trackId);
}

export function getActiveOrderflowTrack(): DiagnosticTrackId {
  if (typeof window === "undefined") {
    return "starter";
  }

  const fromQuery = new URLSearchParams(window.location.search).get("track");
  if (fromQuery === "starter" || fromQuery === "deep") {
    sessionStorage.setItem(ORDERFLOW_TRACK_KEY, fromQuery);
    return fromQuery;
  }

  const stored = sessionStorage.getItem(ORDERFLOW_TRACK_KEY);
  return stored === "deep" ? "deep" : "starter";
}

export function clearActiveOrderflowTrack() {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(ORDERFLOW_TRACK_KEY);
}
