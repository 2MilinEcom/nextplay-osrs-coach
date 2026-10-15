export type ByteRange = { offset: number; length: number };

/** Resolve a single HTTP byte range against a known clip size. */
export function parseByteRange(header: string, size: number): ByteRange | null {
  if (!Number.isSafeInteger(size) || size <= 0) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : null;
  const end = match[2] ? Number(match[2]) : null;
  if (start !== null && (!Number.isSafeInteger(start) || start >= size)) return null;
  if (end !== null && (!Number.isSafeInteger(end) || end < 0)) return null;
  if (start === null) {
    if (!end) return null;
    const length = Math.min(end, size);
    return { offset: size - length, length };
  }
  if (end !== null && end < start) return null;
  return { offset: start, length: Math.min(end ?? size - 1, size - 1) - start + 1 };
}
