"use strict";
/**
 * Input validation utility for common field types
 * Validates email format, string length, phone numbers, and other text fields
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputValidator = void 0;
class InputValidator {
    /**
     * Validate email format
     * @param email Email address to validate
     * @returns { valid: boolean, errors: string[] }
     */
    static validateEmail(email) {
        const errors = [];
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
    static validateString(value, fieldName, minLength = 1, maxLength = 255) {
        const errors = [];
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
    static validatePhone(phone) {
        const errors = [];
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
    static validateUrl(url) {
        const errors = [];
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
    static sanitizeString(value) {
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
    static validateRequired(data, requiredFields) {
        const errors = [];
        for (const field of requiredFields) {
            if (!data[field] || (typeof data[field] === 'string' && data[field].trim().length === 0)) {
                errors.push(`${field} is required`);
            }
        }
        return { valid: errors.length === 0, errors };
    }
}
exports.InputValidator = InputValidator;
// Email regex pattern (RFC 5322 simplified)
InputValidator.EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Phone number: digits, spaces, hyphens, parentheses, plus sign
InputValidator.PHONE_REGEX = /^[+\d\s\-()]{7,20}$/;
// URL pattern
InputValidator.URL_REGEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
exports.default = InputValidator;
//# sourceMappingURL=inputValidator.js.map