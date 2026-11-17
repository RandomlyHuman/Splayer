/**
 * platform-api.ts
 * Acceso unificado a `window.electronAPI`. Splayer ahora solo funciona como
 * aplicación de escritorio (Electron en Windows); "web" queda para el modo
 * de desarrollo en navegador, donde no hay API nativa.
 */

export type PlatformName = "electron" | "web";

export const currentPlatform: PlatformName = (() => {
  if (typeof window === "undefined") return "web";
  if (window.electronAPI) return "electron";
  return "web";
})();

export const platformAPI: Window["electronAPI"] =
  typeof window !== "undefined" ? window.electronAPI : undefined;

/** Antes convertía URIs content:// de Android; en escritorio es un paso directo. */
export function convertFileUri(uri: string): string {
  return uri;
}
