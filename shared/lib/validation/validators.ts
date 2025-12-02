/**
 * Shared validation utilities for HealthFlow
 * These validators ensure consistent validation across all services
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email) {
    errors.push('Email is required');
    return { valid: false, errors };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
    return { valid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common weak passwords
  const weakPasswords = ['password', '12345678', 'qwerty', 'abc123'];
  if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
    errors.push('Password is too common or weak');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate Egyptian national ID
 * Format: 14 digits
 */
export function validateNationalId(nationalId: string): ValidationResult {
  const errors: string[] = [];

  if (!nationalId) {
    errors.push('National ID is required');
    return { valid: false, errors };
  }

  if (!/^\d{14}$/.test(nationalId)) {
    errors.push('National ID must be exactly 14 digits');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate Egyptian phone number
 * Format: +20 followed by 10 digits, or 01 followed by 9 digits
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  const errors: string[] = [];

  if (!phone) {
    errors.push('Phone number is required');
    return { valid: false, errors };
  }

  const internationalFormat = /^\+20\d{10}$/;
  const localFormat = /^01\d{9}$/;

  if (!internationalFormat.test(phone) && !localFormat.test(phone)) {
    errors.push('Invalid Egyptian phone number format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate license number (for doctors and pharmacists)
 */
export function validateLicenseNumber(license: string, type: 'doctor' | 'pharmacist'): ValidationResult {
  const errors: string[] = [];

  if (!license) {
    errors.push('License number is required');
    return { valid: false, errors };
  }

  const prefix = type === 'doctor' ? 'DOC' : 'PHARM';
  const regex = new RegExp(`^${prefix}-\\d{6,10}$`);

  if (!regex.test(license)) {
    errors.push(`Invalid ${type} license format. Expected format: ${prefix}-XXXXXX`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate medication dosage
 */
export function validateDosage(dosage: string): ValidationResult {
  const errors: string[] = [];

  if (!dosage) {
    errors.push('Dosage is required');
    return { valid: false, errors };
  }

  // Common dosage formats: "500mg", "2.5ml", "1 tablet"
  const dosageRegex = /^\d+(\.\d+)?\s*(mg|ml|g|mcg|tablet|capsule|unit)s?$/i;

  if (!dosageRegex.test(dosage)) {
    errors.push('Invalid dosage format. Examples: "500mg", "2.5ml", "1 tablet"');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate prescription duration
 */
export function validateDuration(duration: string): ValidationResult {
  const errors: string[] = [];

  if (!duration) {
    errors.push('Duration is required');
    return { valid: false, errors };
  }

  // Format: "30 days", "2 weeks", "3 months"
  const durationRegex = /^\d+\s+(day|week|month)s?$/i;

  if (!durationRegex.test(duration)) {
    errors.push('Invalid duration format. Examples: "30 days", "2 weeks", "3 months"');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate date format (ISO 8601)
 */
export function validateDate(date: string): ValidationResult {
  const errors: string[] = [];

  if (!date) {
    errors.push('Date is required');
    return { valid: false, errors };
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    errors.push('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize user input
 */
export function validateAndSanitize(input: string, maxLength: number = 1000): ValidationResult {
  const errors: string[] = [];

  if (!input) {
    errors.push('Input is required');
    return { valid: false, errors };
  }

  if (input.length > maxLength) {
    errors.push(`Input exceeds maximum length of ${maxLength} characters`);
  }

  // Check for potentially malicious patterns
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe/i,
    /eval\(/i
  ];

  for (const pattern of maliciousPatterns) {
    if (pattern.test(input)) {
      errors.push('Input contains potentially malicious content');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
