export class CodeInsightSettings {
  public static FIRST_LETTER = 0;
  public static ALL = 1;
  private static instance = new CodeInsightSettings();
  public getCompletionCaseSensitive(): number {
    return CodeInsightSettings.FIRST_LETTER;
  }

  public static getInstance(): CodeInsightSettings {
    return this.instance;
  }
}

export class Registry {
  public static is(key: string): boolean {
    return true;
  }
}

export class CompletionUtil {
  public static iterateLookupStrings(element: any): string[] {
    return [element.lookupString];
  }
}

export class Disposer {
  public static register(parent: any, disposable: any): void {
    // no-op
  }
}

export interface Disposable {
  dispose(): void;
}
