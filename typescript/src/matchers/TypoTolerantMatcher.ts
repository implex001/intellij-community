import { TextRange } from '../utils/TextRange';
import { FList } from '../utils/FList';
import { NameUtilCore } from '../utils/NameUtilCore';
import { MinusculeMatcher } from './MinusculeMatcher';
import { MatchingCaseSensitivity } from '../utils/NameUtil';
import { StringUtil } from '../utils/StringUtil';
import { AsciiUtils } from '../utils/AsciiUtils';

class TypoTolerantMatcher extends MinusculeMatcher {
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
      this.isWordSeparator[k] = TypoTolerantMatcher.isWordSeparator(c);
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

  private static nextWord(name: string, start: number, isAsciiName: boolean): number {
    if (start < name.length && /\p{N}/u.test(name.charAt(start))) {
      return start + 1; //treat each digit as a separate hump
    }
    // For simplicity, we'll just use the unicode-aware version
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

  public matchingDegree(name: string, valueStartCaseMatch: boolean, fragments: FList<TextRange> | null): number {
    if (fragments === null) return Number.MIN_SAFE_INTEGER;
    if (fragments.isEmpty()) return 0;

    const first = fragments.getHead()!;
    const startMatch = first.getStartOffset() === 0;
    const valuedStartMatch = startMatch && valueStartCaseMatch;

    let errors = 0;
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
          nextHumpStart = TypoTolerantMatcher.nextWord(name, nextHumpStart, false);
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

      errors += 2000.0 * Math.pow((range as Range).getErrorCount() / range.getLength(), 2);
    }

    const startIndex = first.getStartOffset();
    const afterSeparator = name.substring(0, startIndex).split('').some(c => this.myHardSeparators.includes(c));
    const wordStart = startIndex === 0 || (NameUtilCore.isWordStart(name, startIndex) && !NameUtilCore.isWordStart(name, startIndex - 1));
    const finalMatch = fragments.get(fragments.size() - 1).getEndOffset() === name.length;

    return (
      (wordStart ? 1000 : 0) +
      matchingCase -
      fragments.size() +
      -skippedHumps * 10 -
      errors +
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
      return -10;
    }
    if (nameChar === this.myPattern[patternIndex]) {
      if (this.isUpperCase[patternIndex]) return 50;
      if (nameIndex === 0 && valuedStartMatch) return 150;
      if (isHumpStart) return 1;
    } else if (isHumpStart) {
      return -1;
    } else if (this.isLowerCase[patternIndex] && humpStartMatchedUpperCase) {
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
    const ascii = AsciiUtils.isAscii(name);
    let ranges = new Session(this, name, false, ascii).matchingFragments();
    if (ranges !== null) return ranges;

    return new Session(this, name, true, ascii).matchingFragments();
  }

  private isWildcard(patternIndex: number): boolean {
    if (patternIndex >= 0 && patternIndex < this.myPattern.length) {
      const pc = this.myPattern[patternIndex];
      return pc === ' ' || pc === '*';
    }
    return false;
  }

  public toString(): string {
    return `TypoTolerantMatcher{myPattern=${this.myPattern.join('')}, myOptions=${this.myOptions}}`;
  }
}

class Session {
  constructor(
    private readonly matcher: TypoTolerantMatcher,
    private readonly myName: string,
    private readonly myTypoAware: boolean,
    private readonly isAsciiName: boolean
  ) {}

  private get myAllowTypos(): boolean {
    return this.myTypoAware && this.isAsciiName;
  }

