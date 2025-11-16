export const ROLES = {
  CENTRAL_ADMIN: 'centralAdmin',
  LOCAL_ADMIN: 'localAdmin',
  FACULTY: 'faculty',
  STUDENT: 'student',
};

export const ROLE_LABELS = {
  [ROLES.CENTRAL_ADMIN]: 'Central Admin',
  [ROLES.LOCAL_ADMIN]: 'Local Admin',
  [ROLES.FACULTY]: 'Faculty',
  [ROLES.STUDENT]: 'Student',
};

export const ROLE_PERMISSIONS = {
  [ROLES.CENTRAL_ADMIN]: [
    'manage_admins',
    'manage_departments',
    'manage_users',
    'create_global_notices',
    'view_analytics',
    'manage_system_settings',
  ],
  [ROLES.LOCAL_ADMIN]: [
    'manage_faculty',
    'manage_students',
    'create_department_notices',
    'view_department_analytics',
    'manage_classes',
  ],
  [ROLES.FACULTY]: [
    'create_notices',
    'manage_own_notices',
    'view_class_list',
    'participate_in_chats',
    'manage_assignments',
  ],
  [ROLES.STUDENT]: [
    'view_notices',
    'acknowledge_notices',
    'participate_in_chats',
    'view_profile',
    'provide_feedback',
  ],
};

export const hasPermission = (userRole, permission) => {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
};

export const isAdmin = (role) => {
  return role === ROLES.CENTRAL_ADMIN || role === ROLES.LOCAL_ADMIN;
};

export const isCentralAdmin = (role) => {
  return role === ROLES.CENTRAL_ADMIN;
};

export const isLocalAdmin = (role) => {
  return role === ROLES.LOCAL_ADMIN;
};

export const isFaculty = (role) => {
  return role === ROLES.FACULTY;
};

export const isStudent = (role) => {
  return role === ROLES.STUDENT;
};
