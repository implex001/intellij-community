import { FList } from '../utils/FList';
import { TextRange } from '../utils/TextRange';
import { Matcher } from './Matcher';

export abstract class MinusculeMatcher implements Matcher {
  protected constructor() {}

  public abstract getPattern(): string;

  public matches(name: string): boolean {
    return this.matchingFragments(name) !== null;
  }

  public matchingFragments(name: string): FList<TextRange> | null {
    throw new Error('Unsupported operation');
  }

  public matchingDegree(name: string, valueStartCaseMatch: boolean, fragments: FList<TextRange> | null): number {
    throw new Error('Unsupported operation');
  }

  public matchingDegreeWithCase(name: string, valueStartCaseMatch: boolean): number {
    return this.matchingDegree(name, valueStartCaseMatch, this.matchingFragments(name));
  }

  public matchingDegreeSimple(name: string): number {
    return this.matchingDegreeWithCase(name, false);
  }

  public isStartMatch(name: string): boolean {
    const fragments = this.matchingFragments(name);
    return fragments !== null && MinusculeMatcher.isStartMatch(fragments);
  }

  public static isStartMatch(fragments: Iterable<TextRange>): boolean {
    const iterator = fragments[Symbol.iterator]();
    const first = iterator.next();
    return first.done || first.value.getStartOffset() === 0;
  }
}