  public matchingFragments(): FList<TextRange> | null {
    const length = this.myName.length;
    if (length < (this.matcher as any).myMinNameLength) {
      return null;
    }

    if (this.myTypoAware && !this.isAsciiName) return null;

    if (!this.myTypoAware) {
      let patternIndex = 0;
      if ((this.matcher as any).myMeaningfulCharacters.length > 0) {
        for (let i = 0; i < length; ++i) {
          const c = this.myName.charAt(i);
          if (c === (this.matcher as any).myMeaningfulCharacters[patternIndex] || c === (this.matcher as any).myMeaningfulCharacters[patternIndex + 1]) {
            patternIndex += 2;
            if (patternIndex >= (this.matcher as any).myMeaningfulCharacters.length) {
              break;
            }
          }
        }
      }
      if (patternIndex < (this.matcher as any).myMinNameLength * 2) {
        return null;
      }
    }

    return this.matchWildcards(0, 0, new ErrorState());
  }

  private matchWildcards(patternIndex: number, nameIndex: number, errorState: ErrorState): FList<TextRange> | null {
    if (nameIndex < 0) {
      return null;
    }
    if (!this.isWildcard(patternIndex)) {
      if (patternIndex === this.patternLength(errorState)) {
        return FList.empty();
      }
      return this.matchFragment(patternIndex, nameIndex, errorState);
    }

    do {
      patternIndex++;
    } while (this.isWildcard(patternIndex));

    if (patternIndex === this.patternLength(errorState)) {
      if (
        this.isTrailingSpacePattern(errorState) &&
        nameIndex !== this.myName.length &&
        (patternIndex < 2 || !Session.isUpperCaseOrDigit(this.charAt(patternIndex - 2, errorState)))
      ) {
        const spaceIndex = this.myName.indexOf(' ', nameIndex);
        if (spaceIndex >= 0) {
          return FList.singleton(new Range(spaceIndex, spaceIndex + 1, 0));
        }
        return null;
      }
      return FList.empty();
    }

    const ranges = this.matchFragment(patternIndex, nameIndex, errorState);
    if (ranges !== null) {
      return ranges;
    }

    return this.matchSkippingWords(patternIndex, nameIndex, true, errorState);
  }

  private matchFragment(patternIndex: number, nameIndex: number, errorState: ErrorState): FList<TextRange> | null {
    const fragment = this.maxMatchingFragment(patternIndex, nameIndex, errorState);
    return fragment === null ? null : this.matchInsideFragment(patternIndex, nameIndex, fragment);
  }

  private maxMatchingFragment(patternIndex: number, nameIndex: number, baseErrorState: ErrorState): Fragment | null {
    const errorState = baseErrorState.deriveFrom(patternIndex);

    if (!this.isFirstCharMatching(nameIndex, patternIndex, errorState)) {
      return null;
    }

    let i = 1;
    const ignoreCase = (this.matcher as any).myOptions !== MatchingCaseSensitivity.ALL;
    while (nameIndex + i < this.myName.length && patternIndex + i < this.patternLength(errorState)) {
      if (!this.charEquals(patternIndex + i, nameIndex + i, ignoreCase, true, errorState)) {
        if (/\p{N}/u.test(this.charAt(patternIndex + i, errorState)) && /\p{N}/u.test(this.charAt(patternIndex + i - 1, errorState))) {
          return null;
        }
        break;
      }
      i++;
    }
    return new Fragment(i, errorState);
  }

  private matchInsideFragment(patternIndex: number, nameIndex: number, fragment: Fragment): FList<TextRange> | null {
    const minFragment = this.isMiddleMatch(patternIndex, nameIndex, fragment.getErrorState()) ? 3 : 1;

    const camelHumpRanges = this.improveCamelHumps(patternIndex, nameIndex, fragment.getLength(), minFragment, fragment.getErrorState());
    if (camelHumpRanges !== null) {
      return camelHumpRanges;
    }

    return this.findLongestMatchingPrefix(patternIndex, nameIndex, fragment.getLength(), minFragment, fragment.getErrorState());
  }

