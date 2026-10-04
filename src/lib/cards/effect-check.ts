/** Only the checksum travels in portable files; never the copyrighted effect text. */
export function effectFingerprint(text: string): string {
  let hash = 2166136261;
  for (const char of text.trim().replace(/\s+/g, ' ')) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
