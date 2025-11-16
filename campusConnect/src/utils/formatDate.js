import moment from 'moment';

export const formatDate = (date, format = 'MMM DD, YYYY') => {
  if (!date) return '';
  return moment(date).format(format);
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return moment(date).format('MMM DD, YYYY hh:mm A');
};

export const formatTime = (date) => {
  if (!date) return '';
  return moment(date).format('hh:mm A');
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  return moment(date).fromNow();
};

export const isToday = (date) => {
  if (!date) return false;
  return moment(date).isSame(moment(), 'day');
};

export const isYesterday = (date) => {
  if (!date) return false;
  return moment(date).isSame(moment().subtract(1, 'day'), 'day');
};

export const formatChatTime = (date) => {
  if (!date) return '';
  
  if (isToday(date)) {
    return moment(date).format('hh:mm A');
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else if (moment(date).isAfter(moment().subtract(7, 'days'))) {
    return moment(date).format('ddd');
  } else {
    return moment(date).format('MMM DD');
  }
};

export const getTimeAgo = (date) => {
  if (!date) return '';
  
  const now = moment();
  const then = moment(date);
  const diffMinutes = now.diff(then, 'minutes');
  const diffHours = now.diff(then, 'hours');
  const diffDays = now.diff(then, 'days');
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(date);
};

export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  
  const start = moment(startDate);
  const end = moment(endDate);
  
  if (start.isSame(end, 'day')) {
    return formatDate(startDate);
  }
  
  if (start.isSame(end, 'month')) {
    return `${start.format('MMM DD')} - ${end.format('DD, YYYY')}`;
  }
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};
