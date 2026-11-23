/** Réglages propres à cet appareil (la permission de notifier est donnée appareil par appareil). */
export type NotifPrefs = { on: boolean; before: number };
const KEY = "propel:prayer-notif";
export const NOTIF_EVENT = "propel:notif-change";

export function readNotifPrefs(): NotifPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && typeof v.on === "boolean") return { on: v.on, before: Math.max(0, Math.min(30, Number(v.before) || 0)) };
  } catch {
    /* stockage indisponible */
  }
  return { on: false, before: 0 };
}

export function writeNotifPrefs(p: NotifPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* stockage indisponible */
  }
  window.dispatchEvent(new Event(NOTIF_EVENT));
}

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Affiche une notification (via le service worker quand il est là, pour que le clic ouvre la bonne page). */
export async function showNotification(title: string, body: string, url = "/islam/priere", tag?: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  const options: NotificationOptions = { body, tag, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url } };
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
