/**
 * Password validation utility
 * Enforces password policy requirements
 */

/**
 * Validates a password against the security policy
 * @param {string} password - The password to validate
 * @returns {object} - { isValid: boolean, message: string }
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password is required.'
    };
  }

  // Check for empty or whitespace-only passwords
  if (!password.trim()) {
    return {
      isValid: false,
      message: 'Password cannot be empty or contain only whitespace.'
    };
  }

  // Check minimum length (8 characters)
  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long.'
    };
  }

  // Check maximum length (128 characters)
  if (password.length > 128) {
    return {
      isValid: false,
      message: 'Password must not exceed 128 characters.'
    };
  }

  return {
    isValid: true,
    message: 'Password is valid.'
  };
}

module.exports = {
  validatePassword
};