  private findLongestMatchingPrefix(
    patternIndex: number,
    nameIndex: number,
    fragmentLength: number,
    minFragment: number,
    errorState: ErrorState
  ): FList<TextRange> | null {
    if (patternIndex + fragmentLength >= this.patternLength(errorState)) {
      const errors = errorState.countErrors(patternIndex, patternIndex + fragmentLength);
      if (errors === fragmentLength) return null;
      return FList.singleton(new Range(nameIndex, nameIndex + fragmentLength, errors));
    }

    for (let i = fragmentLength; i >= minFragment || this.isWildcard(patternIndex + i); i--) {
      const derivedErrorState = errorState.deriveFrom(patternIndex + i);
      let ranges: FList<TextRange> | null;
      if (this.isWildcard(patternIndex + i)) {
        ranges = this.matchWildcards(patternIndex + i, nameIndex + i, derivedErrorState);
      } else {
        ranges = this.matchSkippingWords(patternIndex + i, nameIndex + i, false, derivedErrorState);
      }

      if (ranges !== null) {
        const errors = errorState.countErrors(patternIndex, patternIndex + i);
        if (errors === i) return null;
        return Session.prependRange(ranges, new Range(nameIndex, nameIndex + i, errors));
      }
    }
    return null;
  }

  private improveCamelHumps(
    patternIndex: number,
    nameIndex: number,
    maxFragment: number,
    minFragment: number,
    errorState: ErrorState
  ): FList<TextRange> | null {
    for (let i = minFragment; i < maxFragment; i++) {
      if (this.isUppercasePatternVsLowercaseNameChar(patternIndex + i, nameIndex + i, errorState)) {
        const ranges = this.findUppercaseMatchFurther(patternIndex + i, nameIndex + i, errorState.deriveFrom(patternIndex + i));
        if (ranges !== null) {
          const errors = errorState.countErrors(patternIndex, patternIndex + i);
          if (errors === i) return null;
          return Session.prependRange(ranges, new Range(nameIndex, nameIndex + i, errors));
        }
      }
    }
    return null;
  }

  private findUppercaseMatchFurther(patternIndex: number, nameIndex: number, errorState: ErrorState): FList<TextRange> | null {
    const nextWordStart = this.indexOfWordStart(patternIndex, nameIndex, errorState);
    return this.matchWildcards(patternIndex, nextWordStart, errorState.deriveFrom(patternIndex));
  }

  private indexOfWordStart(patternIndex: number, startFrom: number, errorState: ErrorState): number {
    if (
      startFrom >= this.myName.length ||
      ((this.matcher as any).myHasHumps &&
        this.isLowerCase(patternIndex, errorState) &&
        !(patternIndex > 0 && this.isWordSeparator(patternIndex - 1, errorState)))
    ) {
      return -1;
    }
    let nextWordStart = startFrom;
    while (true) {
      nextWordStart = NameUtilCore.nextWord(this.myName, nextWordStart);
      if (nextWordStart >= this.myName.length) {
        return -1;
      }
      if (this.charEquals(patternIndex, nextWordStart, true, true, errorState)) {
        return nextWordStart;
      }
    }
  }

  private matchSkippingWords(patternIndex: number, nameIndex: number, allowSpecialChars: boolean, errorState: ErrorState): FList<TextRange> | null {
    const wordStartsOnly = !this.isPatternChar(patternIndex - 1, '*', errorState) && !this.isWordSeparator(patternIndex, errorState);

    let maxFoundLength = 0;
    while (true) {
      nameIndex = this.findNextPatternCharOccurrence(nameIndex, patternIndex, allowSpecialChars, wordStartsOnly, errorState);
      if (nameIndex < 0) {
        return null;
      }
      const fragment = this.seemsLikeFragmentStart(patternIndex, nameIndex, errorState)
        ? this.maxMatchingFragment(patternIndex, nameIndex, errorState)
        : null;
      if (fragment === null) continue;

      const fragmentLength = fragment.getLength();
      if (fragmentLength > maxFoundLength || (nameIndex + fragmentLength === this.myName.length && this.isTrailingSpacePattern(errorState))) {
        if (!this.isMiddleMatch(patternIndex, nameIndex, errorState)) {
          maxFoundLength = fragmentLength;
        }
        const ranges = this.matchInsideFragment(patternIndex, nameIndex, fragment);
        if (ranges !== null) {
          return ranges;
        }
      }
    }
  }

