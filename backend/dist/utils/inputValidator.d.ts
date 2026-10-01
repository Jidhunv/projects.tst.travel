/**
 * Input validation utility for common field types
 * Validates email format, string length, phone numbers, and other text fields
 */
export declare class InputValidator {
    private static readonly EMAIL_REGEX;
    private static readonly PHONE_REGEX;
    private static readonly URL_REGEX;
    /**
     * Validate email format
     * @param email Email address to validate
     * @returns { valid: boolean, errors: string[] }
     */
    static validateEmail(email: string): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Validate string length and content
     * @param value String to validate
     * @param fieldName Field name for error messages
     * @param minLength Minimum length (default: 1)
     * @param maxLength Maximum length (default: 255)
     * @returns { valid: boolean, errors: string[] }
     */
    static validateString(value: string | undefined, fieldName: string, minLength?: number, maxLength?: number): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Validate phone number format
     * @param phone Phone number to validate
     * @returns { valid: boolean, errors: string[] }
     */
    static validatePhone(phone: string | undefined): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Validate URL format
     * @param url URL to validate
     * @returns { valid: boolean, errors: string[] }
     */
    static validateUrl(url: string | undefined): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Sanitize string input (trim and remove dangerous characters)
     * @param value String to sanitize
     * @returns Sanitized string
     */
    static sanitizeString(value: string): string;
    /**
     * Validate all required fields are present
     * @param data Object containing fields to validate
     * @param requiredFields Array of field names that must be present
     * @returns { valid: boolean, errors: string[] }
     */
    static validateRequired(data: Record<string, any>, requiredFields: string[]): {
        valid: boolean;
        errors: string[];
    };
}
export default InputValidator;
//# sourceMappingURL=inputValidator.d.ts.map