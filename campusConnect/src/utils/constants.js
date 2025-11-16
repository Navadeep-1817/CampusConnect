export const ROLES = {
  CENTRAL_ADMIN: 'central_admin',
  LOCAL_ADMIN: 'local_admin',
  FACULTY: 'faculty',
  STUDENT: 'student'
};

export const NOTICE_CATEGORIES = [
  'Academic',
  'Events',
  'Exams',
  'Circulars',
  'Others'
];

export const NOTICE_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' }
];

export const NOTICE_VISIBILITY = [
  { value: 'global', label: 'Global (University-wide)', icon: '🌍', audience: 'Everyone' },
  { value: 'department', label: 'Department', icon: '🏢', audience: 'Department Users' },
  { value: 'batch', label: 'Year/Batch', icon: '🎓', audience: 'Students' },
  { value: 'class', label: 'Specific Class', icon: '📚', audience: 'Students' },
  { value: 'faculty_global', label: 'All Faculty', icon: '👨‍🏫', audience: 'Faculty' },
  { value: 'faculty_department', label: 'Faculty in Department', icon: '👨‍🏫', audience: 'Faculty' },
  { value: 'admin_global', label: 'All Admins', icon: '👔', audience: 'Admins' },
  { value: 'admin_department', label: 'Admins in Department', icon: '👔', audience: 'Admins' }
];

export const getVisibilityLabel = (visibility) => {
  const visibilityMap = {
    global: { label: '🌍 Everyone', color: 'text-purple-600 bg-purple-100' },
    department: { label: '🏢 Department', color: 'text-blue-600 bg-blue-100' },
    batch: { label: '🎓 Year/Batch', color: 'text-green-600 bg-green-100' },
    class: { label: '📚 Specific Class', color: 'text-teal-600 bg-teal-100' },
    faculty_global: { label: '👨‍🏫 All Faculty', color: 'text-indigo-600 bg-indigo-100' },
    faculty_department: { label: '👨‍🏫 Faculty (Dept)', color: 'text-indigo-600 bg-indigo-100' },
    admin_global: { label: '👔 All Admins', color: 'text-pink-600 bg-pink-100' },
    admin_department: { label: '👔 Admins (Dept)', color: 'text-pink-600 bg-pink-100' }
  };
  return visibilityMap[visibility] || { label: visibility, color: 'text-gray-600 bg-gray-100' };
};

export const CHAT_ROOM_TYPES = {
  DEPARTMENT: 'department',
  CLASS: 'class',
  PRIVATE: 'private'
};

export const ALLOWED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif']
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const YEARS = [1, 2, 3, 4];

export const getRoleLabel = (role) => {
  const labels = {
    central_admin: 'Central Admin',
    local_admin: 'Local Admin (DEO)',
    faculty: 'Faculty',
    student: 'Student'
  };
  return labels[role] || role;
};

export const getPriorityColor = (priority) => {
  const colors = {
    low: 'text-gray-600 bg-gray-100',
    medium: 'text-blue-600 bg-blue-100',
    high: 'text-orange-600 bg-orange-100',
    urgent: 'text-red-600 bg-red-100'
  };
  return colors[priority] || colors.medium;
};

export const getCategoryColor = (category) => {
  const colors = {
    Academic: 'text-purple-600 bg-purple-100',
    Events: 'text-green-600 bg-green-100',
    Exams: 'text-red-600 bg-red-100',
    Circulars: 'text-blue-600 bg-blue-100',
    Others: 'text-gray-600 bg-gray-100'
  };
  return colors[category] || colors.Others;
};

export const canCreateNotice = (role) => {
  return [ROLES.CENTRAL_ADMIN, ROLES.LOCAL_ADMIN, ROLES.FACULTY].includes(role);
};

export const canManageUsers = (role) => {
  return [ROLES.CENTRAL_ADMIN, ROLES.LOCAL_ADMIN].includes(role);
};

export const canManageDepartments = (role) => {
  return role === ROLES.CENTRAL_ADMIN;
};

export const canDeleteMessage = (role, message, userId, moderators) => {
  const isSender = message.sender._id === userId;
  const isModerator = moderators?.some(mod => mod._id === userId);
  return isSender || isModerator;
};
