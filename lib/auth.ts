/** /design s'ouvre sans code, uniquement en développement. */
export function isDevPreviewEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DEV_PREVIEW === "1";
}
