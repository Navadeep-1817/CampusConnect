import { useState, useEffect } from 'react';
import { FaTimes, FaUsers, FaBuilding } from 'react-icons/fa';
import { chatAPI } from '../../api/chatAPI';
import { departmentAPI, userAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const CreateChatRoomModal = ({ isOpen, onClose, onRoomCreated }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'department',
    department: '',
    year: '',
    batch: '',
    participants: [],
    targetAudience: 'all' // 'all', 'faculty', 'students', 'deo', 'faculty-deo', 'custom'
  });

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      // Set department for local admin
      if (user?.role === 'local_admin' && user?.department) {
        setFormData(prev => ({
          ...prev,
          department: user.department._id || user.department
        }));
      }
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (formData.type === 'private-group') {
      fetchAllUsers();
    } else if (formData.department && (formData.type === 'private' || formData.targetAudience === 'custom')) {
      fetchUsers();
    }
  }, [formData.department, formData.type, formData.targetAudience]);

  const fetchDepartments = async () => {
    try {
      const response = await departmentAPI.getDepartments();
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      let roleFilter = undefined;
      
      // Filter users based on target audience for custom rooms
      if (formData.targetAudience === 'custom') {
        // For custom rooms, fetch all relevant users based on role
        if (user?.role === 'central_admin' || user?.role === 'local_admin') {
          roleFilter = 'faculty,student,local_admin'; // Can select faculty, students, or DEO
        }
      } else if (formData.targetAudience === 'faculty') {
        roleFilter = 'faculty';
      } else if (formData.targetAudience === 'students') {
        roleFilter = 'student';
      } else if (formData.targetAudience === 'deo') {
        roleFilter = 'local_admin';
      } else if (formData.targetAudience === 'faculty-deo') {
        roleFilter = 'faculty,local_admin';
      } else if (formData.type === 'private') {
        roleFilter = user?.role === 'local_admin' ? 'faculty,student' : undefined;
      }

      const response = await userAPI.getUsers({
        department: formData.department,
        role: roleFilter,
        limit: 500 // Limit to prevent long loading times
      });
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      // Fetch all users across all departments for private-group with limit
      const response = await userAPI.getUsers({
        role: 'faculty,student,local_admin',
        limit: 500 // Limit to prevent long loading times
      });
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching all users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleParticipantToggle = (userId) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter(id => id !== userId)
        : [...prev.participants, userId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    if (!formData.department && formData.type !== 'global' && formData.type !== 'private-group') {
      toast.error('Please select a department');
      return;
    }

    if (formData.type === 'class' && (!formData.year || !formData.batch)) {
      toast.error('Please select year and batch for class room');
      return;
    }

    if ((formData.targetAudience === 'custom' || formData.type === 'private-group') && formData.participants.length === 0) {
      toast.error('Please select at least one participant');
      return;
    }

    setLoading(true);
    try {
      const roomData = {
        name: formData.name,
        type: formData.type,
        department: formData.department || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        batch: formData.batch || undefined,
        targetAudience: formData.targetAudience,
        participants: formData.participants.length > 0 ? formData.participants : undefined
      };

      const response = await chatAPI.createChatRoom(roomData);
      toast.success('Chat room created successfully');
      onRoomCreated(response.data);
      handleClose();
    } catch (error) {
      console.error('Create room error:', error);
      toast.error(error.response?.data?.message || 'Failed to create chat room');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      type: 'department',
      department: user?.role === 'local_admin' ? (user.department._id || user.department) : '',
      year: '',
      batch: '',
      participants: [],
      targetAudience: 'all'
    });
    setUsers([]);
    setUserSearchQuery('');
    setLoadingUsers(false);
    onClose();
  };

  // Filter users based on search query
  const filteredUsers = users.filter(u => {
    if (!userSearchQuery.trim()) return true;
    const searchLower = userSearchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower) ||
      u.role?.toLowerCase().includes(searchLower) ||
      u.department?.name?.toLowerCase().includes(searchLower)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaUsers className="text-blue-600" />
            Create Chat Room
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <FaTimes />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., CS Department Chat, First Year Discussion"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Room Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Type <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {user?.role === 'central_admin' && (
                <option value="global">🌍 Global (All Users)</option>
              )}
              <option value="department">🏢 Department</option>
              <option value="class">📚 Class</option>
              {user?.role !== 'student' && (
                <option value="private">💬 Private Group</option>
              )}
              {user?.role === 'central_admin' && (
                <option value="private-group">👥 Private Group (Cross-Department)</option>
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.type === 'global' && 'Visible to all users in the university'}
              {formData.type === 'department' && 'For all members of a department'}
              {formData.type === 'class' && 'For students in a specific class'}
              {formData.type === 'private' && 'Select specific participants from a department'}
              {formData.type === 'private-group' && 'Select users from multiple departments'}
            </p>
          </div>

          {/* Department */}
          {formData.type !== 'global' && formData.type !== 'private-group' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              {user?.role === 'local_admin' ? (
                <input
                  type="text"
                  value={user.department?.name || 'Your Department'}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              ) : (
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={formData.type !== 'global' && formData.type !== 'private-group'}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Target Audience - Show for department type only */}
          {formData.type === 'department' && formData.department && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience <span className="text-red-500">*</span>
              </label>
              <select
                name="targetAudience"
                value={formData.targetAudience}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">👥 All (Faculty, Students & DEO)</option>
                
                {/* Central Admin Options */}
                {user?.role === 'central_admin' && (
                  <>
                    <option value="students">🎓 Only Students</option>
                    <option value="faculty">👨‍🏫 Only Faculty</option>
                    <option value="deo">👔 Only DEO</option>
                    <option value="faculty-deo">👨‍🏫👔 Faculty & DEO</option>
                    <option value="custom">⚙️ Custom (Select Specific Users)</option>
                  </>
                )}
                
                {/* Local Admin Options */}
                {user?.role === 'local_admin' && (
                  <>
                    <option value="students">🎓 Only Students</option>
                    <option value="faculty">👨‍🏫 Only Faculty</option>
                    <option value="custom">⚙️ Custom (Select Specific Users)</option>
                  </>
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.targetAudience === 'all' && 'Room visible to all members of the department'}
                {formData.targetAudience === 'students' && 'Only students can access this room'}
                {formData.targetAudience === 'faculty' && 'Only faculty members can access this room'}
                {formData.targetAudience === 'deo' && 'Only DEO (Department Admin) can access this room'}
                {formData.targetAudience === 'faculty-deo' && 'Only faculty and DEO can access this room'}
                {formData.targetAudience === 'custom' && 'Select specific users who can access this room'}
              </p>
            </div>
          )}

          {/* Year and Batch for Class */}
          {formData.type === 'class' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year <span className="text-red-500">*</span>
                </label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="batch"
                  value={formData.batch}
                  onChange={handleChange}
                  placeholder="e.g., A, B, C"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          )}

          {/* Participants for Private, Private-Group or Custom */}
          {((formData.type === 'private' && formData.department) || 
            formData.type === 'private-group' ||
            (formData.type === 'department' && formData.targetAudience === 'custom')) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Participants <span className="text-red-500">*</span>
              </label>
              {formData.type === 'private-group' && (
                <p className="text-xs text-blue-600 mb-2 bg-blue-50 p-2 rounded">
                  💡 You can select users from multiple departments
                </p>
              )}
              
              {/* Search Input */}
              {!loadingUsers && users.length > 0 && (
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Search by name, email, role, or department..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-2">
                {loadingUsers ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p className="text-gray-500 text-sm">Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    {formData.type === 'private-group' ? 'No users found' : 
                     formData.department ? 'No users found' : 'Select a department first'}
                  </p>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No users match your search
                  </p>
                ) : (
                  <>
                    <div className="sticky top-0 bg-white border-b border-gray-200 pb-2 mb-2 z-10">
                      <p className="text-xs text-gray-600">
                        Selected: {formData.participants.length} / {users.length}
                        {userSearchQuery && ` (Showing ${filteredUsers.length})`}
                      </p>
                    </div>
                    {filteredUsers.map((u) => (
                      <label
                        key={u._id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.participants.includes(u._id)}
                          onChange={() => handleParticipantToggle(u._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium">{u.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({u.role === 'local_admin' ? 'DEO' : u.role})
                            {u.department?.name && ` - ${u.department.name}`}
                            {u.year && ` - Year ${u.year}`}
                            {u.batch && ` - ${u.batch}`}
                          </span>
                        </div>
                      </label>
                    ))}
                  </>
                )}
              </div>
              {(formData.targetAudience === 'custom' || formData.type === 'private-group') && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Only selected users will be able to access this room
                </p>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChatRoomModal;
