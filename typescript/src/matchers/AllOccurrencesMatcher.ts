import { FList } from '../utils/FList';
import { TextRange } from '../utils/TextRange';
import { MinusculeMatcher } from './MinusculeMatcher';
import { FixingLayoutMatcher } from './FixingLayoutMatcher';
import { MatchingCaseSensitivity } from '../utils/NameUtil';

export class AllOccurrencesMatcher extends MinusculeMatcher {
  private readonly delegate: MinusculeMatcher;

  private constructor(pattern: string, options: MatchingCaseSensitivity, hardSeparators: string) {
    super();
    this.delegate = new FixingLayoutMatcher(pattern, options, hardSeparators);
  }

  public getPattern(): string {
    return this.delegate.getPattern();
  }

  public matchingDegree(name: string, valueStartCaseMatch: boolean, fragments: FList<TextRange> | null): number {
    return this.delegate.matchingDegree(name, valueStartCaseMatch, fragments);
  }

  public matchingFragments(name: string): FList<TextRange> | null {
    let match = this.delegate.matchingFragments(name);
    if (match !== null && !match.isEmpty()) {
      const allMatchesReversed: FList<TextRange>[] = [];
      let lastOffset = 0;
      while (match !== null && !match.isEmpty()) {
        let reversedWithAbsoluteOffsets = FList.empty<TextRange>();
        for (const r of match) {
          reversedWithAbsoluteOffsets = reversedWithAbsoluteOffsets.prepend(r.shiftRight(lastOffset));
        }
        allMatchesReversed.push(reversedWithAbsoluteOffsets);
        lastOffset = reversedWithAbsoluteOffsets.get(0).getEndOffset();
        match = this.delegate.matchingFragments(name.substring(lastOffset));
      }
      match = FList.empty<TextRange>();
      for (let i = allMatchesReversed.length - 1; i >= 0; i--) {
        for (const range of allMatchesReversed[i]) {
          match = match.prepend(range);
        }
      }
    }
    return match;
  }

  public toString(): string {
    return `AllOccurrencesMatcher{delegate=${this.delegate}}`;
  }

  public static create(pattern: string, options: MatchingCaseSensitivity, hardSeparators: string): MinusculeMatcher {
    return new AllOccurrencesMatcher(pattern, options, hardSeparators);
  }
}
