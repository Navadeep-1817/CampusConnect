import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { noticeAPI, departmentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FaSave, FaTimes, FaUpload, FaTrash } from 'react-icons/fa';
import MainLayout from '../../layouts/MainLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';


const NoticeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  
  // Set initial visibility based on user role to avoid invalid state
  const getInitialVisibility = () => {
    if (user?.role === 'local_admin') {
      return 'department'; // local_admin can't create global notices
    }
    return 'global'; // central_admin and faculty can
  };
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'Academic',
    priority: 'medium',
    visibility: getInitialVisibility(),
    department: user?.role === 'local_admin' ? (user.department?._id || user.department || '') : '',
    targetYear: '',
    targetBatch: '',
    expiryDate: '',
    attachments: [],
    externalLinks: []
  });

  const [newLink, setNewLink] = useState({ title: '', url: '' });

  useEffect(() => {
    fetchDepartments();
    if (isEdit) {
      fetchNotice();
    } else if (user) {
      // Set appropriate defaults based on user role
      if (user.role === 'local_admin' && user.department) {
        setFormData(prev => ({
          ...prev,
          visibility: 'department',
          department: user.department._id || user.department
        }));
      } else if (user.role === 'faculty') {
        setFormData(prev => ({
          ...prev,
          visibility: 'global'
        }));
      }
    }
  }, [id, user]);

  const fetchDepartments = async () => {
    try {
      const response = await departmentAPI.getDepartments();
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchNotice = async () => {
    try {
      const response = await noticeAPI.getNotice(id);
      const notice = response.data.data;
      setFormData({
        title: notice.title || '',
        content: notice.content || '',
        category: notice.category || 'Academic',
        priority: notice.priority || 'medium',
        visibility: notice.visibility || 'global',
        department: notice.department?._id || '',
        targetYear: notice.targetYear || '',
        targetBatch: notice.targetBatch || '',
        expiryDate: notice.expiryDate ? notice.expiryDate.split('T')[0] : '',
        attachments: [],
        externalLinks: notice.externalLinks || []
      });
    } catch (error) {
      toast.error('Failed to load notice');
      navigate('/notices');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const addExternalLink = () => {
    if (newLink.title && newLink.url) {
      setFormData(prev => ({
        ...prev,
        externalLinks: [...prev.externalLinks, { ...newLink }]
      }));
      setNewLink({ title: '', url: '' });
    }
  };

  const removeExternalLink = (index) => {
    setFormData(prev => ({
      ...prev,
      externalLinks: prev.externalLinks.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate visibility-specific required fields
    const requiresDept = ['department', 'batch', 'class', 'faculty_department', 'admin_department'];
    if (requiresDept.includes(formData.visibility)) {
      // For local admin, use their department automatically
      if (user?.role === 'local_admin') {
        const deptId = user.department?._id || user.department;
        if (!deptId) {
          toast.error('Department information missing');
          return;
        }
      } else if (!formData.department) {
        toast.error('Please select a department');
        return;
      }
    }

    if ((formData.visibility === 'batch' || formData.visibility === 'class') && !formData.targetYear) {
      toast.error('Please select target year');
      return;
    }

    if (formData.visibility === 'class' && !formData.targetBatch) {
      toast.error('Please enter target batch');
      return;
    }

    setSubmitting(true);

    try {
      // Create FormData for file upload support
      const submitData = new FormData();
      
      // Add text fields
      submitData.append('title', formData.title.trim());
      submitData.append('content', formData.content.trim());
      submitData.append('category', formData.category);
      submitData.append('priority', formData.priority);
      submitData.append('visibility', formData.visibility);
      
      // Add externalLinks as JSON string
      submitData.append('externalLinks', JSON.stringify(formData.externalLinks || []));

      // Only add department if visibility requires it
      const requiresDept = ['department', 'batch', 'class', 'faculty_department', 'admin_department'];
      if (requiresDept.includes(formData.visibility)) {
        // For local admin, always use their department
        if (user?.role === 'local_admin') {
          submitData.append('department', user.department?._id || user.department);
        } else if (formData.department) {
          submitData.append('department', formData.department);
        }
      }

      // Only add targetYear if visibility is batch or class
      if ((formData.visibility === 'batch' || formData.visibility === 'class') && formData.targetYear) {
        submitData.append('targetYear', parseInt(formData.targetYear));
      }

      // Only add targetBatch if visibility is class
      if (formData.visibility === 'class' && formData.targetBatch) {
        submitData.append('targetBatch', formData.targetBatch);
      }

      // Only add expiryDate if provided
      if (formData.expiryDate) {
        submitData.append('expiryDate', formData.expiryDate);
      }

      // Add file attachments
      if (formData.attachments && formData.attachments.length > 0) {
        formData.attachments.forEach((file) => {
          submitData.append('attachments', file);
        });
      }

      // Debug: Log what we're submitting
      console.log('📝 Submitting notice:', {
        files: formData.attachments.length,
        visibility: formData.visibility,
        category: formData.category,
        title: formData.title,
        hasContent: !!formData.content
      });
      
      // Log ALL FormData entries to debug
      console.log('📤 FormData entries being sent:');
      for (let [key, value] of submitData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}:`, value.name, `(${value.size} bytes)`);
        } else {
          console.log(`  ${key}:`, value);
        }
      }

      if (isEdit) {
        await noticeAPI.updateNotice(id, submitData);
        toast.success('Notice updated successfully');
      } else {
        await noticeAPI.createNotice(submitData);
        toast.success('Notice created successfully');
      }
      
      navigate('/notices');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.message || 'Failed to save notice');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <LoadingSpinner />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Notice' : 'Create New Notice'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update notice information' : 'Post a new notice to inform users'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter notice title"
              required
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter notice content"
              required
            />
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Academic">Academic</option>
                <option value="Events">Events</option>
                <option value="Exams">Exams</option>
                <option value="Circulars">Circulars</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience
            </label>
            <select
              name="visibility"
              value={formData.visibility}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {user?.role === 'local_admin' ? (
                // Local Admin: Only department-specific options + central admin
                <>
                  <optgroup label="Department Users">
                    <option value="department">🏢 All Department Users (Students & Faculty)</option>
                    <option value="batch">🎓 Year/Batch (Students in Year)</option>
                    <option value="class">📚 Specific Class (Students in Class)</option>
                    <option value="faculty_department">👨‍🏫 Department Faculty</option>
                  </optgroup>
                  <optgroup label="Central Admin">
                    <option value="admin_global">👔 Central Admin</option>
                  </optgroup>
                </>
              ) : (
                // Central Admin and Faculty: All options
                <>
                  <optgroup label="All Users">
                    <option value="global">🌍 Global (Everyone)</option>
                    <option value="department">🏢 Department (All in Department)</option>
                  </optgroup>
                  <optgroup label="Students">
                    <option value="batch">🎓 Year/Batch (Students in Year)</option>
                    <option value="class">📚 Specific Class (Students in Class)</option>
                  </optgroup>
                  <optgroup label="Faculty">
                    <option value="faculty_global">👨‍🏫 All Faculty</option>
                    <option value="faculty_department">👨‍🏫 Faculty in Department</option>
                  </optgroup>
                  <optgroup label="Admins">
                    <option value="admin_global">👔 All Admins</option>
                    <option value="admin_department">👔 Admins in Department</option>
                  </optgroup>
                </>
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.visibility === 'global' && 'Visible to all users in the university'}
              {formData.visibility === 'department' && (user?.role === 'local_admin' 
                ? 'Visible to all students and faculty in your department' 
                : 'Visible to all users (students, faculty, admins) in selected department')}
              {formData.visibility === 'batch' && (user?.role === 'local_admin'
                ? 'Visible to students in selected year/batch of your department'
                : 'Visible to students in selected year/batch')}
              {formData.visibility === 'class' && (user?.role === 'local_admin'
                ? 'Visible to students in specific class of your department'
                : 'Visible to students in specific class')}
              {formData.visibility === 'faculty_global' && 'Visible to all faculty members'}
              {formData.visibility === 'faculty_department' && (user?.role === 'local_admin'
                ? 'Visible to faculty in your department'
                : 'Visible to faculty in selected department')}
              {formData.visibility === 'admin_global' && 'Visible to central administrators'}
              {formData.visibility === 'admin_department' && 'Visible to admins in selected department'}
            </p>
          </div>

          {/* Department (conditional) */}
          {['department', 'batch', 'class', 'faculty_department', 'admin_department'].includes(formData.visibility) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              {user?.role === 'local_admin' ? (
                // Local Admin: Show their department (read-only)
                <input
                  type="text"
                  value={user.department?.name || 'Your Department'}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              ) : (
                // Central Admin/Faculty: Allow selection
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

          {/* Target Year and Batch (conditional) */}
          {(formData.visibility === 'batch' || formData.visibility === 'class') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Year <span className="text-red-500">*</span>
                </label>
                <select
                  name="targetYear"
                  value={formData.targetYear}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  Target Batch {formData.visibility === 'class' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  name="targetBatch"
                  value={formData.targetBatch}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 2021, 2022"
                />
              </div>
            </div>
          )}

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Date (Optional)
            </label>
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* File Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>
            <div className="mt-2">
              <label className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                <FaUpload />
                <span>Choose Files</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                />
              </label>
              {formData.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* External Links */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              External Links
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Link title"
                value={newLink.title}
                onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="url"
                placeholder="https://..."
                value={newLink.url}
                onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addExternalLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
            {formData.externalLinks.length > 0 && (
              <div className="space-y-2">
                {formData.externalLinks.map((link, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                      {link.title}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeExternalLink(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaSave />
              {submitting ? 'Saving...' : isEdit ? 'Update Notice' : 'Post Notice'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/notices')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <FaTimes />
              Cancel
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default NoticeForm;
