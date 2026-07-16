/**
 * Input validation utility for common field types
 * Validates email format, string length, phone numbers, and other text fields
 */

export class InputValidator {
  // Email regex pattern (RFC 5322 simplified)
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Phone number: digits, spaces, hyphens, parentheses, plus sign
  private static readonly PHONE_REGEX = /^[+\d\s\-()]{7,20}$/;

  // URL pattern
  private static readonly URL_REGEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

  /**
   * Validate email format
   * @param email Email address to validate
   * @returns { valid: boolean, errors: string[] }
   */
  static validateEmail(email: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
      return { valid: false, errors };
    }

    if (email.length > 254) {
      errors.push('Email must be less than 254 characters');
    }

    if (!this.EMAIL_REGEX.test(email)) {
      errors.push('Email format is invalid');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate string length and content
   * @param value String to validate
   * @param fieldName Field name for error messages
   * @param minLength Minimum length (default: 1)
   * @param maxLength Maximum length (default: 255)
   * @returns { valid: boolean, errors: string[] }
   */
  static validateString(
    value: string | undefined,
    fieldName: string,
    minLength: number = 1,
    maxLength: number = 255
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!value || value.trim().length === 0) {
      errors.push(`${fieldName} is required`);
      return { valid: false, errors };
    }

    if (value.length < minLength) {
      errors.push(`${fieldName} must be at least ${minLength} characters`);
    }

    if (value.length > maxLength) {
      errors.push(`${fieldName} must be less than ${maxLength} characters`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate phone number format
   * @param phone Phone number to validate
   * @returns { valid: boolean, errors: string[] }
   */
  static validatePhone(phone: string | undefined): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!phone || phone.trim().length === 0) {
      return { valid: true, errors }; // Phone is optional
    }

    if (!this.PHONE_REGEX.test(phone)) {
      errors.push('Phone number format is invalid (use digits, spaces, hyphens, or parentheses)');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate URL format
   * @param url URL to validate
   * @returns { valid: boolean, errors: string[] }
   */
  static validateUrl(url: string | undefined): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!url || url.trim().length === 0) {
      return { valid: true, errors }; // URL is optional
    }

    if (!this.URL_REGEX.test(url)) {
      errors.push('Website URL format is invalid');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Sanitize string input (trim and remove dangerous characters)
   * @param value String to sanitize
   * @returns Sanitized string
   */
  static sanitizeString(value: string): string {
    return value
      .trim()
      .replace(/[<>"/]/g, '') // Remove HTML-like characters
      .slice(0, 255); // Cap at 255 characters
  }

  /**
   * Validate all required fields are present
   * @param data Object containing fields to validate
   * @param requiredFields Array of field names that must be present
   * @returns { valid: boolean, errors: string[] }
   */
  static validateRequired(
    data: Record<string, any>,
    requiredFields: string[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim().length === 0)) {
        errors.push(`${field} is required`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export default InputValidator;
