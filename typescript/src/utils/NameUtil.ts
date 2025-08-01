import { StringUtil } from './StringUtil';
import { NameUtilCore } from './NameUtilCore';
import { Matcher } from '../matchers/Matcher';
import { MinusculeMatcher } from '../matchers/MinusculeMatcher';
import { FixingLayoutTypoTolerantMatcher } from '../matchers/FixingLayoutTypoTolerantMatcher';
import { AllOccurrencesMatcher } from '../matchers/AllOccurrencesMatcher';
import { FixingLayoutMatcher } from '../matchers/FixingLayoutMatcher';
import { PreferStartMatchMatcherWrapper } from '../matchers/PreferStartMatchMatcherWrapper';
import { PinyinMatcher } from '../matchers/PinyinMatcher';
import { MatcherWithFallback } from '../matchers/MatcherWithFallback';

export enum MatchingCaseSensitivity {
  NONE,
  FIRST_LETTER,
  ALL,
}

const MAX_LENGTH = 40;
const TYPO_AWARE_PATTERN_LIMIT = 13;

export class NameUtil {
  public static nameToWordsLowerCase(name: string): string[] {
    const words = NameUtilCore.nameToWords(name);
    return words.map(word => StringUtil.toLowerCase(word));
  }

  public static buildMatcher(pattern: string): MatcherBuilder {
    return new MatcherBuilder(pattern);
  }

  public static buildMatcherWithOptions(pattern: string, options: MatchingCaseSensitivity): MinusculeMatcher {
    return NameUtil.buildMatcher(pattern).withCaseSensitivity(options).build();
  }
}

export class MatcherBuilder {
  private separators = '';
  private caseSensitivity = MatchingCaseSensitivity.NONE;
  private typoTolerant = false;
  private preferStartMatches = false;
  private allOccurrences = false;

  public constructor(private readonly pattern: string) {}

  public withCaseSensitivity(caseSensitivity: MatchingCaseSensitivity): MatcherBuilder {
    this.caseSensitivity = caseSensitivity;
    return this;
  }

  public withSeparators(separators: string): MatcherBuilder {
    this.separators = separators;
    return this;
  }

  public typoTolerant(): MatcherBuilder {
    this.typoTolerant = this.pattern.length <= TYPO_AWARE_PATTERN_LIMIT;
    return this;
  }

  public preferringStartMatches(): MatcherBuilder {
    this.preferStartMatches = true;
    return this;
  }

  public allOccurrences(): MatcherBuilder {
    this.allOccurrences = true;
    return this;
  }

  public build(): MinusculeMatcher {
    let matcher: MinusculeMatcher = this.typoTolerant
      ? FixingLayoutTypoTolerantMatcher.create(this.pattern, this.caseSensitivity, this.separators)
      : this.allOccurrences
      ? AllOccurrencesMatcher.create(this.pattern, this.caseSensitivity, this.separators)
      : new FixingLayoutMatcher(this.pattern, this.caseSensitivity, this.separators);

    if (this.preferStartMatches) {
      matcher = new PreferStartMatchMatcherWrapper(matcher);
    }
    matcher = PinyinMatcher.create(matcher);
    return matcher;
  }
}
