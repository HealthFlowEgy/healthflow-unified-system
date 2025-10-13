/**
 * Validation Utilities
 * Comprehensive validation functions for data validation
 */

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validators = {
  /**
   * Validate email address
   */
  email(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate Egyptian phone number
   */
  egyptianPhone(phone: string): boolean {
    const phoneRegex = /^(\+20|0)?1[0125]\d{8}$/;
    return phoneRegex.test(phone);
  },

  /**
   * Validate password strength
   */
  password(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

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

    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate Egyptian national ID
   */
  egyptianNationalId(id: string): boolean {
    // Egyptian national ID is 14 digits
    if (!/^\d{14}$/.test(id)) {
      return false;
    }

    // Extract century, year, month, day
    const century = parseInt(id.substring(0, 1));
    const year = parseInt(id.substring(1, 3));
    const month = parseInt(id.substring(3, 5));
    const day = parseInt(id.substring(5, 7));

    // Validate month
    if (month < 1 || month > 12) {
      return false;
    }

    // Validate day
    if (day < 1 || day > 31) {
      return false;
    }

    return true;
  },

  /**
   * Validate date range
   */
  dateRange(startDate: Date, endDate: Date): boolean {
    return startDate <= endDate;
  },

  /**
   * Validate age
   */
  age(birthDate: Date, minAge: number, maxAge?: number): boolean {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ? age - 1
      : age;

    if (actualAge < minAge) {
      return false;
    }

    if (maxAge && actualAge > maxAge) {
      return false;
    }

    return true;
  },

  /**
   * Validate URL
   */
  url(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate UUID
   */
  uuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  /**
   * Validate credit card number (Luhn algorithm)
   */
  creditCard(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');

    if (digits.length < 13 || digits.length > 19) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  },

  /**
   * Validate file size
   */
  fileSize(size: number, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return size <= maxSizeBytes;
  },

  /**
   * Validate file type
   */
  fileType(filename: string, allowedTypes: string[]): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? allowedTypes.includes(extension) : false;
  },

  /**
   * Validate JSON string
   */
  json(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate IP address
   */
  ipAddress(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;

    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.');
      return parts.every(part => parseInt(part) <= 255);
    }

    return ipv6Regex.test(ip);
  },

  /**
   * Validate MAC address
   */
  macAddress(mac: string): boolean {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
  },

  /**
   * Validate hex color
   */
  hexColor(color: string): boolean {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  },

  /**
   * Validate postal code (Egypt)
   */
  egyptianPostalCode(code: string): boolean {
    const postalRegex = /^\d{5}$/;
    return postalRegex.test(code);
  },

  /**
   * Validate time format (HH:MM)
   */
  time(time: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
  },

  /**
   * Validate date format (YYYY-MM-DD)
   */
  date(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return false;
    }

    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }
};

/**
 * Sanitization utilities
 */
export const sanitizers = {
  /**
   * Sanitize string (remove HTML tags and special characters)
   */
  string(str: string): string {
    return str
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"]/g, '') // Remove special characters
      .trim();
  },

  /**
   * Sanitize email
   */
  email(email: string): string {
    return email.toLowerCase().trim();
  },

  /**
   * Sanitize phone number
   */
  phone(phone: string): string {
    return phone.replace(/\D/g, '');
  },

  /**
   * Sanitize filename
   */
  filename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  },

  /**
   * Sanitize URL
   */
  url(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.toString();
    } catch {
      return '';
    }
  }
};

/**
 * Validation schemas
 */
export const schemas = {
  user: {
    email: (email: string) => {
      if (!validators.email(email)) {
        throw new ValidationError('Invalid email address', 'email', 'INVALID_EMAIL');
      }
    },
    password: (password: string) => {
      const result = validators.password(password);
      if (!result.valid) {
        throw new ValidationError(result.errors.join(', '), 'password', 'WEAK_PASSWORD');
      }
    },
    phone: (phone: string) => {
      if (!validators.egyptianPhone(phone)) {
        throw new ValidationError('Invalid Egyptian phone number', 'phone', 'INVALID_PHONE');
      }
    },
    nationalId: (id: string) => {
      if (!validators.egyptianNationalId(id)) {
        throw new ValidationError('Invalid Egyptian national ID', 'nationalId', 'INVALID_NATIONAL_ID');
      }
    }
  },

  appointment: {
    date: (date: string) => {
      if (!validators.date(date)) {
        throw new ValidationError('Invalid date format', 'date', 'INVALID_DATE');
      }

      const appointmentDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (appointmentDate < today) {
        throw new ValidationError('Appointment date cannot be in the past', 'date', 'PAST_DATE');
      }
    },
    time: (time: string) => {
      if (!validators.time(time)) {
        throw new ValidationError('Invalid time format (use HH:MM)', 'time', 'INVALID_TIME');
      }
    }
  },

  file: {
    size: (size: number, maxSizeMB: number = 10) => {
      if (!validators.fileSize(size, maxSizeMB)) {
        throw new ValidationError(
          `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
          'file',
          'FILE_TOO_LARGE'
        );
      }
    },
    type: (filename: string, allowedTypes: string[]) => {
      if (!validators.fileType(filename, allowedTypes)) {
        throw new ValidationError(
          `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
          'file',
          'INVALID_FILE_TYPE'
        );
      }
    }
  }
};

/**
 * Validate object against schema
 */
export function validate<T>(data: any, schema: Record<string, (value: any) => void>): T {
  for (const [key, validator] of Object.entries(schema)) {
    if (data[key] !== undefined) {
      validator(data[key]);
    }
  }
  return data as T;
}
