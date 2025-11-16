import { useState, useEffect } from 'react';
import { noticeAPI, departmentAPI, acknowledgmentAPI } from '../../services/api';
import { 
  FaChartBar, FaChartLine, FaChartPie, FaEye, FaComments, FaCheckCircle,
  FaUsers, FaBuilding, FaCalendarAlt, FaTrophy
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import MainLayout from '../../layouts/MainLayout';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month'); // week, month, year, all
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  
  const [departments, setDepartments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [acknowledgments, setAcknowledgments] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({
    totalNotices: 0,
    totalViews: 0,
    totalAcknowledgments: 0,
    totalComments: 0,
    averageAckRate: 0,
    topPerformingNotices: [],
    departmentStats: [],
    categoryStats: [],
    priorityStats: [],
    timelineData: []
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, selectedDepartment]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch departments
      const deptResponse = await departmentAPI.getDepartments();
      setDepartments(deptResponse.data.data || []);

      // Fetch notices based on filters
      const params = {};
      if (selectedDepartment !== 'all') {
        params.department = selectedDepartment;
      }
      
      const noticesResponse = await noticeAPI.getNotices(params);
      const allNotices = noticesResponse.data.data || [];
      setNotices(allNotices);

      // Fetch all acknowledgments for the user (or use a stats endpoint if available)
      let allAcknowledgments = [];
      try {
        // Fetch acknowledgments for each notice
        const ackPromises = allNotices.map(notice => 
          acknowledgmentAPI.getNoticeAcknowledgments(notice._id)
            .then(res => ({
              noticeId: notice._id,
              acks: res.data.data || []
            }))
            .catch(() => ({ noticeId: notice._id, acks: [] }))
        );
        const ackResults = await Promise.all(ackPromises);
        allAcknowledgments = ackResults;
      } catch (error) {
        console.error('Error fetching acknowledgments:', error);
      }
      setAcknowledgments(allAcknowledgments);

      // Calculate analytics
      calculateAnalytics(allNotices, deptResponse.data.data || [], allAcknowledgments);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (noticesList, deptList, ackList) => {
    // Filter by time range
    const now = new Date();
    let filteredNotices = noticesList;
    
    if (timeRange !== 'all') {
      const timeRangeMs = {
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000
      };
      
      const cutoffDate = new Date(now - timeRangeMs[timeRange]);
      filteredNotices = noticesList.filter(notice => 
        new Date(notice.createdAt) >= cutoffDate
      );
    }

    // Helper function to get acknowledgment count for a notice
    const getAckCount = (noticeId) => {
      const ackData = ackList.find(a => a.noticeId === noticeId);
      return ackData ? ackData.acks.filter(a => a.isAcknowledged).length : 0;
    };

    // Total stats
    const totalViews = filteredNotices.reduce((sum, n) => sum + (n.viewCount || 0), 0);
    const totalAcks = filteredNotices.reduce((sum, n) => sum + getAckCount(n._id), 0);
    const totalComments = filteredNotices.reduce((sum, n) => sum + (n.comments?.length || 0), 0);
    const avgAckRate = filteredNotices.length > 0 
      ? ((totalAcks / filteredNotices.length) * 100).toFixed(1)
      : 0;

    // Top performing notices
    const topNotices = [...filteredNotices]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 5)
      .map(n => ({
        title: n.title,
        views: n.viewCount || 0,
        acks: getAckCount(n._id),
        comments: n.comments?.length || 0
      }));

    // Department-wise stats
    const deptStats = deptList.map(dept => {
      const deptNotices = filteredNotices.filter(n => 
        n.department?._id === dept._id || n.visibility?.department === dept._id
      );
      return {
        name: dept.name,
        noticeCount: deptNotices.length,
        totalViews: deptNotices.reduce((sum, n) => sum + (n.viewCount || 0), 0),
        totalAcks: deptNotices.reduce((sum, n) => sum + getAckCount(n._id), 0),
        totalComments: deptNotices.reduce((sum, n) => sum + (n.comments?.length || 0), 0)
      };
    }).filter(d => d.noticeCount > 0);

    // Category stats
    const categoryMap = {};
    filteredNotices.forEach(notice => {
      const cat = notice.category || 'Other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { count: 0, views: 0, acks: 0 };
      }
      categoryMap[cat].count++;
      categoryMap[cat].views += notice.viewCount || 0;
      categoryMap[cat].acks += getAckCount(notice._id);
    });
    const categoryStats = Object.entries(categoryMap).map(([cat, data]) => ({
      category: cat,
      ...data
    }));

    // Priority stats
    const priorityMap = {};
    filteredNotices.forEach(notice => {
      const pri = notice.priority || 'Medium';
      if (!priorityMap[pri]) {
        priorityMap[pri] = { count: 0, views: 0, acks: 0 };
      }
      priorityMap[pri].count++;
      priorityMap[pri].views += notice.viewCount || 0;
      priorityMap[pri].acks += getAckCount(notice._id);
    });
    const priorityStats = Object.entries(priorityMap).map(([pri, data]) => ({
      priority: pri,
      ...data
    }));

    // Timeline data (last 7 days/weeks/months)
    const timelineData = generateTimelineData(filteredNotices, timeRange);

    setAnalyticsData({
      totalNotices: filteredNotices.length,
      totalViews,
      totalAcknowledgments: totalAcks,
      totalComments,
      averageAckRate: avgAckRate,
      topPerformingNotices: topNotices,
      departmentStats: deptStats,
      categoryStats,
      priorityStats,
      timelineData
    });
  };

  const generateTimelineData = (noticesList, range) => {
    const data = [];
    const now = new Date();
    const periods = range === 'week' ? 7 : range === 'month' ? 30 : 12;
    
    for (let i = periods - 1; i >= 0; i--) {
      let date;
      let label;
      
      if (range === 'week') {
        date = new Date(now);
        date.setDate(date.getDate() - i);
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (range === 'month') {
        date = new Date(now);
        date.setDate(date.getDate() - i);
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        date = new Date(now);
        date.setMonth(date.getMonth() - i);
        label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
      
      const periodNotices = noticesList.filter(n => {
        const noticeDate = new Date(n.createdAt);
        if (range === 'week' || range === 'month') {
          return noticeDate.toDateString() === date.toDateString();
        } else {
          return noticeDate.getMonth() === date.getMonth() && 
                 noticeDate.getFullYear() === date.getFullYear();
        }
      });
      
      const acks = periodNotices.reduce((sum, n) => {
        const ackData = acknowledgments.find(a => a.noticeId === n._id);
        return sum + (ackData ? ackData.acks.filter(a => a.isAcknowledged).length : 0);
      }, 0);

      data.push({
        label,
        notices: periodNotices.length,
        views: periodNotices.reduce((sum, n) => sum + (n.viewCount || 0), 0),
        acks,
        comments: periodNotices.reduce((sum, n) => sum + (n.comments?.length || 0), 0)
      });
    }
    
    return data;
  };

  // Chart configurations
  const departmentChartData = {
    labels: analyticsData.departmentStats.map(d => d.name),
    datasets: [
      {
        label: 'Notices',
        data: analyticsData.departmentStats.map(d => d.noticeCount),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
      },
      {
        label: 'Views',
        data: analyticsData.departmentStats.map(d => d.totalViews),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
      },
      {
        label: 'Acknowledgments',
        data: analyticsData.departmentStats.map(d => d.totalAcks),
        backgroundColor: 'rgba(251, 146, 60, 0.7)',
      }
    ]
  };

  const categoryPieData = {
    labels: analyticsData.categoryStats.map(c => c.category),
    datasets: [{
      data: analyticsData.categoryStats.map(c => c.count),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(234, 179, 8, 0.8)',
      ]
    }]
  };

  const priorityDoughnutData = {
    labels: analyticsData.priorityStats.map(p => p.priority),
    datasets: [{
      data: analyticsData.priorityStats.map(p => p.count),
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(34, 197, 94, 0.8)',
      ]
    }]
  };

  const timelineChartData = {
    labels: analyticsData.timelineData.map(d => d.label),
    datasets: [
      {
        label: 'Notices Posted',
        data: analyticsData.timelineData.map(d => d.notices),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Total Views',
        data: analyticsData.timelineData.map(d => d.views),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Acknowledgments',
        data: analyticsData.timelineData.map(d => d.acks),
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Notice Analytics</h1>
          <p className="text-gray-600">Comprehensive insights into notice performance and engagement</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon={<FaChartBar className="text-blue-600" />}
            title="Total Notices"
            value={analyticsData.totalNotices}
            bgColor="bg-blue-50"
          />
          <MetricCard
            icon={<FaEye className="text-green-600" />}
            title="Total Views"
            value={analyticsData.totalViews}
            bgColor="bg-green-50"
          />
          <MetricCard
            icon={<FaCheckCircle className="text-orange-600" />}
            title="Acknowledgments"
            value={analyticsData.totalAcknowledgments}
            bgColor="bg-orange-50"
          />
          <MetricCard
            icon={<FaComments className="text-purple-600" />}
            title="Comments"
            value={analyticsData.totalComments}
            bgColor="bg-purple-50"
          />
        </div>

        {/* Timeline Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaChartLine className="text-blue-600" />
            Engagement Timeline
          </h2>
          <div style={{ height: '300px' }}>
            <Line data={timelineChartData} options={chartOptions} />
          </div>
        </div>

        {/* Department Stats */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaBuilding className="text-green-600" />
            Department-wise Performance
          </h2>
          <div style={{ height: '400px' }}>
            <Bar data={departmentChartData} options={chartOptions} />
          </div>
        </div>

        {/* Category and Priority Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaChartPie className="text-purple-600" />
              Category Distribution
            </h2>
            <div style={{ height: '300px' }}>
              <Pie data={categoryPieData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaChartPie className="text-red-600" />
              Priority Distribution
            </h2>
            <div style={{ height: '300px' }}>
              <Doughnut data={priorityDoughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
        </div>

        {/* Top Performing Notices */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaTrophy className="text-yellow-500" />
            Top Performing Notices
          </h2>
          <div className="space-y-4">
            {analyticsData.topPerformingNotices.map((notice, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{notice.title}</h3>
                  </div>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-gray-500">Views</p>
                    <p className="font-bold text-green-600">{notice.views}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">Acks</p>
                    <p className="font-bold text-orange-600">{notice.acks}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">Comments</p>
                    <p className="font-bold text-purple-600">{notice.comments}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

const MetricCard = ({ icon, title, value, bgColor }) => {
  return (
    <div className={`${bgColor} rounded-lg p-6 shadow-md hover:shadow-lg transition`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value.toLocaleString()}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
};

export default Analytics;