  private findNextPatternCharOccurrence(
    startAt: number,
    patternIndex: number,
    allowSpecialChars: boolean,
    wordStartsOnly: boolean,
    errorState: ErrorState
  ): number {
    const next = wordStartsOnly
      ? this.indexOfWordStart(patternIndex, startAt, errorState)
      : this.indexOfIgnoreCase(startAt + 1, patternIndex, errorState);

    if (
      !allowSpecialChars &&
      !(this.matcher as any).myHasSeparators &&
      !(this.matcher as any).myHasHumps &&
      this.myName.substring(startAt, next).split('').some(c => (this.matcher as any).myHardSeparators.includes(c))
    ) {
      return -1;
    }

    if (
      !allowSpecialChars &&
      (this.matcher as any).myHasDots &&
      !this.isPatternChar(patternIndex - 1, '.', errorState) &&
      this.myName.substring(startAt, next).includes('.')
    ) {
      return -1;
    }

    return next;
  }

  private indexOfIgnoreCase(fromIndex: number, patternIndex: number, errorState: ErrorState): number {
    const p = this.charAt(patternIndex, errorState);
    if (this.isAsciiName && AsciiUtils.isAscii(p)) {
      const i = this.indexIgnoringCaseAscii(fromIndex, p);
      if (i !== -1) return i;

      if (this.myAllowTypos) {
        const leftMiss = this.indexIgnoringCaseAscii(fromIndex, Session.leftMiss(p));
        if (leftMiss !== -1) return leftMiss;

        const rightMiss = this.indexIgnoringCaseAscii(fromIndex, Session.rightMiss(p));
        if (rightMiss !== -1) return rightMiss;
      }

      return -1;
    }
    const nameLower = this.myName.toLowerCase();
    const pLowerSingle = p.toLowerCase();
    return nameLower.indexOf(pLowerSingle, fromIndex);
  }

  private indexIgnoringCaseAscii(fromIndex: number, p: string): number {
    if (p === '') return -1;
    const pUpper = p.toUpperCase();
    const pLower = p.toLowerCase();
    for (let i = fromIndex; i < this.myName.length; i++) {
      const c = this.myName.charAt(i);
      if (c === p || c === pUpper || c === pLower) {
        return i;
      }
    }
    return -1;
  }

  private seemsLikeFragmentStart(patternIndex: number, nextOccurrence: number, errorState: ErrorState): boolean {
    return (
      !this.isUpperCase(patternIndex, errorState) ||
      this.myName.charAt(nextOccurrence).toUpperCase() === this.myName.charAt(nextOccurrence) ||
      NameUtilCore.isWordStart(this.myName, nextOccurrence) ||
      (!(this.matcher as any).myHasHumps && (this.matcher as any).myOptions !== MatchingCaseSensitivity.ALL)
    );
  }

  private isFirstCharMatching(nameIndex: number, patternIndex: number, errorState: ErrorState): boolean {
    if (nameIndex >= this.myName.length) return false;

    const ignoreCase = (this.matcher as any).myOptions !== MatchingCaseSensitivity.ALL;
    if (!this.charEquals(patternIndex, nameIndex, ignoreCase, true, errorState)) return false;

    const patternChar = this.charAt(patternIndex, errorState);

    if (
      (this.matcher as any).myOptions === MatchingCaseSensitivity.FIRST_LETTER &&
      (patternIndex === 0 || (patternIndex === 1 && this.isWildcard(0))) &&
      Session.hasCase(patternChar) &&
      (patternChar.toUpperCase() === patternChar) !== (this.myName.charAt(0).toUpperCase() === this.myName.charAt(0))
    ) {
      return false;
    }
    return true;
  }

