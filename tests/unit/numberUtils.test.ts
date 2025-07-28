import { formatToThreeDecimals } from '../../src/background/numberUtils';

describe('Number Utils', () => {
  describe('formatToThreeDecimals', () => {
    test('should format number with many decimal places to 3 decimal places', () => {
      const result = formatToThreeDecimals(1753733729.771483);
      expect(result).toBe(1753733729.771);
    });

    test('should leave whole numbers unchanged', () => {
      const result = formatToThreeDecimals(1753733729);
      expect(result).toBe(1753733729);
    });

    test('should leave numbers with fewer than 3 decimal places unchanged', () => {
      expect(formatToThreeDecimals(123.4)).toBe(123.4);
      expect(formatToThreeDecimals(123.45)).toBe(123.45);
    });

    test('should round numbers with more than 3 decimal places', () => {
      expect(formatToThreeDecimals(123.456789)).toBe(123.457);
      expect(formatToThreeDecimals(123.4564)).toBe(123.456);
      expect(formatToThreeDecimals(123.4565)).toBe(123.457);
    });

    test('should handle small decimal numbers', () => {
      expect(formatToThreeDecimals(0.1)).toBe(0.1);
      expect(formatToThreeDecimals(0.123456)).toBe(0.123);
    });

    test('should handle zero', () => {
      expect(formatToThreeDecimals(0)).toBe(0);
      expect(formatToThreeDecimals(0.0)).toBe(0);
    });

    test('should handle negative numbers', () => {
      expect(formatToThreeDecimals(-123.456789)).toBe(-123.457);
      expect(formatToThreeDecimals(-123)).toBe(-123);
      expect(formatToThreeDecimals(-0.1)).toBe(-0.1);
    });

    test('should handle very small numbers', () => {
      expect(formatToThreeDecimals(0.000123456)).toBe(0.000);
      expect(formatToThreeDecimals(0.001234)).toBe(0.001);
    });
  });
}); 