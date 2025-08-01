import { MinusculeMatcher } from './MinusculeMatcher';
import { TypoTolerantMatcher } from './TypoTolerantMatcher';
import { FixingLayoutMatcher } from './FixingLayoutMatcher';
import { MatcherWithFallback } from './MatcherWithFallback';
import { MatchingCaseSensitivity } from '../utils/NameUtil';

export class FixingLayoutTypoTolerantMatcher {
  public static create(pattern: string, options: MatchingCaseSensitivity, hardSeparators: string): MinusculeMatcher {
    const mainMatcher = new TypoTolerantMatcher(pattern, options, hardSeparators);
    const s = FixingLayoutMatcher.fixLayout(pattern);

    if (s !== null && s !== pattern) {
      const fallbackMatcher = new TypoTolerantMatcher(s, options, hardSeparators);
      return new MatcherWithFallback(mainMatcher, fallbackMatcher);
    } else {
      return mainMatcher;
    }
  }
}