  private charEquals(patternIndex: number, nameIndex: number, isIgnoreCase: boolean, allowTypos: boolean, errorState: ErrorState): boolean {
    const patternChar = this.charAt(patternIndex, errorState);
    const nameChar = this.myName.charAt(nameIndex);
    const length = this.myName.length;

    if (patternChar === nameChar || (isIgnoreCase && this.equalsIgnoreCase(patternIndex, errorState, nameChar))) {
      return true;
    }

    if (!this.myAllowTypos || !allowTypos) return false;

    if (errorState.countErrors(0, patternIndex) > 0) return false;
    const prevError = errorState.getError(patternIndex - 1);
    if (prevError instanceof SwapError) {
      return false;
    }

    const leftMiss = Session.leftMiss(patternChar);
    if (leftMiss !== '') {
      if (leftMiss === nameChar || (isIgnoreCase && (leftMiss.toLowerCase() === nameChar || leftMiss.toUpperCase() === nameChar))) {
        errorState.addError(patternIndex, new TypoError(leftMiss));
        return true;
      }
    }

    const rightMiss = Session.rightMiss(patternChar);
    if (rightMiss !== '') {
      if (rightMiss === nameChar || (isIgnoreCase && (rightMiss.toLowerCase() === nameChar || rightMiss.toUpperCase() === nameChar))) {
        errorState.addError(patternIndex, new TypoError(rightMiss));
        return true;
      }
    }

    if (this.patternLength(errorState) > patternIndex + 1 && length > nameIndex + 1) {
      const nextNameChar = this.myName.charAt(nameIndex + 1);
      const nextPatternChar = this.charAt(patternIndex + 1, errorState);

      if (
        (patternChar === nextNameChar || (isIgnoreCase && this.equalsIgnoreCase(patternIndex, errorState, nextNameChar))) &&
        (nextPatternChar === nameChar || (isIgnoreCase && this.equalsIgnoreCase(patternIndex + 1, errorState, nameChar)))
      ) {
        errorState.addError(patternIndex, SwapError.instance);
        return true;
      }
    }

    if (length > nameIndex + 1) {
      const nextNameChar = this.myName.charAt(nameIndex + 1);

      if (patternChar === nextNameChar || (isIgnoreCase && this.equalsIgnoreCase(patternIndex, errorState, nextNameChar))) {
        errorState.addError(patternIndex, new MissError(nameChar));
        return true;
      }
    }

    return false;
  }

  private isWildcard(patternIndex: number): boolean {
    if (patternIndex >= 0 && patternIndex < (this.matcher as any).myPattern.length) {
      const pc = (this.matcher as any).myPattern[patternIndex];
      return pc === ' ' || pc === '*';
    }
    return false;
  }

  private isTrailingSpacePattern(errorState: ErrorState): boolean {
    return this.isPatternChar(this.patternLength(errorState) - 1, ' ', errorState);
  }

  private static isUpperCaseOrDigit(p: string): boolean {
    const charCode = p.charCodeAt(0);
    return (charCode >= 65 && charCode <= 90) || (charCode >= 48 && charCode <= 57);
  }

  private isMiddleMatch(patternIndex: number, nameIndex: number, errorState: ErrorState): boolean {
    return (
      this.isPatternChar(patternIndex - 1, '*', errorState) &&
      !this.isWildcard(patternIndex + 1) &&
      /\p{L}|\p{N}/u.test(this.myName.charAt(nameIndex)) &&
      !NameUtilCore.isWordStart(this.myName, nameIndex)
    );
  }

  private isUppercasePatternVsLowercaseNameChar(patternIndex: number, nameIndex: number, errorState: ErrorState): boolean {
    return this.isUpperCase(patternIndex, errorState) && !this.charEquals(patternIndex, nameIndex, false, false, errorState);
  }

  private static hasCase(patternChar: string): boolean {
    return patternChar.toUpperCase() !== patternChar.toLowerCase();
  }

