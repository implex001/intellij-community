export class StringUtil {
  public static replace(text: string, oldChar: string, newChar: string): string {
    return text.split(oldChar).join(newChar);
  }

  public static startsWithIgnoreCase(str: string, prefix: string): boolean {
    return str.toLowerCase().startsWith(prefix.toLowerCase());
  }

  public static toLowerCase(str: string): string {
    return str.toLowerCase();
  }

  public static toUpperCase(str: string): string {
    return str.toUpperCase();
  }

  public static endsWithChar(str: string, char: string): boolean {
    return str.endsWith(char);
  }

  public static pluralize(str: string): string {
    if (str.endsWith('y')) {
      return str.substring(0, str.length - 1) + 'ies';
    }
    if (str.endsWith('s')) {
      return str + 'es';
    }
    return str + 's';
  }

  public static capitalize(str: string): string {
    if (str.length === 0) {
      return str;
    }
    return str.charAt(0).toUpperCase() + str.substring(1);
  }

  public static isEmptyOrSpaces(str: string | null | undefined): boolean {
    return str === null || str === undefined || str.trim().length === 0;
  }
}
