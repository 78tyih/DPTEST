export interface IntakeProfile {
  primaryMarkets: string[];
  marketDetails: string;
  tradingCapitalRange: string;
  tradingExperience: string;
  tradingSystem: string;
}

const INTAKE_KEY = "quiz_intake_profile";

export function saveIntakeProfile(profile: IntakeProfile) {
  sessionStorage.setItem(INTAKE_KEY, JSON.stringify(profile));
  localStorage.setItem(INTAKE_KEY, JSON.stringify(profile));
}

export function loadIntakeProfile(): IntakeProfile | null {
  try {
    const raw = sessionStorage.getItem(INTAKE_KEY) || localStorage.getItem(INTAKE_KEY);
    return raw ? JSON.parse(raw) as IntakeProfile : null;
  } catch {
    return null;
  }
}

export function clearIntakeProfile() {
  sessionStorage.removeItem(INTAKE_KEY);
  localStorage.removeItem(INTAKE_KEY);
}

export async function syncPendingIntakeProfile() {
  const profile = loadIntakeProfile();
  if (!profile) return;

  await fetch("/api/user/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
    credentials: "include",
  });
}
