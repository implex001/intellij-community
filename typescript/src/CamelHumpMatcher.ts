import { PrefixMatcher } from './matchers/PrefixMatcher';
import { MinusculeMatcher } from './matchers/MinusculeMatcher';
import { LookupElement } from './matchers/LookupElement';
import { FList } from './utils/FList';
import { TextRange } from './utils/TextRange';
import { CharArrayUtil } from './utils/CharArrayUtil';
import { StringUtil } from './utils/StringUtil';
import { NameUtil, MatcherBuilder } from './utils/NameUtil';
import { CodeInsightSettings, Registry, CompletionUtil, Disposer, Disposable } from './moks';
import { MatchingCaseSensitivity } from './utils/NameUtil';

export class CamelHumpMatcher extends PrefixMatcher {
  private readonly myMatcher: MinusculeMatcher;
  private readonly myCaseInsensitiveMatcher: MinusculeMatcher;
  private readonly myCaseSensitive: boolean;
  private static ourForceStartMatching = false;
  private readonly myTypoTolerant: boolean;

  public constructor(prefix: string, caseSensitive = true, typoTolerant = false) {
    super(prefix);
    this.myCaseSensitive = caseSensitive;
    this.myTypoTolerant = typoTolerant;
    this.myMatcher = this.createMatcher(this.myCaseSensitive);
    this.myCaseInsensitiveMatcher = this.createMatcher(false);
  }

  public isCaseSensitive(): boolean {
    return this.myCaseSensitive;
  }

  public isStartMatchFor(name: string): boolean {
    return this.myMatcher.isStartMatch(name);
  }

  public isStartMatch(element: LookupElement): boolean {
    for (const s of CompletionUtil.iterateLookupStrings(element)) {
      const ranges = this.myCaseInsensitiveMatcher.matchingFragments(s);
      if (ranges === null) continue;
      if (ranges.isEmpty() || CamelHumpMatcher.skipUnderscores(s) >= ranges.get(0)!.getStartOffset()) {
        return true;
      }
    }

    return false;
  }

  public isTypoTolerant(): boolean {
    return this.myTypoTolerant;
  }

  private static skipUnderscores(name: string): number {
    return CharArrayUtil.shiftForward(name, 0, '_');
  }

  public doPrefixMatches(name: string): boolean {
    if (
      name.startsWith('_') &&
      CodeInsightSettings.getInstance().getCompletionCaseSensitive() === CodeInsightSettings.FIRST_LETTER &&
      this.firstLetterCaseDiffers(name)
    ) {
      return false;
    }

    return this.myMatcher.matches(name);
  }

  private firstLetterCaseDiffers(name: string): boolean {
    const nameFirst = CamelHumpMatcher.skipUnderscores(name);
    const prefixFirst = CamelHumpMatcher.skipUnderscores(this.myPrefix);
    return (
      nameFirst < name.length &&
      prefixFirst < this.myPrefix.length &&
      CamelHumpMatcher.caseDiffers(name.charAt(nameFirst), this.myPrefix.charAt(prefixFirst))
    );
  }

  private static caseDiffers(c1: string, c2: string): boolean {
    return (c1.toLowerCase() !== c1) !== (c2.toLowerCase() !== c2) || (c1.toUpperCase() !== c1) !== (c2.toUpperCase() !== c2);
  }

  public prefixMatches(element: LookupElement): boolean {
    return this.prefixMatchersInternal(element, !element.isCaseSensitive());
  }

  private prefixMatchersInternal(element: LookupElement, itemCaseInsensitive: boolean): boolean {
    for (const name of element.getAllLookupStrings()) {
      if ((itemCaseInsensitive && StringUtil.startsWithIgnoreCase(name, this.myPrefix)) || this.doPrefixMatches(name)) {
        return true;
      }
      if (itemCaseInsensitive && CodeInsightSettings.ALL !== CodeInsightSettings.getInstance().getCompletionCaseSensitive()) {
        if (this.myCaseInsensitiveMatcher.matches(name)) {
          return true;
        }
      }
    }
    return false;
  }

  public cloneWithPrefix(prefix: string): PrefixMatcher {
    if (prefix === this.myPrefix) {
      return this;
    }

    return new CamelHumpMatcher(prefix, this.myCaseSensitive, this.myTypoTolerant);
  }

  private createMatcher(caseSensitive: boolean): MinusculeMatcher {
    const prefix = CamelHumpMatcher.applyMiddleMatching(this.myPrefix);

    let builder = NameUtil.buildMatcher(prefix);
    if (caseSensitive) {
      const setting = CodeInsightSettings.getInstance().getCompletionCaseSensitive();
      if (setting === CodeInsightSettings.FIRST_LETTER) {
        builder = builder.withCaseSensitivity(MatchingCaseSensitivity.FIRST_LETTER);
      } else if (setting === CodeInsightSettings.ALL) {
        builder = builder.withCaseSensitivity(MatchingCaseSensitivity.ALL);
      }
    }
    if (this.myTypoTolerant) {
      builder = builder.typoTolerant();
    }
    return builder.build();
  }

  public static applyMiddleMatching(prefix: string): string {
    if (Registry.is('ide.completion.middle.matching') && prefix.length > 0 && !CamelHumpMatcher.ourForceStartMatching) {
      return '*' + StringUtil.replace(prefix, '.', '. ').trim();
    }
    return prefix;
  }

  public toString(): string {
    return this.myPrefix;
  }

  public static forceStartMatching(parent: Disposable): void {
    CamelHumpMatcher.ourForceStartMatching = true;
    Disposer.register(parent, {
      dispose(): void {
        CamelHumpMatcher.ourForceStartMatching = false;
      },
    });
  }

  public matchingDegree(string: string): number {
    return this.matchingDegreeWithFragments(string, this.matchingFragments(string));
  }

  public matchingFragments(string: string): FList<TextRange> | null {
    return this.myMatcher.matchingFragments(string);
  }

  public matchingDegreeWithFragments(string: string, fragments: FList<TextRange> | null): number {
    const underscoreEnd = CamelHumpMatcher.skipUnderscores(string);
    if (underscoreEnd > 0) {
      const ciRanges = this.myCaseInsensitiveMatcher.matchingFragments(string);
      if (ciRanges !== null && !ciRanges.isEmpty()) {
        const matchStart = ciRanges.get(0)!.getStartOffset();
        if (matchStart > 0 && matchStart <= underscoreEnd) {
          return this.myCaseInsensitiveMatcher.matchingDegree(string.substring(matchStart), true, null) - 1;
        }
      }
    }

    return this.myMatcher.matchingDegree(string, true, fragments);
  }
}
