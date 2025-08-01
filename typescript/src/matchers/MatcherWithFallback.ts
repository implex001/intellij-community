import { FList } from '../utils/FList';
import { TextRange } from '../utils/TextRange';
import { MinusculeMatcher } from './MinusculeMatcher';

export class MatcherWithFallback extends MinusculeMatcher {
  public constructor(
    private readonly myMainMatcher: MinusculeMatcher,
    private readonly myFallbackMatcher: MinusculeMatcher | null
  ) {
    super();
  }

  public getPattern(): string {
    return this.myMainMatcher.getPattern();
  }

  public matches(name: string): boolean {
    return this.myMainMatcher.matches(name) || (this.myFallbackMatcher !== null && this.myFallbackMatcher.matches(name));
  }

  public matchingFragments(name: string): FList<TextRange> | null {
    const mainRanges = this.myMainMatcher.matchingFragments(name);
    const useMainRanges = mainRanges !== null && !mainRanges.isEmpty() || this.myFallbackMatcher === null;
    return useMainRanges ? mainRanges : this.myFallbackMatcher!.matchingFragments(name);
  }

  public matchingDegree(name: string, valueStartCaseMatch: boolean, fragments: FList<TextRange> | null): number {
    const mainRanges = this.myMainMatcher.matchingFragments(name);
    const useMainRanges = mainRanges !== null && !mainRanges.isEmpty() || this.myFallbackMatcher === null;

    return useMainRanges
      ? this.myMainMatcher.matchingDegree(name, valueStartCaseMatch, fragments)
      : this.myFallbackMatcher!.matchingDegree(name, valueStartCaseMatch, fragments);
  }

  public toString(): string {
    return `MatcherWithFallback{myMainMatcher=${this.myMainMatcher}, myFallbackMatcher=${this.myFallbackMatcher}}`;
  }
}
