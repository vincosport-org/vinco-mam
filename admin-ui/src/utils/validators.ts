/**
 * Validation utility functions
 */

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isRequired(value: any): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
}

export function minLength(value: string, min: number): boolean {
  return value.length >= min;
}

export function maxLength(value: string, max: number): boolean {
  return value.length <= max;
}

export function isNumber(value: any): boolean {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

export function isPositiveNumber(value: number): boolean {
  return isNumber(value.toString()) && value > 0;
}

export function isValidDate(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d instanceof Date && !isNaN(d.getTime());
}
