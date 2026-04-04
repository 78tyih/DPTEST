import type { DiagnosticTrackId, RewardAsset } from "@/data/orderflowDiagnostic";

const OFFICIAL_SITE_URL = "https://deltapex.zeabur.app";
const SURVEY_FALLBACK_URL = "https://dptest-org.fly.dev";

export function getOfficialSiteUrl(): string {
  return OFFICIAL_SITE_URL;
}

export function resolveSurveyBaseUrl(origin?: string): string {
  const source = origin
    || (typeof window !== "undefined" ? window.location.origin : "")
    || SURVEY_FALLBACK_URL;

  return source.replace(/\/+$/, "");
}

export function buildSurveyEntryUrl(track?: DiagnosticTrackId, origin?: string): string {
  const base = resolveSurveyBaseUrl(origin);
  if (!track) {
    return `${base}/`;
  }
  return `${base}/?track=${track}`;
}

export function resolveRewardAction(reward: RewardAsset): {
  href: string;
  label: string;
  external: boolean;
} {
  if (reward.url) {
    return {
      href: reward.url,
      label: "打开资料",
      external: true,
    };
  }

  return {
    href: `${OFFICIAL_SITE_URL}/?source=${reward.id}`,
    label: "前往官网领取",
    external: true,
  };
}
