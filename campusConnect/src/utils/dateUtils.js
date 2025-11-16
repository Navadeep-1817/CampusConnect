import moment from 'moment';

export const formatDate = (date) => {
  if (!date) return '';
  return moment(date).format('MMM DD, YYYY');
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

export const isExpired = (date) => {
  if (!date) return false;
  return moment(date).isBefore(moment());
};

export const getRemainingDays = (date) => {
  if (!date) return null;
  return moment(date).diff(moment(), 'days');
};
