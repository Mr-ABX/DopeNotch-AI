import { open } from "@tauri-apps/plugin-shell";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";

export const APP_VERSION = "0.4.0";
const GITHUB_REPO = "Mr-ABX/DopeNotch";

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  releaseUrl: string;
  publishedAt: string;
}

function parseSemVer(v: string): number[] {
  const clean = v.replace(/^v/, "").trim();
  const parts = clean.split(".").map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

export function isNewerVersion(latest: string, current: string): boolean {
  const [lMajor, lMinor, lPatch] = parseSemVer(latest);
  const [cMajor, cMinor, cPatch] = parseSemVer(current);

  if (lMajor > cMajor) return true;
  if (lMajor < cMajor) return false;

  if (lMinor > cMinor) return true;
  if (lMinor < cMinor) return false;

  return lPatch > cPatch;
}

export async function checkForAppUpdates(): Promise<UpdateInfo> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.statusText}`);
    }

    const data = await res.json();
    const latestVersion = data.tag_name || `v${APP_VERSION}`;
    const hasUpdate = isNewerVersion(latestVersion, APP_VERSION);

    return {
      hasUpdate,
      currentVersion: APP_VERSION,
      latestVersion: latestVersion.replace(/^v/, ""),
      releaseName: data.name || `DopeNotch ${latestVersion}`,
      releaseNotes: data.body || "Performance and stability updates.",
      releaseUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
      publishedAt: data.published_at || new Date().toISOString(),
    };
  } catch (err) {
    console.error("Failed to check for updates:", err);
    return {
      hasUpdate: false,
      currentVersion: APP_VERSION,
      latestVersion: APP_VERSION,
      releaseName: `DopeNotch v${APP_VERSION}`,
      releaseNotes: "",
      releaseUrl: `https://github.com/${GITHUB_REPO}/releases/latest`,
      publishedAt: new Date().toISOString(),
    };
  }
}

export async function openReleasePage(url: string) {
  try {
    await open(url);
  } catch {
    window.open(url, "_blank");
  }
}

export async function notifyUpdateAvailable(info: UpdateInfo) {
  try {
    let hasPermission = await isPermissionGranted();
    if (!hasPermission) {
      const permission = await requestPermission();
      hasPermission = permission === "granted";
    }
    if (hasPermission) {
      sendNotification({
        title: "DopeNotch Update Available 🚀",
        body: `A new version of DopeNotch (v${info.latestVersion}) is ready to download!`,
      });
    }
  } catch (err) {
    console.warn("Notification error:", err);
  }
}
