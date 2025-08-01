export class AsciiUtils {
  public static isAscii(string: string): boolean {
    for (let i = 0; i < string.length; ++i) {
      if (string.charCodeAt(i) >= 128) {
        return false;
      }
    }
    return true;
  }
}
