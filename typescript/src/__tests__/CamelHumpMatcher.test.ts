import { CamelHumpMatcher } from '../CamelHumpMatcher';
import { LookupElement } from '../matchers/LookupElement';

describe('CamelHumpMatcher', () => {
  it('should match simple prefixes', () => {
    const matcher = new CamelHumpMatcher('Ca');
    expect(matcher.doPrefixMatches('CamelCase')).toBe(true);
  });

  it('should match camel case humps', () => {
    const matcher = new CamelHumpMatcher('CC');
    expect(matcher.doPrefixMatches('CamelCase')).toBe(true);
  });

  it('should not match if the prefix is not a prefix', () => {
    const matcher = new CamelHumpMatcher('Case');
    expect(matcher.doPrefixMatches('CamelCase')).toBe(false);
  });

  it('should handle lookup elements', () => {
    const matcher = new CamelHumpMatcher('CC');
    const element: LookupElement = {
      getAllLookupStrings: () => ['CamelCase'],
      isCaseSensitive: () => false,
    };
    expect(matcher.prefixMatches(element)).toBe(true);
  });
});
