const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Department = require('../models/Department');
const Notice = require('../models/Notice');
const ChatRoom = require('../models/ChatRoom');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

async function createDemoData() {
  try {
    console.log('🚀 Creating demo data...\n');

    // Clear existing data
    await User.deleteMany({});
    await Department.deleteMany({});
    await Notice.deleteMany({});
    await ChatRoom.deleteMany({});
    console.log('✅ Cleared existing data\n');

    // Create Central Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const centralAdmin = await User.create({
      name: 'System Administrator',
      email: 'admin@campus.com',
      password: adminPassword,
      role: 'central_admin',
      isActive: true
    });
    console.log('✅ Created Central Admin:', centralAdmin.email);

    // Create Department
    const csDept = await Department.create({
      name: 'Computer Science',
      code: 'CS',
      description: 'Department of Computer Science and Engineering',
      batches: [
        { batchName: 'A', year: 1 },
        { batchName: 'B', year: 1 },
        { batchName: 'A', year: 2 },
        { batchName: 'B', year: 2 }
      ],
      createdBy: centralAdmin._id,
      isActive: true
    });
    console.log('✅ Created Department:', csDept.name);

    // Create Local Admin
    const localAdminPassword = await bcrypt.hash('admin123', 10);
    const localAdmin = await User.create({
      name: 'John Doe',
      email: 'john.doe@campus.com',
      password: localAdminPassword,
      role: 'local_admin',
      department: csDept._id,
      employeeId: 'DEO001',
      phone: '1234567890',
      isActive: true,
      createdBy: centralAdmin._id
    });
    console.log('✅ Created Local Admin:', localAdmin.email);

    // Update department with local admin
    csDept.localAdmin = localAdmin._id;
    await csDept.save();

    // Create Faculty
    const facultyPassword = await bcrypt.hash('faculty123', 10);
    const faculty = await User.create({
      name: 'Prof. Smith',
      email: 'prof.smith@campus.com',
      password: facultyPassword,
      role: 'faculty',
      department: csDept._id,
      employeeId: 'FAC001',
      phone: '2345678901',
      isActive: true,
      createdBy: localAdmin._id
    });
    console.log('✅ Created Faculty:', faculty.email);

    // Update department with faculty
    csDept.faculty.push(faculty._id);
    await csDept.save();

    // Create Students
    const studentPassword = await bcrypt.hash('student123', 10);
    
    const student1 = await User.create({
      name: 'Alice Johnson',
      email: 'alice@campus.com',
      password: studentPassword,
      role: 'student',
      department: csDept._id,
      year: 1,
      batch: 'A',
      rollNumber: 'CS101',
      phone: '3456789012',
      isActive: true,
      createdBy: localAdmin._id
    });
    console.log('✅ Created Student:', student1.email);

    const student2 = await User.create({
      name: 'Bob Williams',
      email: 'bob@campus.com',
      password: studentPassword,
      role: 'student',
      department: csDept._id,
      year: 1,
      batch: 'A',
      rollNumber: 'CS102',
      phone: '4567890123',
      isActive: true,
      createdBy: localAdmin._id
    });
    console.log('✅ Created Student:', student2.email);

    // Update department with students
    csDept.students.push(student1._id, student2._id);
    await csDept.save();

    // Create Sample Notices
    const notice1 = await Notice.create({
      title: 'Welcome to Campus Connect',
      content: 'We are excited to launch Campus Connect - your new smart notice board and communication portal. Stay updated with all college announcements and connect with your peers!',
      category: 'Academic',
      priority: 'high',
      visibility: 'global',
      createdBy: centralAdmin._id,
      allowComments: true,
      isPinned: true,
      isActive: true
    });
    console.log('✅ Created Global Notice:', notice1.title);

    const notice2 = await Notice.create({
      title: 'CS Department Orientation',
      content: 'All first-year CS students are required to attend the department orientation on Monday at 10 AM in Auditorium.',
      category: 'Events',
      priority: 'urgent',
      visibility: 'department',
      department: csDept._id,
      createdBy: localAdmin._id,
      allowComments: true,
      isActive: true
    });
    console.log('✅ Created Department Notice:', notice2.title);

    const notice3 = await Notice.create({
      title: 'Programming Lab Schedule - Year 1 Batch A',
      content: 'Lab sessions for Programming will be held every Monday and Wednesday from 2 PM to 5 PM in Lab 101.',
      category: 'Academic',
      priority: 'medium',
      visibility: 'class',
      department: csDept._id,
      targetYear: 1,
      targetBatch: 'A',
      createdBy: faculty._id,
      allowComments: true,
      isActive: true
    });
    console.log('✅ Created Class Notice:', notice3.title);

    // Create Chat Rooms
    const deptChatRoom = await ChatRoom.create({
      name: 'CS Department General',
      type: 'department',
      department: csDept._id,
      moderators: [localAdmin._id, faculty._id],
      createdBy: localAdmin._id,
      isActive: true
    });
    console.log('✅ Created Department Chat Room:', deptChatRoom.name);

    const classChatRoom = await ChatRoom.create({
      name: 'CS Year 1 - Batch A',
      type: 'class',
      department: csDept._id,
      year: 1,
      batch: 'A',
      moderators: [faculty._id],
      createdBy: faculty._id,
      isActive: true
    });
    console.log('✅ Created Class Chat Room:', classChatRoom.name);

    console.log('\n🎉 Demo data created successfully!\n');
    console.log('📝 Login Credentials:');
    console.log('─────────────────────────────────────');
    console.log('Central Admin:');
    console.log('  Email: admin@campus.com');
    console.log('  Password: admin123\n');
    console.log('Local Admin (DEO):');
    console.log('  Email: john.doe@campus.com');
    console.log('  Password: admin123\n');
    console.log('Faculty:');
    console.log('  Email: prof.smith@campus.com');
    console.log('  Password: faculty123\n');
    console.log('Students:');
    console.log('  Email: alice@campus.com');
    console.log('  Password: student123');
    console.log('  Email: bob@campus.com');
    console.log('  Password: student123\n');
    console.log('─────────────────────────────────────');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating demo data:', error);
    process.exit(1);
  }
}

createDemoData();
