import { NameUtilCore } from '../utils/NameUtilCore';

describe('NameUtilCore', () => {
  describe('nameToWords', () => {
    it('should split camel case names', () => {
      expect(NameUtilCore.nameToWords('CamelCaseName')).toEqual(['Camel', 'Case', 'Name']);
    });

    it('should split snake case names', () => {
      expect(NameUtilCore.nameToWords('snake_case_name')).toEqual(['snake', 'case', 'name']);
    });

    it('should handle single word names', () => {
      expect(NameUtilCore.nameToWords('name')).toEqual(['name']);
    });

    it('should handle names with digits', () => {
      expect(NameUtilCore.nameToWords('Name123')).toEqual(['Name', '123']);
    });
  });

  describe('splitNameIntoWords', () => {
    it('should split camel case names', () => {
      expect(NameUtilCore.splitNameIntoWords('CamelCaseName')).toEqual(['Camel', 'Case', 'Name']);
    });

    it('should split snake case names', () => {
      expect(NameUtilCore.splitNameIntoWords('snake_case_name')).toEqual(['snake', 'case', 'name']);
    });

    it('should handle single word names', () => {
      expect(NameUtilCore.splitNameIntoWords('name')).toEqual(['name']);
    });

    it('should handle names with digits', () => {
      expect(NameUtilCore.splitNameIntoWords('Name123')).toEqual(['Name', '123']);
    });
  });
});
