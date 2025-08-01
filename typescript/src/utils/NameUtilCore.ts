import { StringUtil } from './StringUtil';

export class NameUtilCore {
  public static splitNameIntoWords(name: string): string[] {
    const underlineDelimited = name.split('_');
    const result: string[] = [];
    for (const word of underlineDelimited) {
      this.addAllWords(word, result);
    }
    return result;
  }

  private static addAllWords(text: string, result: string[]): void {
    let start = 0;
    while (start < text.length) {
      const next = this.nextWord(text, start);
      result.push(text.substring(start, next));
      start = next;
    }
  }

  public static nextWord(text: string, start: number): number {
    if (start >= text.length) {
      return start;
    }

    const ch = text.codePointAt(start)!;
    const chLen = ch > 0xffff ? 2 : 1;

    if (!/\p{L}|\p{N}/u.test(String.fromCodePoint(ch))) {
      return start + chLen;
    }

    let i = start;
    while (i < text.length) {
      const codePoint = text.codePointAt(i)!;
      if (!/\p{N}/u.test(String.fromCodePoint(codePoint))) break;
      i += codePoint > 0xffff ? 2 : 1;
    }
    if (i > start) {
      return i;
    }

    while (i < text.length) {
      const codePoint = text.codePointAt(i)!;
      if (!/\p{Lu}/u.test(String.fromCodePoint(codePoint))) break;
      i += codePoint > 0xffff ? 2 : 1;
    }

    if (i > start + chLen) {
      if (i === text.length || !/\p{L}/u.test(String.fromCodePoint(text.codePointAt(i)!))) {
        return i;
      }
      const codePoint = text.codePointBefore(i)!;
      return i - (codePoint > 0xffff ? 2 : 1);
    }

    if (i === start) i += chLen;
    while (i < text.length) {
      const codePoint = text.codePointAt(i)!;
      if (!/\p{L}/u.test(String.fromCodePoint(codePoint)) || this.isWordStart(text, i)) break;
      i += codePoint > 0xffff ? 2 : 1;
    }
    return i;
  }

  public static isWordStart(text: string, i: number): boolean {
    const cur = text.codePointAt(i)!;
    const prev = i > 0 ? text.codePointBefore(i) : -1;

    if (prev === -1) return true;

    if (/\p{Lu}/u.test(String.fromCodePoint(cur))) {
      if (/\p{Lu}/u.test(String.fromCodePoint(prev!))) {
        const nextPos = i + (cur > 0xffff ? 2 : 1);
        return nextPos < text.length && /\p{Ll}/u.test(String.fromCodePoint(text.codePointAt(nextPos)!));
      }
      return true;
    }
    if (/\p{N}/u.test(String.fromCodePoint(cur))) {
      return true;
    }
    if (!/\p{L}/u.test(String.fromCodePoint(cur))) {
      return false;
    }
    if (/\p{Ideographic}/u.test(String.fromCodePoint(cur))) {
      return true;
    }
    return i === 0 || !/\p{L}|\p{N}/u.test(String.fromCodePoint(prev!));
  }

  public static nameToWords(name: string): string[] {
    const array: string[] = [];
    let index = 0;

    while (index < name.length) {
      const wordStart = index;
      let upperCaseCount = 0;
      let lowerCaseCount = 0;
      let digitCount = 0;
      let specialCount = 0;
      while (index < name.length) {
        const c = name.charAt(index);
        if (/\p{N}/u.test(c)) {
          if (upperCaseCount > 0 || lowerCaseCount > 0 || specialCount > 0) break;
          digitCount++;
        } else if (/\p{Lu}/u.test(c)) {
          if (lowerCaseCount > 0 || digitCount > 0 || specialCount > 0) break;
          upperCaseCount++;
        } else if (/\p{Ll}/u.test(c)) {
          if (digitCount > 0 || specialCount > 0) break;
          if (upperCaseCount > 1) {
            index--;
            break;
          }
          lowerCaseCount++;
        } else {
          if (upperCaseCount > 0 || lowerCaseCount > 0 || digitCount > 0) break;
          specialCount++;
        }
        index++;
      }
      const word = name.substring(wordStart, index);
      if (!StringUtil.isEmptyOrSpaces(word)) {
        array.push(word);
      }
    }
    return array;
  }
}
