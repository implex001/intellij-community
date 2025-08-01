import { FList } from '../utils/FList';
import { TextRange } from '../utils/TextRange';
import { MinusculeMatcher } from './MinusculeMatcher';

export class PreferStartMatchMatcherWrapper extends MinusculeMatcher {
  public static readonly START_MATCH_WEIGHT = 10000;
  private readonly myDelegateMatcher: MinusculeMatcher;

  public constructor(matcher: MinusculeMatcher) {
    super();
    this.myDelegateMatcher = matcher;
  }

  public getPattern(): string {
    return this.myDelegateMatcher.getPattern();
  }

  public matchingFragments(name: string): FList<TextRange> | null {
    return this.myDelegateMatcher.matchingFragments(name);
  }

  public matchingDegree(name: string, valueStartCaseMatch: boolean, fragments: FList<TextRange> | null): number {
    let degree = this.myDelegateMatcher.matchingDegree(name, valueStartCaseMatch, fragments);
    if (fragments === null || fragments.isEmpty()) return degree;

    if (fragments.getHead()!.getStartOffset() === 0) degree += PreferStartMatchMatcherWrapper.START_MATCH_WEIGHT;
    return degree;
  }
}