  private isPatternChar(patternIndex: number, c: string, errorState: ErrorState): boolean {
    return patternIndex >= 0 && patternIndex < this.patternLength(errorState) && this.charAt(patternIndex, errorState) === c;
  }

  private charAt(i: number, errorState: ErrorState): string {
    return errorState.affects(i) ? errorState.getChar((this.matcher as any).myPattern, i) : (this.matcher as any).myPattern[i];
  }

  private equalsIgnoreCase(patternIndex: number, errorState: ErrorState, nameChar: string): boolean {
    if (errorState.affects(patternIndex)) {
      const patternChar = errorState.getChar((this.matcher as any).myPattern, patternIndex);
      return patternChar.toLowerCase() === nameChar || patternChar.toUpperCase() === nameChar;
    }
    return (this.matcher as any).toLowerCase[patternIndex] === nameChar || (this.matcher as any).toUpperCase[patternIndex] === nameChar;
  }

  private isLowerCase(i: number, errorState: ErrorState): boolean {
    return errorState.affects(i) ? AsciiUtils.isAscii(errorState.getChar((this.matcher as any).myPattern, i)) : (this.matcher as any).isLowerCase[i];
  }

  private isUpperCase(i: number, errorState: ErrorState): boolean {
    return errorState.affects(i) ? AsciiUtils.isAscii(errorState.getChar((this.matcher as any).myPattern, i)) : (this.matcher as any).isUpperCase[i];
  }

  private isWordSeparator(i: number, errorState: ErrorState): boolean {
    return errorState.affects(i)
      ? TypoTolerantMatcher.isWordSeparator(errorState.getChar((this.matcher as any).myPattern, i))
      : (this.matcher as any).isWordSeparator[i];
  }

  private patternLength(errorState: ErrorState): number {
    return errorState.length((this.matcher as any).myPattern);
  }

  private static readonly keyboard: string[][] = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ];

  private static leftMiss(aChar: string): string {
    const isUpperCase = aChar.toUpperCase() === aChar;
    const lc = isUpperCase ? aChar.toLowerCase() : aChar;

    for (const line of Session.keyboard) {
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (c === lc) {
          if (j > 0) {
            return isUpperCase ? line[j - 1].toUpperCase() : line[j - 1];
          } else {
            return '';
          }
        }
      }
    }
    return '';
  }

  private static rightMiss(aChar: string): string {
    const isUpperCase = aChar.toUpperCase() === aChar;
    const lc = isUpperCase ? aChar.toLowerCase() : aChar;

    for (const line of Session.keyboard) {
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (c === lc) {
          if (j + 1 < line.length) {
            return isUpperCase ? line[j + 1].toUpperCase() : line[j + 1];
          } else {
            return '';
          }
        }
      }
    }
    return '';
  }

  private static prependRange(ranges: FList<TextRange>, range: Range): FList<TextRange> {
    const head = ranges.getHead() as Range;
    if (head !== null && head.getStartOffset() === range.getEndOffset()) {
      return (ranges.getTail() as FList<TextRange>).prepend(
        new Range(range.getStartOffset(), head.getEndOffset(), range.getErrorCount() + head.getErrorCount())
      );
    }
    return ranges.prepend(range);
  }
}

class ErrorState {
  private readonly myBase: ErrorState | null;
  private readonly myDeriveIndex: number;

  private myAffected: Set<number> = new Set();
  private myAllAffectedAfter = Number.MAX_SAFE_INTEGER;
  private myErrors: { index: number; error: Error }[] = [];

  private myPattern: string[] | null = null;

  constructor(base: ErrorState | null = null, deriveIndex = 0) {
    this.myBase = base;
    this.myDeriveIndex = deriveIndex;
  }

  public deriveFrom(index: number): ErrorState {
    return new ErrorState(this, index);
  }

  public addError(index: number, error: Error): void {
    const errorWithIndex = { index, error };
    this.myErrors.push(errorWithIndex);
    this.updateAffected(index, error);

    if (this.myPattern !== null) {
      this.myPattern = this.applyError(this.myPattern, errorWithIndex);
    }
  }

