import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { noticeAPI } from '../../api/noticeAPI';

// Async thunks
export const fetchNotices = createAsyncThunk(
  'notice/fetchNotices',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await noticeAPI.getAllNotices(filters);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch notices');
    }
  }
);

export const fetchNoticeById = createAsyncThunk(
  'notice/fetchNoticeById',
  async (noticeId, { rejectWithValue }) => {
    try {
      const response = await noticeAPI.getNoticeById(noticeId);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch notice');
    }
  }
);

export const createNotice = createAsyncThunk(
  'notice/createNotice',
  async (noticeData, { rejectWithValue }) => {
    try {
      const response = await noticeAPI.createNotice(noticeData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create notice');
    }
  }
);

export const updateNotice = createAsyncThunk(
  'notice/updateNotice',
  async ({ noticeId, noticeData }, { rejectWithValue }) => {
    try {
      const response = await noticeAPI.updateNotice(noticeId, noticeData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update notice');
    }
  }
);

export const deleteNotice = createAsyncThunk(
  'notice/deleteNotice',
  async (noticeId, { rejectWithValue }) => {
    try {
      await noticeAPI.deleteNotice(noticeId);
      return noticeId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete notice');
    }
  }
);

export const markNoticeAsRead = createAsyncThunk(
  'notice/markAsRead',
  async (noticeId, { rejectWithValue }) => {
    try {
      const response = await noticeAPI.markAsRead(noticeId);
      return { noticeId, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark as read');
    }
  }
);

const initialState = {
  notices: [],
  selectedNotice: null,
  loading: false,
  error: null,
  filters: {
    category: '',
    department: '',
    search: '',
    dateRange: null,
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
};

const noticeSlice = createSlice({
  name: 'notice',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearSelectedNotice: (state) => {
      state.selectedNotice = null;
    },
    addNewNotice: (state, action) => {
      state.notices.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Notices
      .addCase(fetchNotices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotices.fulfilled, (state, action) => {
        state.loading = false;
        state.notices = action.payload.notices || action.payload;
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(fetchNotices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Notice By ID
      .addCase(fetchNoticeById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNoticeById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedNotice = action.payload.notice || action.payload;
      })
      .addCase(fetchNoticeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Notice
      .addCase(createNotice.pending, (state) => {
        state.loading = true;
      })
      .addCase(createNotice.fulfilled, (state, action) => {
        state.loading = false;
        state.notices.unshift(action.payload.notice || action.payload);
      })
      .addCase(createNotice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Notice
      .addCase(updateNotice.fulfilled, (state, action) => {
        const updatedNotice = action.payload.notice || action.payload;
        const index = state.notices.findIndex((n) => n._id === updatedNotice._id);
        if (index !== -1) {
          state.notices[index] = updatedNotice;
        }
      })
      // Delete Notice
      .addCase(deleteNotice.fulfilled, (state, action) => {
        state.notices = state.notices.filter((n) => n._id !== action.payload);
      })
      // Mark as Read
      .addCase(markNoticeAsRead.fulfilled, (state, action) => {
        const index = state.notices.findIndex((n) => n._id === action.payload.noticeId);
        if (index !== -1) {
          state.notices[index].isRead = true;
        }
      });
  },
});

export const { clearError, setFilters, setPagination, clearSelectedNotice, addNewNotice } = noticeSlice.actions;
export default noticeSlice.reducer;
