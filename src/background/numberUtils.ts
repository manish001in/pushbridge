/**
 * Number utilities for Pushbridge
 * Handles number formatting and conversion operations
 */

/**
 * Format a number to exactly 3 decimal places
 * If the number has no decimal part, it returns the original number
 * If the number has decimal places, it formats to exactly 3 decimal places
 * 
 * @param value - The number to format
 * @returns The formatted number with 3 decimal places if it has decimals, otherwise the original number
 * 
 * @example
 * formatToThreeDecimals(1753733729.771483) // returns 1753733729.771
 * formatToThreeDecimals(1753733729) // returns 1753733729
 * formatToThreeDecimals(123.4) // returns 123.400
 */
export function formatToThreeDecimals(value: number): number {
  // Check if the number has decimal places
  if (value % 1 === 0) {
    // No decimal places, return as is
    return value;
  }
  
  // Has decimal places, format to 3 decimal places
  return parseFloat(value.toFixed(3));
} 