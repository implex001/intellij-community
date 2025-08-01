export class TextRange {
  constructor(public start: number, public end: number) {}

  public static create(start: number, end: number): TextRange {
    return new TextRange(start, end);
  }

  public getStartOffset(): number {
    return this.start;
  }

  public getEndOffset(): number {
    return this.end;
  }

  public getLength(): number {
    return this.end - this.start;
  }

  public shiftRight(delta: number): TextRange {
    return new TextRange(this.start + delta, this.end + delta);
  }
}
