import { TextRange } from '../utils/TextRange';
import { FList } from '../utils/FList';
import { NameUtilCore } from '../utils/NameUtilCore';
import { MinusculeMatcher } from './MinusculeMatcher';
import { MatchingCaseSensitivity } from '../utils/NameUtil';
import { StringUtil } from '../utils/StringUtil';
import { AsciiUtils } from '../utils/AsciiUtils';

class MinusculeMatcherImpl extends MinusculeMatcher {
  private static readonly MAX_CAMEL_HUMP_MATCHING_LENGTH = 100;

  private readonly myPattern: string[];
  private readonly myHardSeparators: string;
  private readonly myOptions: MatchingCaseSensitivity;
  private readonly myHasHumps: boolean;
  private readonly myHasSeparators: boolean;
  private readonly myHasDots: boolean;
  private readonly isLowerCase: boolean[];
  private readonly isUpperCase: boolean[];
  private readonly isWordSeparator: boolean[];
  private readonly toUpperCase: string[];
  private readonly toLowerCase: string[];
  private readonly myMeaningfulCharacters: string[];
  private readonly myMinNameLength: number;

  public constructor(pattern: string, options: MatchingCaseSensitivity, hardSeparators: string) {
    super();
    this.myOptions = options;
    this.myPattern = StringUtil.replace(pattern, ' ', '').split('');
    this.myHardSeparators = hardSeparators;
    this.isLowerCase = new Array(this.myPattern.length);
    this.isUpperCase = new Array(this.myPattern.length);
    this.isWordSeparator = new Array(this.myPattern.length);
    this.toUpperCase = new Array(this.myPattern.length);
    this.toLowerCase = new Array(this.myPattern.length);
    let meaningful = '';
    for (let k = 0; k < this.myPattern.length; k++) {
      const c = this.myPattern[k];
      this.isLowerCase[k] = c.toLowerCase() === c && c.toUpperCase() !== c;
      this.isUpperCase[k] = c.toUpperCase() === c && c.toLowerCase() !== c;
      this.isWordSeparator[k] = MinusculeMatcherImpl.isWordSeparator(c);
      this.toUpperCase[k] = c.toUpperCase();
      this.toLowerCase[k] = c.toLowerCase();
      if (!this.isWildcard(k)) {
        meaningful += this.toLowerCase[k];
        meaningful += this.toUpperCase[k];
      }
    }
    let i = 0;
    while (this.isWildcard(i)) i++;
    this.myHasHumps = this.hasFlag(i + 1, this.isUpperCase) && this.hasFlag(i, this.isLowerCase);
    this.myHasSeparators = this.hasFlag(i, this.isWordSeparator);
    this.myHasDots = this.hasDots(i);
    this.myMeaningfulCharacters = meaningful.split('');
    this.myMinNameLength = this.myMeaningfulCharacters.length / 2;
  }

  private static isWordSeparator(c: string): boolean {
    return /\s|_|-|:|\+/.test(c) || c === '.';
  }

  private static nextWord(name: string, start: number): number {
    if (start < name.length && /\p{N}/u.test(name.charAt(start))) {
      return start + 1; //treat each digit as a separate hump
    }
    return NameUtilCore.nextWord(name, start);
  }

  private hasFlag(start: number, flags: boolean[]): boolean {
    for (let i = start; i < this.myPattern.length; i++) {
      if (flags[i]) {
        return true;
      }
    }
    return false;
  }

  private hasDots(start: number): boolean {
    for (let i = start; i < this.myPattern.length; i++) {
      if (this.myPattern[i] === '.') {
        return true;
      }
    }
    return false;
  }

  private static prependRange(ranges: FList<TextRange>, from: number, length: number): FList<TextRange> {
    const head = ranges.getHead();
    if (head !== null && head.getStartOffset() === from + length) {
      return ranges.getTail()!.prepend(new TextRange(from, head.getEndOffset()));
    }
    return ranges.prepend(TextRange.create(from, from + length));
  }

