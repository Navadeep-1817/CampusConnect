import { useAuth } from '../contexts/AuthContext';
import { ROLES, getRoleLabel } from '../utils/constants';
import CentralAdminDashboard from "./CentralAdmin/CentralAdminDashboard";
import LocalAdminDashboard from "./LocalAdmin/LocalAdminDashboard";
import FacultyDashboard from "./Faculty/FacultyDashboard";
import StudentDashboard from "./Student/StudentDashboard";


const Dashboard = () => {
  const { user } = useAuth();

  const renderDashboard = () => {
    switch (user?.role) {
      case ROLES.CENTRAL_ADMIN:
        return <CentralAdminDashboard />;
      case ROLES.LOCAL_ADMIN:
        return <LocalAdminDashboard />;
      case ROLES.FACULTY:
        return <FacultyDashboard />;
      case ROLES.STUDENT:
        return <StudentDashboard />;
      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-600">Dashboard not found for your role.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user?.name}
          </h1>
          <p className="text-gray-600 mt-1">{getRoleLabel(user?.role)}</p>
        </div>
        {renderDashboard()}
      </div>
    </div>
  );
};

export default Dashboard;
