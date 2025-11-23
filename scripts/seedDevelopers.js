/**
 * Seed Script to Create 6 Sample Developers
 * Run: node scripts/seedDevelopers.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codedript';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const developers = [
  {
    email: 'alex.blockchain@codedript.com',
    walletAddress: '0xa1b2c3d4e5f6789012345678901234567890abcd',
    role: 'developer',
    profile: {
      name: 'Alex Chen',
      bio: 'Blockchain architect with 5+ years of Web3 development experience. Specialized in DeFi protocols and smart contract optimization.',
      skills: ['Solidity', 'React', 'Web3.js', 'Hardhat', 'Ethereum'],
      avatar: 'https://i.pravatar.cc/150?img=12'
    },
    reputation: { rating: 4.9, reviewCount: 0 },
    statistics: {
      totalEarnings: 0,
      completedProjects: 0,
      activeProjects: 0
    },
    isActive: true,
    isVerified: true
  },
  {
    email: 'sarah.security@codedript.com',
    walletAddress: '0xb2c3d4e5f6789012345678901234567890abcdef',
    role: 'developer',
    profile: {
      name: 'Sarah Johnson',
      bio: 'Smart contract security specialist and blockchain auditor. Experienced in identifying vulnerabilities and ensuring protocol safety.',
      skills: ['Solidity', 'Security Audit', 'Slither', 'Mythril', 'Blockchain'],
      avatar: 'https://i.pravatar.cc/150?img=5'
    },
    reputation: { rating: 5.0, reviewCount: 0 },
    statistics: {
      totalEarnings: 0,
      completedProjects: 0,
      activeProjects: 0
    },
    isActive: true,
    isVerified: true
  },
  {
    email: 'mike.fullstack@codedript.com',
    walletAddress: '0x1c3d4e5f6789012345678901234567890abcde01',
    role: 'developer',
    profile: {
      name: 'Mike Rodriguez',
      bio: 'Full-stack developer specializing in modern web applications with React and Node.js. Expert in building scalable systems.',
      skills: ['React', 'TypeScript', 'Node.js', 'MongoDB', 'PostgreSQL'],
      avatar: 'https://i.pravatar.cc/150?img=33'
    },
    reputation: { rating: 4.8, reviewCount: 0 },
    statistics: {
      totalEarnings: 0,
      completedProjects: 0,
      activeProjects: 0
    },
    isActive: true,
    isVerified: true
  },
  {
    email: 'emma.mobile@codedript.com',
    walletAddress: '0x2d4e5f6789012345678901234567890abcdef123',
    role: 'developer',
    profile: {
      name: 'Emma Davis',
      bio: 'Mobile app developer with expertise in React Native and Flutter. Building beautiful cross-platform applications.',
      skills: ['React Native', 'Flutter', 'iOS', 'Android', 'Firebase'],
      avatar: 'https://i.pravatar.cc/150?img=9'
    },
    reputation: { rating: 4.7, reviewCount: 0 },
    statistics: {
      totalEarnings: 0,
      completedProjects: 0,
      activeProjects: 0
    },
    isActive: true,
    isVerified: true
  },
  {
    email: 'sophia.ai@codedript.com',
    walletAddress: '0x3e5f6789012345678901234567890abcdef12345',
    role: 'developer',
    profile: {
      name: 'Dr. Sophia Kumar',
      bio: 'AI/ML researcher and data scientist with Ph.D. in Machine Learning. Specialized in NLP and computer vision applications.',
      skills: ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Data Science'],
      avatar: 'https://i.pravatar.cc/150?img=20'
    },
    reputation: { rating: 4.9, reviewCount: 0 },
    statistics: {
      totalEarnings: 0,
      completedProjects: 0,
      activeProjects: 0
    },
    isActive: true,
    isVerified: true
  },
  {
    email: 'david.uiux@codedript.com',
    walletAddress: '0x4f6789012345678901234567890abcdef1234567',
    role: 'developer',
    profile: {
      name: 'David Martinez',
      bio: 'UI/UX designer and frontend developer creating beautiful, intuitive user experiences. Expert in design systems.',
      skills: ['Figma', 'Adobe XD', 'React', 'Tailwind CSS', 'Design Systems'],
      avatar: 'https://i.pravatar.cc/150?img=11'
    },
    reputation: { rating: 4.8, reviewCount: 0 },
    statistics: {
      totalEarnings: 0,
      completedProjects: 0,
      activeProjects: 0
    },
    isActive: true,
    isVerified: true
  }
];

const seedDevelopers = async () => {
  try {
    await connectDB();

    // Clear only these specific developers
    const emails = developers.map(d => d.email);
    await User.deleteMany({ email: { $in: emails } });
    console.log('🗑️  Cleared existing sample developers');

    // Create developers
    const created = await User.insertMany(developers);
    console.log(`✅ Created ${created.length} developers`);

    console.log('\n📊 Developers Summary:');
    created.forEach((dev, idx) => {
      console.log(`  ${idx + 1}. ${dev.profile.name} (${dev.email})`);
      console.log(`     Skills: ${dev.profile.skills.join(', ')}`);
    });

    console.log('\n✨ Developer seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding developers:', error);
    process.exit(1);
  }
};

seedDevelopers();