  private updateAffected(index: number, error: Error): void {
    this.myAffected.add(index);
    if (error instanceof SwapError) {
      this.myAffected.add(index + 1);
    } else if (error instanceof MissError) {
      this.myAllAffectedAfter = Math.min(index, this.myAllAffectedAfter);
    }
  }

  public countErrors(start: number, end: number): number {
    let errors = 0;
    if (this.myBase !== null && start < this.myDeriveIndex) {
      errors += this.myBase.countErrors(start, this.myDeriveIndex);
    }

    for (const error of this.myErrors) {
      if (start <= error.index && error.index < end) {
        errors++;
      }
    }

    return errors;
  }

  public getChar(pattern: string[], index: number): string {
    if (this.myPattern === null) {
      this.myPattern = this.applyErrors([...pattern], Number.MAX_SAFE_INTEGER);
    }

    return this.myPattern[index];
  }

  private applyErrors(pattern: string[], upToIndex: number): string[] {
    if (this.myBase !== null) {
      pattern = this.myBase.applyErrors(pattern, Math.min(this.myDeriveIndex, upToIndex));
    }

    for (const error of this.myErrors) {
      if (error.index < upToIndex) {
        pattern = this.applyError(pattern, error);
      }
    }

    return pattern;
  }

  private applyError(pattern: string[], error: { index: number; error: Error }): string[] {
    if (error.error instanceof TypoError) {
      pattern[error.index] = error.error.correctChar;
      return pattern;
    } else if (error.error instanceof SwapError) {
      const index = error.index;
      const c = pattern[index];
      pattern[index] = pattern[index + 1];
      pattern[index + 1] = c;
      return pattern;
    } else if (error.error instanceof MissError) {
      pattern.splice(error.index, 0, error.error.missedChar);
      return pattern;
    }

    return pattern;
  }

  public affects(index: number): boolean {
    return this.localAffects(index) || (this.myBase !== null && this.myBase.affects(index));
  }

  private localAffects(index: number): boolean {
    return index >= this.myAllAffectedAfter || this.myAffected.has(index);
  }

  public getError(i: number): Error | null {
    if (this.myAffected.has(i)) {
      for (const error of this.myErrors) {
        if (error.index === i) return error.error;
      }
    }

    if (this.myBase !== null && this.myDeriveIndex > i) {
      return this.myBase.getError(i);
    }

    return null;
  }

  private numMisses(end: number): number {
    let numMisses = 0;
    for (const error of this.myErrors) {
      if (error.index < end && error.error instanceof MissError) {
        numMisses++;
      }
    }
    return numMisses + (this.myBase === null ? 0 : this.myBase.numMisses(this.myDeriveIndex));
  }

  public length(pattern: string[]): number {
    if (this.myPattern !== null) {
      return this.myPattern.length;
    }
    return pattern.length + this.numMisses(Number.MAX_SAFE_INTEGER);
  }
}

interface Error {}

class TypoError implements Error {
  constructor(public readonly correctChar: string) {}
}

class SwapError implements Error {
  public static readonly instance = new SwapError();
  private constructor() {}
}

class MissError implements Error {
  constructor(public readonly missedChar: string) {}
}

class Fragment {
  constructor(private readonly myLength: number, private readonly myErrorState: ErrorState) {}

  public getLength(): number {
    return this.myLength;
  }

  public getErrorState(): ErrorState {
    return this.myErrorState;
  }
}

class Range extends TextRange {
  constructor(startOffset: number, endOffset: number, private readonly myErrorCount: number) {
    super(startOffset, endOffset);
  }

  public getErrorCount(): number {
    return this.myErrorCount;
  }

  public shiftRight(delta: number): Range {
    if (delta === 0) return this;
    return new Range(this.getStartOffset() + delta, this.getEndOffset() + delta, this.getErrorCount());
  }
}

export { TypoTolerantMatcher };