  public matchingDegree(name: string, valueStartCaseMatch: boolean, fragments: FList<TextRange> | null): number {
    if (fragments === null) return Number.MIN_SAFE_INTEGER;
    if (fragments.isEmpty()) return 0;

    const first = fragments.getHead()!;
    const startMatch = first.getStartOffset() === 0;
    const valuedStartMatch = startMatch && valueStartCaseMatch;

    let matchingCase = 0;
    let p = -1;

    let skippedHumps = 0;
    let nextHumpStart = 0;
    let humpStartMatchedUpperCase = false;
    for (const range of fragments) {
      for (let i = range.getStartOffset(); i < range.getEndOffset(); i++) {
        const afterGap = i === range.getStartOffset() && first !== range;
        let isHumpStart = false;
        while (nextHumpStart <= i) {
          if (nextHumpStart === i) {
            isHumpStart = true;
          } else if (afterGap) {
            skippedHumps++;
          }
          nextHumpStart = MinusculeMatcherImpl.nextWord(name, nextHumpStart);
        }

        const c = name.charAt(i);
        p = this.myPattern.indexOf(c, p + 1);
        if (p < 0) {
          break;
        }

        if (isHumpStart) {
          humpStartMatchedUpperCase = c === this.myPattern[p] && this.isUpperCase[p];
        }

        matchingCase += this.evaluateCaseMatching(valuedStartMatch, p, humpStartMatchedUpperCase, i, afterGap, isHumpStart, c);
      }
    }

    const startIndex = first.getStartOffset();
    const afterSeparator = name.substring(0, startIndex).split('').some(c => this.myHardSeparators.includes(c));
    const wordStart = startIndex === 0 || (NameUtilCore.isWordStart(name, startIndex) && !NameUtilCore.isWordStart(name, startIndex - 1));
    const finalMatch = fragments.get(fragments.size() - 1).getEndOffset() === name.length;

    return (
      (wordStart ? 1000 : 0) +
      matchingCase -
      fragments.size() +
      -skippedHumps * 10 +
      (afterSeparator ? 0 : 2) +
      (startMatch ? 1 : 0) +
      (finalMatch ? 1 : 0)
    );
  }

  private evaluateCaseMatching(
    valuedStartMatch: boolean,
    patternIndex: number,
    humpStartMatchedUpperCase: boolean,
    nameIndex: number,
    afterGap: boolean,
    isHumpStart: boolean,
    nameChar: string
  ): number {
    if (afterGap && isHumpStart && this.isLowerCase[patternIndex]) {
      return -10; // disprefer when there's a hump but nothing in the pattern indicates the user meant it to be hump
    }
    if (nameChar === this.myPattern[patternIndex]) {
      if (this.isUpperCase[patternIndex]) return 50; // strongly prefer user's uppercase matching uppercase: they made an effort to press Shift
      if (nameIndex === 0 && valuedStartMatch) return 150; // the very first letter case distinguishes classes in Java etc
      if (isHumpStart) return 1; // if a lowercase matches lowercase hump start, that also means something
    } else if (isHumpStart) {
      // disfavor hump starts where pattern letter case doesn't match name case
      return -1;
    } else if (this.isLowerCase[patternIndex] && humpStartMatchedUpperCase) {
      // disfavor lowercase non-humps matching uppercase in the name
      return -1;
    }
    return 0;
  }

  public getPattern(): string {
    return this.myPattern.join('');
  }

  public matchingFragments(name: string): FList<TextRange> | null {
    if (name.length < this.myMinNameLength) {
      return null;
    }

    if (this.myPattern.length > MinusculeMatcherImpl.MAX_CAMEL_HUMP_MATCHING_LENGTH) {
      return this.matchBySubstring(name);
    }

    let patternIndex = 0;
    for (let i = 0; i < name.length && patternIndex < this.myMeaningfulCharacters.length; ++i) {
      const c = name.charAt(i);
      if (c === this.myMeaningfulCharacters[patternIndex] || c === this.myMeaningfulCharacters[patternIndex + 1]) {
        patternIndex += 2;
      }
    }
    if (patternIndex < this.myMinNameLength * 2) {
      return null;
    }
    const isAscii = AsciiUtils.isAscii(name);
    return this.matchWildcards(name, 0, 0, isAscii);
  }

