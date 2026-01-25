/**
 * Phone number masking utility for Uzbekistan numbers (+998)
 * Format: +998 XX XXX XX XX
 */

// Default phone prefix for Uzbekistan
export const PHONE_PREFIX = '+998';

/**
 * Format phone number with Uzbekistan mask
 * Input: raw digits or partial phone
 * Output: formatted as +998 XX XXX XX XX
 */
export const formatPhoneNumber = (value) => {
    if (!value) return PHONE_PREFIX;

    // Remove all non-digit characters except the leading +
    let digits = value.replace(/[^\d]/g, '');

    // If starts with 998, remove it (we'll add the prefix)
    if (digits.startsWith('998')) {
        digits = digits.slice(3);
    }

    // Limit to 9 digits after country code
    digits = digits.slice(0, 9);

    // Build formatted string
    let formatted = PHONE_PREFIX;

    if (digits.length > 0) {
        formatted += ' ' + digits.slice(0, 2); // XX
    }
    if (digits.length > 2) {
        formatted += ' ' + digits.slice(2, 5); // XXX
    }
    if (digits.length > 5) {
        formatted += ' ' + digits.slice(5, 7); // XX
    }
    if (digits.length > 7) {
        formatted += ' ' + digits.slice(7, 9); // XX
    }

    return formatted;
};

/**
 * Get raw phone number (just digits with country code)
 * For API submission
 */
export const getRawPhoneNumber = (formattedPhone) => {
    if (!formattedPhone) return '';
    const digits = formattedPhone.replace(/[^\d]/g, '');
    // Ensure it starts with 998
    if (digits.startsWith('998')) {
        return '+' + digits;
    }
    return '+998' + digits;
};

/**
 * Handle phone input change - maintains mask while user types
 */
export const handlePhoneChange = (e, currentValue, setFormValue) => {
    const input = e.target;
    const newValue = input.value;

    // Prevent deleting the prefix
    if (newValue.length < PHONE_PREFIX.length) {
        setFormValue(PHONE_PREFIX);
        return;
    }

    // Format the new value
    const formatted = formatPhoneNumber(newValue);
    setFormValue(formatted);
};

/**
 * Validate if phone number is complete (9 digits after country code)
 */
export const isValidPhone = (phone) => {
    if (!phone) return false;
    const digits = phone.replace(/[^\d]/g, '');
    // Full Uzbekistan number: 998 + 9 digits = 12 digits
    return digits.length === 12 && digits.startsWith('998');
};
