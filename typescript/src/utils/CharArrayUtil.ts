export class CharArrayUtil {
  public static shiftForward(text: string, start: number, chars: string): number {
    let i = start;
    while (i < text.length && chars.indexOf(text.charAt(i)) !== -1) {
      i++;
    }
    return i;
  }
}