  private matchBySubstring(name: string): FList<TextRange> | null {
    const infix = this.isPatternChar(0, '*');
    const patternWithoutWildChar = this.myPattern.filter(c => c !== '*').join('');
    if (name.length < patternWithoutWildChar.length) {
      return null;
    }
    if (infix) {
      const index = name.toLowerCase().indexOf(patternWithoutWildChar.toLowerCase());
      if (index >= 0) {
        return FList.singleton(TextRange.create(index, index + patternWithoutWildChar.length));
      }
      return null;
    }
    if (name.toLowerCase().startsWith(patternWithoutWildChar.toLowerCase())) {
      return FList.singleton(new TextRange(0, patternWithoutWildChar.length));
    }
    return null;
  }

  private matchWildcards(name: string, patternIndex: number, nameIndex: number, isAsciiName: boolean): FList<TextRange> | null {
    if (nameIndex < 0) {
      return null;
    }
    if (!this.isWildcard(patternIndex)) {
      if (patternIndex === this.myPattern.length) {
        return FList.empty();
      }
      return this.matchFragment(name, patternIndex, nameIndex, isAsciiName);
    }

    do {
      patternIndex++;
    } while (this.isWildcard(patternIndex));

    if (patternIndex === this.myPattern.length) {
      if (
        this.isTrailingSpacePattern() &&
        nameIndex !== name.length &&
        (patternIndex < 2 || !MinusculeMatcherImpl.isUpperCaseOrDigit(this.myPattern[patternIndex - 2]))
      ) {
        const spaceIndex = name.indexOf(' ', nameIndex);
        if (spaceIndex >= 0) {
          return FList.singleton(TextRange.create(spaceIndex, spaceIndex + 1));
        }
        return null;
      }
      return FList.empty();
    }

    return this.matchSkippingWords(
      name,
      patternIndex,
      this.findNextPatternCharOccurrence(name, nameIndex, patternIndex, isAsciiName),
      true,
      isAsciiName
    );
  }

  private isTrailingSpacePattern(): boolean {
    return this.isPatternChar(this.myPattern.length - 1, ' ');
  }

  private static isUpperCaseOrDigit(p: string): boolean {
    const charCode = p.charCodeAt(0);
    return (charCode >= 65 && charCode <= 90) || (charCode >= 48 && charCode <= 57);
  }

  private matchSkippingWords(
    name: string,
    patternIndex: number,
    nameIndex: number,
    allowSpecialChars: boolean,
    isAsciiName: boolean
  ): FList<TextRange> | null {
    let maxFoundLength = 0;
    while (nameIndex >= 0) {
      const fragmentLength = this.seemsLikeFragmentStart(name, patternIndex, nameIndex)
        ? this.maxMatchingFragment(name, patternIndex, nameIndex)
        : 0;

      if (fragmentLength > maxFoundLength || (nameIndex + fragmentLength === name.length && this.isTrailingSpacePattern())) {
        if (!this.isMiddleMatch(name, patternIndex, nameIndex)) {
          maxFoundLength = fragmentLength;
        }
        const ranges = this.matchInsideFragment(name, patternIndex, nameIndex, isAsciiName, fragmentLength);
        if (ranges !== null) {
          return ranges;
        }
      }
      const next = this.findNextPatternCharOccurrence(name, nameIndex + 1, patternIndex, isAsciiName);
      nameIndex = allowSpecialChars ? next : this.checkForSpecialChars(name, nameIndex + 1, next, patternIndex);
    }
    return null;
  }

  private findNextPatternCharOccurrence(name: string, startAt: number, patternIndex: number, isAsciiName: boolean): number {
    return !this.isPatternChar(patternIndex - 1, '*') && !this.isWordSeparator[patternIndex]
      ? this.indexOfWordStart(name, patternIndex, startAt, isAsciiName)
      : this.indexOfIgnoreCase(name, startAt, this.myPattern[patternIndex], patternIndex, isAsciiName);
  }

  private checkForSpecialChars(name: string, start: number, end: number, patternIndex: number): number {
    if (end < 0) return -1;

    if (!this.myHasSeparators && !this.myHasHumps && name.substring(start, end).split('').some(c => this.myHardSeparators.includes(c))) {
      return -1;
    }
    if (this.myHasDots && !this.isPatternChar(patternIndex - 1, '.') && name.substring(start, end).includes('.')) {
      return -1;
    }
    return end;
  }

  private seemsLikeFragmentStart(name: string, patternIndex: number, nextOccurrence: number): boolean {
    return (
      !this.isUpperCase[patternIndex] ||
      name.charAt(nextOccurrence).toUpperCase() === name.charAt(nextOccurrence) ||
      NameUtilCore.isWordStart(name, nextOccurrence) ||
      (!this.myHasHumps && this.myOptions !== MatchingCaseSensitivity.ALL)
    );
  }

