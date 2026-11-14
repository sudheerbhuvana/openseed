/**
 * Universal clipboard copy helper with fallbacks for non-secure HTTP mobile contexts.
 * When accessing via local network IP (e.g. http://192.168.1.100:3000), `navigator.clipboard`
 * is disabled by mobile browsers (requires HTTPS or localhost). This utility uses
 * `document.execCommand("copy")` fallback to ensure copy buttons always work on mobile.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // 1. Try modern async Clipboard API if available and in secure context
  if (navigator?.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand
    }
  }

  // 2. Fallback using invisible textarea and execCommand (works in HTTP)
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    textArea.style.opacity = "0";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999); // For mobile devices

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    if (successful) return true;
  } catch (err) {
    console.warn("[OpenSeed] execCommand copy failed:", err);
  }

  // 3. Last-resort fallback for mobile browsers that block automated copy
  try {
    if (typeof window.prompt === "function") {
      window.prompt("Copy to clipboard: Ctrl+C / tap & hold to copy", text);
      return true;
    }
  } catch {
    // Ignore
  }

  return false;
}

