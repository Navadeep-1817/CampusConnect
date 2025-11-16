export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validatePhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

export const validateRequired = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

export const validateLength = (value, min, max) => {
  if (typeof value !== 'string') return false;
  const length = value.trim().length;
  return length >= min && (max ? length <= max : true);
};

export const validateURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateFileSize = (file, maxSizeMB = 5) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

export const validateFileType = (file, allowedTypes = []) => {
  if (allowedTypes.length === 0) return true;
  return allowedTypes.some(type => file.type.includes(type));
};

export const getPasswordStrength = (password) => {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z\d]/.test(password)) strength++;
  
  if (strength <= 2) return { score: strength, label: 'Weak', color: 'red' };
  if (strength === 3) return { score: strength, label: 'Medium', color: 'yellow' };
  return { score: strength, label: 'Strong', color: 'green' };
};

export const validateForm = (formData, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach((field) => {
    const value = formData[field];
    const fieldRules = rules[field];
    
    if (fieldRules.required && !validateRequired(value)) {
      errors[field] = fieldRules.requiredMessage || `${field} is required`;
      return;
    }
    
    if (fieldRules.email && value && !validateEmail(value)) {
      errors[field] = fieldRules.emailMessage || 'Invalid email format';
      return;
    }
    
    if (fieldRules.password && value && !validatePassword(value)) {
      errors[field] = fieldRules.passwordMessage || 'Password must be at least 8 characters with uppercase, lowercase, and number';
      return;
    }
    
    if (fieldRules.phone && value && !validatePhone(value)) {
      errors[field] = fieldRules.phoneMessage || 'Invalid phone number';
      return;
    }
    
    if (fieldRules.minLength && value && !validateLength(value, fieldRules.minLength)) {
      errors[field] = `${field} must be at least ${fieldRules.minLength} characters`;
      return;
    }
    
    if (fieldRules.maxLength && value && !validateLength(value, 0, fieldRules.maxLength)) {
      errors[field] = `${field} must not exceed ${fieldRules.maxLength} characters`;
      return;
    }
    
    if (fieldRules.custom && value) {
      const customError = fieldRules.custom(value);
      if (customError) {
        errors[field] = customError;
      }
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