  private charEquals(patternChar: string, patternIndex: number, c: string, isIgnoreCase: boolean): boolean {
    return (
      patternChar === c ||
      (isIgnoreCase && (this.toLowerCase[patternIndex] === c.toLowerCase() || this.toUpperCase[patternIndex] === c.toUpperCase()))
    );
  }

  private matchFragment(name: string, patternIndex: number, nameIndex: number, isAsciiName: boolean): FList<TextRange> | null {
    const fragmentLength = this.maxMatchingFragment(name, patternIndex, nameIndex);
    return fragmentLength === 0 ? null : this.matchInsideFragment(name, patternIndex, nameIndex, isAsciiName, fragmentLength);
  }

  private maxMatchingFragment(name: string, patternIndex: number, nameIndex: number): number {
    if (!this.isFirstCharMatching(name, nameIndex, patternIndex)) {
      return 0;
    }

    let i = 1;
    const ignoreCase = this.myOptions !== MatchingCaseSensitivity.ALL;
    while (nameIndex + i < name.length && patternIndex + i < this.myPattern.length) {
      const nameChar = name.charAt(nameIndex + i);
      if (!this.charEquals(this.myPattern[patternIndex + i], patternIndex + i, nameChar, ignoreCase)) {
        if (this.isSkippingDigitBetweenPatternDigits(patternIndex + i, nameChar)) {
          return 0;
        }
        break;
      }
      i++;
    }
    return i;
  }

  private isSkippingDigitBetweenPatternDigits(patternIndex: number, nameChar: string): boolean {
    return /\p{N}/u.test(this.myPattern[patternIndex]) && /\p{N}/u.test(this.myPattern[patternIndex - 1]) && /\p{N}/u.test(nameChar);
  }

  private matchInsideFragment(
    name: string,
    patternIndex: number,
    nameIndex: number,
    isAsciiName: boolean,
    fragmentLength: number
  ): FList<TextRange> | null {
    const minFragment = this.isMiddleMatch(name, patternIndex, nameIndex) ? 3 : 1;

    const camelHumpRanges = this.improveCamelHumps(name, patternIndex, nameIndex, isAsciiName, fragmentLength, minFragment);
    if (camelHumpRanges !== null) {
      return camelHumpRanges;
    }

    return this.findLongestMatchingPrefix(name, patternIndex, nameIndex, isAsciiName, fragmentLength, minFragment);
  }

  private isMiddleMatch(name: string, patternIndex: number, nameIndex: number): boolean {
    return (
      this.isPatternChar(patternIndex - 1, '*') &&
      !this.isWildcard(patternIndex + 1) &&
      /\p{L}|\p{N}/u.test(name.charAt(nameIndex)) &&
      !NameUtilCore.isWordStart(name, nameIndex)
    );
  }

  private findLongestMatchingPrefix(
    name: string,
    patternIndex: number,
    nameIndex: number,
    isAsciiName: boolean,
    fragmentLength: number,
    minFragment: number
  ): FList<TextRange> | null {
    if (patternIndex + fragmentLength >= this.myPattern.length) {
      return FList.singleton(TextRange.create(nameIndex, nameIndex + fragmentLength));
    }

    let i = fragmentLength;
    while (i >= minFragment || (i > 0 && this.isWildcard(patternIndex + i))) {
      let ranges: FList<TextRange> | null;
      if (this.isWildcard(patternIndex + i)) {
        ranges = this.matchWildcards(name, patternIndex + i, nameIndex + i, isAsciiName);
      } else {
        let nextOccurrence = this.findNextPatternCharOccurrence(name, nameIndex + i + 1, patternIndex + i, isAsciiName);
        nextOccurrence = this.checkForSpecialChars(name, nameIndex + i, nextOccurrence, patternIndex + i);
        if (nextOccurrence >= 0) {
          ranges = this.matchSkippingWords(name, patternIndex + i, nextOccurrence, false, isAsciiName);
        } else {
          ranges = null;
        }
      }
      if (ranges !== null) {
        return MinusculeMatcherImpl.prependRange(ranges, nameIndex, i);
      }
      i--;
    }
    return null;
  }

