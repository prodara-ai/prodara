// ---------------------------------------------------------------------------
// Prodara Compiler — Source File Abstraction
// ---------------------------------------------------------------------------

export class SourceFile {
  readonly path: string;
  readonly text: string;
  private readonly lineStarts: readonly number[];

  constructor(path: string, text: string) {
    this.path = path;
    this.text = text;
    this.lineStarts = computeLineStarts(text);
  }

  get length(): number {
    return this.text.length;
  }

  /** Convert a 0-based offset to 1-based line and column. */
  getLineAndColumn(offset: number): { line: number; column: number } {
    let low = 0;
    let high = this.lineStarts.length - 1;
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const start = this.lineStarts[mid];
      /* v8 ignore next */
      if (start === undefined) break;
      if (start <= offset) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const lineIndex = low - 1;
    const lineStart = this.lineStarts[lineIndex] /* v8 ignore next */ ?? 0;
    return { line: lineIndex + 1, column: offset - lineStart + 1 };
  }
}

function computeLineStarts(text: string): number[] {
  const starts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (ch === 10) {
      // LF
      starts.push(i + 1);
    } else if (ch === 13) {
      // CR or CR+LF
      if (i + 1 < text.length && text.charCodeAt(i + 1) === 10) {
        starts.push(i + 2);
        i++;
      } else {
        starts.push(i + 1);
      }
    }
  }
  return starts;
}
