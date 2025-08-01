import { LookupElement } from './LookupElement';

export abstract class PrefixMatcher {
  public static ALWAYS_TRUE: PrefixMatcher; // Initialized at the end of the file

  protected constructor(protected myPrefix: string) {}

  public prefixMatches(element: LookupElement): boolean {
    for (const s of element.getAllLookupStrings()) {
      if (this.doPrefixMatches(s)) {
        return true;
      }
    }
    return false;
  }

  public isStartMatch(element: LookupElement): boolean {
    for (const s of element.getAllLookupStrings()) {
      if (this.isStartMatchFor(s)) {
        return true;
      }
    }
    return false;
  }

  public isStartMatchFor(name: string): boolean {
    return this.doPrefixMatches(name);
  }

  public abstract doPrefixMatches(name: string): boolean;

  public getPrefix(): string {
    return this.myPrefix;
  }

  public abstract cloneWithPrefix(prefix: string): PrefixMatcher;

  public matchingDegree(string: string): number {
    return 0;
  }

  public sortMatching(names: Iterable<string>): Set<string> {
    if (this.getPrefix().length === 0) {
      return new Set(names);
    }

    const sorted: string[] = [];
    for (const name of names) {
      if (this.doPrefixMatches(name)) {
        sorted.push(name);
      }
    }

    sorted.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    const result = new Set<string>();
    for (const name of sorted) {
      if (this.isStartMatchFor(name)) {
        result.add(name);
      }
    }

    for (const name of sorted) {
      result.add(name);
    }

    return result;
  }
}

class PlainPrefixMatcher extends PrefixMatcher {
    public constructor(prefix: string) {
        super(prefix);
    }

    public doPrefixMatches(name: string): boolean {
        return name.toLowerCase().startsWith(this.myPrefix.toLowerCase());
    }

    public cloneWithPrefix(prefix: string): PrefixMatcher {
        return new PlainPrefixMatcher(prefix);
    }
}

PrefixMatcher.ALWAYS_TRUE = new PlainPrefixMatcher("");