  private improveCamelHumps(
    name: string,
    patternIndex: number,
    nameIndex: number,
    isAsciiName: boolean,
    maxFragment: number,
    minFragment: number
  ): FList<TextRange> | null {
    for (let i = minFragment; i < maxFragment; i++) {
      if (this.isUppercasePatternVsLowercaseNameChar(name, patternIndex + i, nameIndex + i)) {
        const ranges = this.findUppercaseMatchFurther(name, patternIndex + i, nameIndex + i, isAsciiName);
        if (ranges !== null) {
          return MinusculeMatcherImpl.prependRange(ranges, nameIndex, i);
        }
      }
    }
    return null;
  }

  private isUppercasePatternVsLowercaseNameChar(name: string, patternIndex: number, nameIndex: number): boolean {
    return this.isUpperCase[patternIndex] && this.myPattern[patternIndex] !== name.charAt(nameIndex);
  }

  private findUppercaseMatchFurther(name: string, patternIndex: number, nameIndex: number, isAsciiName: boolean): FList<TextRange> | null {
    const nextWordStart = this.indexOfWordStart(name, patternIndex, nameIndex, isAsciiName);
    return this.matchWildcards(name, patternIndex, nextWordStart, isAsciiName);
  }

  private isFirstCharMatching(name: string, nameIndex: number, patternIndex: number): boolean {
    if (nameIndex >= name.length) return false;

    const ignoreCase = this.myOptions !== MatchingCaseSensitivity.ALL;
    const patternChar = this.myPattern[patternIndex];
    if (!this.charEquals(patternChar, patternIndex, name.charAt(nameIndex), ignoreCase)) return false;

    if (
      this.myOptions === MatchingCaseSensitivity.FIRST_LETTER &&
      (patternIndex === 0 || (patternIndex === 1 && this.isWildcard(0))) &&
      MinusculeMatcherImpl.hasCase(patternChar) &&
      (patternChar.toUpperCase() === patternChar) !== (name.charAt(0).toUpperCase() === name.charAt(0))
    ) {
      return false;
    }
    return true;
  }

  private static hasCase(patternChar: string): boolean {
    return patternChar.toUpperCase() !== patternChar.toLowerCase();
  }

  private isWildcard(patternIndex: number): boolean {
    if (patternIndex >= 0 && patternIndex < this.myPattern.length) {
      const pc = this.myPattern[patternIndex];
      return pc === ' ' || pc === '*';
    }
    return false;
  }

  private isPatternChar(patternIndex: number, c: string): boolean {
    return patternIndex >= 0 && patternIndex < this.myPattern.length && this.myPattern[patternIndex] === c;
  }

  private indexOfWordStart(name: string, patternIndex: number, startFrom: number, isAsciiName: boolean): number {
    const p = this.myPattern[patternIndex];
    if (startFrom >= name.length || (this.myHasHumps && this.isLowerCase[patternIndex] && !(patternIndex > 0 && this.isWordSeparator[patternIndex - 1]))) {
      return -1;
    }
    let i = startFrom;
    const isSpecialSymbol = !/\p{L}|\p{N}/u.test(p);
    while (true) {
      i = this.indexOfIgnoreCase(name, i, p, patternIndex, isAsciiName);
      if (i < 0) return -1;

      if (isSpecialSymbol || NameUtilCore.isWordStart(name, i)) return i;

      i++;
    }
  }

  private indexOfIgnoreCase(name: string, fromIndex: number, p: string, patternIndex: number, isAsciiName: boolean): number {
    if (isAsciiName && AsciiUtils.isAscii(p)) {
      const pUpper = this.toUpperCase[patternIndex];
      const pLower = this.toLowerCase[patternIndex];
      for (let i = fromIndex; i < name.length; i++) {
        const c = name.charAt(i);
        if (c === pUpper || c === pLower) {
          return i;
        }
      }
      return -1;
    }
    const nameLower = name.toLowerCase();
    const pLowerSingle = p.toLowerCase();
    return nameLower.indexOf(pLowerSingle, fromIndex);
  }

  public toString(): string {
    return `MinusculeMatcherImpl{myPattern=${this.myPattern.join('')}, myOptions=${this.myOptions}}`;
  }
}

export { MinusculeMatcherImpl };
