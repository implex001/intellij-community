import { KeyboardLayoutUtil } from '../utils/KeyboardLayoutUtil';
import { MinusculeMatcher } from './MinusculeMatcher';
import { MatcherWithFallback } from './MatcherWithFallback';
import { MinusculeMatcherImpl } from './MinusculeMatcherImpl';
import { MatchingCaseSensitivity } from '../utils/NameUtil';

export class FixingLayoutMatcher extends MatcherWithFallback {
  public constructor(pattern: string, options: MatchingCaseSensitivity, hardSeparators: string) {
    super(new MinusculeMatcherImpl(pattern, options, hardSeparators), FixingLayoutMatcher.withFixedLayout(pattern, options, hardSeparators));
  }

  public static fixLayout(pattern: string): string | null {
    let hasLetters = false;
    let onlyWrongLetters = true;
    for (let i = 0; i < pattern.length; i++) {
      const c = pattern.charAt(i);
      if (/\p{L}/u.test(c)) {
        hasLetters = true;
        if (c.charCodeAt(0) <= 127) {
          onlyWrongLetters = false;
          break;
        }
      }
    }

    if (hasLetters && onlyWrongLetters) {
      const alternatePattern: string[] = new Array(pattern.length);
      for (let i = 0; i < pattern.length; i++) {
        const c = pattern.charAt(i);
        const newC = KeyboardLayoutUtil.getAsciiForChar(c);
        alternatePattern[i] = newC === null ? c : newC;
      }

      return alternatePattern.join('');
    }
    return null;
  }

  private static withFixedLayout(pattern: string, options: MatchingCaseSensitivity, hardSeparators: string): MinusculeMatcher | null {
    const s = FixingLayoutMatcher.fixLayout(pattern);
    if (s !== null && s !== pattern) {
      return new MinusculeMatcherImpl(s, options, hardSeparators);
    }

    return null;
  }
}
