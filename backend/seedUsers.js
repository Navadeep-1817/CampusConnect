require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
const bcrypt = require('bcryptjs');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing users (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing demo users...');
    await User.deleteMany({ 
      email: { 
        $in: ['admin@campus.com', 'prof.smith@campus.com', 'alice@campus.com', 'deo@campus.com'] 
      } 
    });

    // Create demo departments
    console.log('📚 Creating demo departments...');
    const departments = [
      {
        name: 'Computer Science Engineering',
        code: 'CSE',
        description: 'Department of Computer Science and Engineering',
        batches: ['2021', '2022', '2023', '2024']
      },
      {
        name: 'Electronics and Communication Engineering',
        code: 'ECE',
        description: 'Department of Electronics and Communication Engineering',
        batches: ['2021', '2022', '2023', '2024']
      },
      {
        name: 'Mechanical Engineering',
        code: 'MECH',
        description: 'Department of Mechanical Engineering',
        batches: ['2021', '2022', '2023', '2024']
      },
      {
        name: 'Civil Engineering',
        code: 'CIVIL',
        description: 'Department of Civil Engineering',
        batches: ['2021', '2022', '2023', '2024']
      }
    ];

    for (const deptData of departments) {
      const existing = await Department.findOne({ code: deptData.code });
      if (!existing) {
        await Department.create(deptData);
        console.log(`✅ Created department: ${deptData.name}`);
      }
    }

    const department = await Department.findOne({ code: 'CSE' });

    // Create demo users
    const demoUsers = [
      {
        name: 'Admin User',
        email: 'admin@campus.com',
        password: 'admin123',
        role: 'central_admin',
        isActive: true
      },
      {
        name: 'DEO User',
        email: 'deo@campus.com',
        password: 'deo123',
        role: 'local_admin',
        department: department._id,
        employeeId: 'DEO001',
        isActive: true
      },
      {
        name: 'Prof. John Smith',
        email: 'prof.smith@campus.com',
        password: 'faculty123',
        role: 'faculty',
        department: department._id,
        employeeId: 'FAC001',
        isActive: true
      },
      {
        name: 'Alice Johnson',
        email: 'alice@campus.com',
        password: 'student123',
        role: 'student',
        department: department._id,
        rollNumber: 'CSE2021001',
        year: 3,
        batch: '2021',
        section: 'A',
        isActive: true
      }
    ];

    console.log('🌱 Seeding demo users...');
    
    for (const userData of demoUsers) {
      const user = await User.create(userData);
      console.log(`✅ Created user: ${user.name} (${user.email}) - Role: ${user.role}`);
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📋 Demo Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Central Admin:');
    console.log('  Email: admin@campus.com');
    console.log('  Password: admin123');
    console.log('\nLocal Admin (DEO):');
    console.log('  Email: deo@campus.com');
    console.log('  Password: deo123');
    console.log('\nFaculty:');
    console.log('  Email: prof.smith@campus.com');
    console.log('  Password: faculty123');
    console.log('\nStudent:');
    console.log('  Email: alice@campus.com');
    console.log('  Password: student123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed Error:', error);
    process.exit(1);
  }
};

seedData();
