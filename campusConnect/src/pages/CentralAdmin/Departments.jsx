import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { departmentAPI, userAPI } from '../../services/api';
import { FaPlus, FaEdit, FaTrash, FaUsers, FaChalkboardTeacher, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import MainLayout from '../../layouts/MainLayout';

const Departments = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [localAdmins, setLocalAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    localAdmin: '',
    hodName: '',
    hodEmail: '',
    hodPhone: ''
  });

  useEffect(() => {
    fetchDepartments();
    fetchLocalAdmins();
  }, []);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      setShowModal(true);
    }
  }, [searchParams]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentAPI.getDepartments();
      setDepartments(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocalAdmins = async () => {
    try {
      const response = await userAPI.getUsers({ role: 'local_admin' });
      setLocalAdmins(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch local admins');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await departmentAPI.updateDepartment(editingDept._id, formData);
        toast.success('Department updated successfully');
      } else {
        await departmentAPI.createDepartment(formData);
        toast.success('Department created successfully');
      }
      
      handleCloseModal();
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save department');
    }
  };

  const handleEdit = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name || '',
      code: dept.code || '',
      description: dept.description || '',
      localAdmin: dept.localAdmin?._id || '',
      hodName: dept.hodName || '',
      hodEmail: dept.hodEmail || '',
      hodPhone: dept.hodPhone || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (deptId) => {
    if (!window.confirm('Are you sure you want to delete this department? This will affect all associated users.')) return;
    
    try {
      await departmentAPI.deleteDepartment(deptId);
      toast.success('Department deleted successfully');
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete department');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDept(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      localAdmin: '',
      hodName: '',
      hodEmail: '',
      hodPhone: ''
    });
    navigate('/departments', { replace: true });
  };

  const filteredDepartments = departments.filter(dept => {
    const query = searchQuery.toLowerCase();
    return (
      dept.name?.toLowerCase().includes(query) ||
      dept.code?.toLowerCase().includes(query) ||
      dept.description?.toLowerCase().includes(query)
    );
  });

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Department Management</h1>
          <p className="text-gray-600">Manage all departments and their administrators</p>
        </div>

        {/* Search and Actions */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition whitespace-nowrap"
            >
              <FaPlus /> Add Department
            </button>
          </div>
        </div>

        {/* Departments Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
            No departments found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDepartments.map((dept) => (
              <div key={dept._id} className="bg-white rounded-lg shadow-md hover:shadow-xl transition overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-blue-500 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white">{dept.name}</h3>
                      <p className="text-green-100 text-sm">{dept.code}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(dept)}
                        className="p-2 bg-white hover:bg-opacity-90 rounded-lg text-green-600 transition shadow-md"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(dept._id)}
                        className="p-2 bg-white hover:bg-opacity-90 rounded-lg text-red-600 transition shadow-md"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {dept.description || 'No description available'}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-600">
                        <FaUsers className="text-blue-500" />
                        Students
                      </span>
                      <span className="font-semibold text-gray-800">
                        {dept.studentsCount || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-600">
                        <FaChalkboardTeacher className="text-green-500" />
                        Faculty
                      </span>
                      <span className="font-semibold text-gray-800">
                        {dept.facultyCount || 0}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-3 bg-blue-50 -mx-4 px-4 py-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Department Admin (DEO)</p>
                    <p className="text-sm font-bold text-gray-900">
                      {dept.localAdmin?.name || 'Not Assigned'}
                    </p>
                    {dept.localAdmin?.email && (
                      <p className="text-xs text-gray-600">{dept.localAdmin.email}</p>
                    )}
                    {dept.localAdmin?.employeeId && (
                      <p className="text-xs text-gray-500">ID: {dept.localAdmin.employeeId}</p>
                    )}
                  </div>

                  {dept.hodName && (
                    <div className="border-t mt-3 pt-3">
                      <p className="text-xs text-gray-500 mb-1">Head of Department</p>
                      <p className="text-sm font-medium text-gray-800">{dept.hodName}</p>
                      {dept.hodEmail && (
                        <p className="text-xs text-gray-500">{dept.hodEmail}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingDept ? 'Edit Department' : 'Create New Department'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Department Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Computer Science"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>

                {/* Department Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., CS, ECE, ME"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the department"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Local Admin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department Admin (DEO)
                  </label>
                  <select
                    value={formData.localAdmin}
                    onChange={(e) => setFormData({ ...formData, localAdmin: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select Local Admin</option>
                    {localAdmins.map(admin => (
                      <option key={admin._id} value={admin._id}>
                        {admin.name} ({admin.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* HOD Details */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Head of Department (HOD) Details
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        HOD Name
                      </label>
                      <input
                        type="text"
                        value={formData.hodName}
                        onChange={(e) => setFormData({ ...formData, hodName: e.target.value })}
                        placeholder="e.g., Dr. John Doe"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        HOD Email
                      </label>
                      <input
                        type="email"
                        value={formData.hodEmail}
                        onChange={(e) => setFormData({ ...formData, hodEmail: e.target.value })}
                        placeholder="hod@university.edu"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        HOD Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.hodPhone}
                        onChange={(e) => setFormData({ ...formData, hodPhone: e.target.value })}
                        placeholder="+1234567890"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {editingDept ? 'Update Department' : 'Create Department'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Departments;
