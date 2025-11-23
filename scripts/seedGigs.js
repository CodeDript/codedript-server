/**
 * Seed Script to Create Sample Gigs
 * Run this script to populate the database with sample gigs for testing
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Gig = require('../models/Gig');
const User = require('../models/User');

// Connect to MongoDB
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

// Sample developers
const sampleDevelopers = [
  {
    email: 'alex.blockchain@codedript.com',
    walletAddress: '0xa1b2c3d4e5f6789012345678901234567890abcd',
    role: 'developer',
    profile: {
      name: 'Alex Chen',
      bio: 'Blockchain architect with 5+ years of Web3 development experience',
      skills: ['Solidity', 'React'],
      avatar: 'https://i.pravatar.cc/150?img=12'
    },
    reputation: { rating: 4.9, reviewCount: 45 },
    isActive: true,
    isVerified: true
  },
  {
    email: 'sarah.security@codedript.com',
    walletAddress: '0xb2c3d4e5f6789012345678901234567890abcdef',
    role: 'developer',
    profile: {
      name: 'Sarah Johnson',
      bio: 'Smart contract security specialist and blockchain auditor',
      skills: ['Solidity', 'Security', 'Audit'],
      avatar: 'https://i.pravatar.cc/150?img=5'
    },
    reputation: { rating: 5.0, reviewCount: 38 },
    isActive: true,
    isVerified: true
  },
  {
    email: 'mike.frontend@codedript.com',
    walletAddress: '0xc3d4e5f6789012345678901234567890abcdef01',
    role: 'developer',
    profile: {
      name: 'Mike Rodriguez',
      bio: 'Full-stack developer specializing in modern web applications',
      skills: ['React', 'TypeScript'],
      avatar: 'https://i.pravatar.cc/150?img=33'
    },
    reputation: { rating: 4.8, reviewCount: 62 },
    isActive: true,
    isVerified: true
  },
  {
    email: 'emma.nft@codedript.com',
    walletAddress: '0xd4e5f6789012345678901234567890abcdef0123',
    role: 'developer',
    profile: {
      name: 'Emma Davis',
      bio: 'NFT marketplace specialist and Web3 enthusiast',
      skills: ['Solidity', 'IPFS'],
      avatar: 'https://i.pravatar.cc/150?img=9'
    },
    reputation: { rating: 4.7, reviewCount: 28 },
    isActive: true,
    isVerified: true
  },
  {
    email: 'james.mobile@codedript.com',
    walletAddress: '0xe5f6789012345678901234567890abcdef012345',
    role: 'developer',
    profile: {
      name: 'James Wilson',
      bio: 'Cross-platform mobile developer with extensive React Native experience',
      skills: ['React Native', 'JavaScript'],
      avatar: 'https://i.pravatar.cc/150?img=15'
    },
    reputation: { rating: 4.6, reviewCount: 51 },
    isActive: true,
    isVerified: true
  },
  {
    email: 'dr.sophia.ai@codedript.com',
    walletAddress: '0xf6789012345678901234567890abcdef01234567',
    role: 'developer',
    profile: {
      name: 'Dr. Sophia Kumar',
      bio: 'AI/ML researcher and data scientist with Ph.D. in Machine Learning',
      skills: ['Python', 'TensorFlow'],
      avatar: 'https://i.pravatar.cc/150?img=20'
    },
    reputation: { rating: 4.9, reviewCount: 34 },
    isActive: true,
    isVerified: true
  },
  {
    email: 'david.backend@codedript.com',
    walletAddress: '0x0789012345678901234567890abcdef012345678',
    role: 'developer',
    profile: {
      name: 'David Martinez',
      bio: 'Backend architect building scalable APIs and microservices',
      skills: ['Node.js', 'Express'],
      avatar: 'https://i.pravatar.cc/150?img=11'
    },
    reputation: { rating: 4.7, reviewCount: 47 },
    isActive: true,
    isVerified: true
  },
  {
    email: 'olivia.design@codedript.com',
    walletAddress: '0x789012345678901234567890abcdef0123456789',
    role: 'developer',
    profile: {
      name: 'Olivia Taylor',
      bio: 'UI/UX designer creating beautiful and intuitive user experiences',
      skills: ['Figma', 'Adobe XD'],
      avatar: 'https://i.pravatar.cc/150?img=16'
    },
    reputation: { rating: 4.8, reviewCount: 56 },
    isActive: true,
    isVerified: true
  },
  {
    email: 'ryan.devops@codedript.com',
    walletAddress: '0x789012345678901234567890abcdef012345678a',
    role: 'developer',
    profile: {
      name: 'Ryan Thompson',
      bio: 'DevOps engineer specializing in cloud infrastructure and automation',
      skills: ['AWS', 'Docker'],
      avatar: 'https://i.pravatar.cc/150?img=13'
    },
    reputation: { rating: 4.9, reviewCount: 41 },
    isActive: true,
    isVerified: true
  },
  {
    email: 'lisa.data@codedript.com',
    walletAddress: '0x8901234567890123456789abcdef012345678bcd',
    role: 'developer',
    profile: {
      name: 'Lisa Anderson',
      bio: 'Data scientist transforming data into actionable insights',
      skills: ['Python', 'R'],
      avatar: 'https://i.pravatar.cc/150?img=10'
    },
    reputation: { rating: 4.6, reviewCount: 39 },
    isActive: true,
    isVerified: true
  }
];

// Sample gig data
const sampleGigs = [
  {
    title: "Full-Stack Web3 DApp Development",
    description: "I will develop a complete decentralized application with smart contracts, frontend integration, and wallet connectivity. Experienced with Solidity, React, Web3.js, and Hardhat. I ensure secure, gas-optimized smart contracts and seamless user experience.",
    category: "blockchain-development",
    subcategory: "dapp-development",
    pricing: {
      type: "fixed",
      amount: 5000,
      currency: "ETH"
    },
    deliveryTime: 30,
    revisions: 3,
    images: [
      { url: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800" }
    ],
    tags: ["blockchain", "web3"],
    status: "active",
    rating: {
      average: 4.9,
      count: 45
    }
  },
  {
    title: "Smart Contract Audit & Security Review",
    description: "Professional smart contract security audit service. I will thoroughly review your Solidity code, identify vulnerabilities, gas optimization opportunities, and provide detailed reports with recommendations. Experienced with various DeFi protocols and NFT projects.",
    category: "smart-contracts",
    subcategory: "security-audit",
    pricing: {
      type: "fixed",
      amount: 3500,
      currency: "ETH"
    },
    deliveryTime: 14,
    revisions: 2,
    images: [
      { url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800" }
    ],
    tags: ["smart-contract", "security"],
    status: "active",
    rating: {
      average: 5.0,
      count: 38
    }
  },
  {
    title: "React & TypeScript Web Application Development",
    description: "I will build modern, responsive web applications using React and TypeScript. Expertise in state management (Redux, Context), RESTful APIs, responsive design, and best practices. Clean code, proper documentation, and comprehensive testing included.",
    category: "web-development",
    subcategory: "frontend",
    pricing: {
      type: "hourly",
      amount: 150,
      currency: "USD"
    },
    deliveryTime: 21,
    revisions: 2,
    images: [
      { url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800" }
    ],
    tags: ["react", "typescript"],
    status: "active",
    rating: {
      average: 4.8,
      count: 62
    }
  },
  {
    title: "NFT Marketplace Development",
    description: "Complete NFT marketplace with minting, buying, selling, and auction features. Integrated with IPFS for metadata storage, supports ERC-721 and ERC-1155 standards. Includes admin panel, user profiles, and wallet integration with MetaMask and WalletConnect.",
    category: "blockchain-development",
    subcategory: "nft",
    pricing: {
      type: "fixed",
      amount: 8000,
      currency: "ETH"
    },
    deliveryTime: 45,
    revisions: 3,
    images: [
      { url: "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=800" }
    ],
    tags: ["nft", "marketplace"],
    status: "active",
    rating: {
      average: 4.7,
      count: 28
    }
  },
  {
    title: "Mobile App Development (React Native)",
    description: "Cross-platform mobile application development using React Native. Build apps for both iOS and Android with a single codebase. Experience with native modules, push notifications, offline storage, and third-party API integrations.",
    category: "mobile-development",
    subcategory: "cross-platform",
    pricing: {
      type: "fixed",
      amount: 4500,
      currency: "USD"
    },
    deliveryTime: 35,
    revisions: 2,
    images: [
      { url: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800" }
    ],
    tags: ["mobile", "react-native"],
    status: "active",
    rating: {
      average: 4.6,
      count: 51
    }
  },
  {
    title: "AI/ML Model Development & Integration",
    description: "Custom machine learning model development and integration. Expertise in TensorFlow, PyTorch, scikit-learn. Services include data preprocessing, model training, hyperparameter tuning, and deployment. Experience with NLP, computer vision, and predictive analytics.",
    category: "ai-ml",
    subcategory: "model-development",
    pricing: {
      type: "hourly",
      amount: 200,
      currency: "USD"
    },
    deliveryTime: 28,
    revisions: 2,
    images: [
      { url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800" }
    ],
    tags: ["ai", "machine-learning"],
    status: "active",
    rating: {
      average: 4.9,
      count: 34
    }
  },
  {
    title: "Backend API Development with Node.js",
    description: "Robust and scalable RESTful API development using Node.js, Express, and MongoDB/PostgreSQL. Includes authentication, authorization, data validation, error handling, and comprehensive API documentation. Focus on security, performance, and best practices.",
    category: "backend",
    subcategory: "api-development",
    pricing: {
      type: "fixed",
      amount: 2500,
      currency: "USD"
    },
    deliveryTime: 20,
    revisions: 2,
    images: [
      { url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800" }
    ],
    tags: ["backend", "nodejs"],
    status: "active",
    rating: {
      average: 4.7,
      count: 47
    }
  },
  {
    title: "UI/UX Design for Web & Mobile",
    description: "Modern and user-friendly UI/UX design for web and mobile applications. Complete design process from wireframes to high-fidelity prototypes. Proficient in Figma, Adobe XD, and design systems. Focus on user research, usability, and conversion optimization.",
    category: "ui-ux-design",
    subcategory: "web-design",
    pricing: {
      type: "fixed",
      amount: 1800,
      currency: "USD"
    },
    deliveryTime: 15,
    revisions: 3,
    images: [
      { url: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800" }
    ],
    tags: ["ui", "ux", "design"],
    status: "active",
    rating: {
      average: 4.8,
      count: 56
    }
  },
  {
    title: "DevOps & Cloud Infrastructure Setup",
    description: "Complete DevOps solutions including CI/CD pipeline setup, containerization with Docker, Kubernetes orchestration, AWS/GCP/Azure cloud infrastructure. Automated deployments, monitoring, logging, and infrastructure as code with Terraform.",
    category: "devops",
    subcategory: "cloud-infrastructure",
    pricing: {
      type: "hourly",
      amount: 180,
      currency: "USD"
    },
    deliveryTime: 25,
    revisions: 2,
    images: [
      { url: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800" }
    ],
    tags: ["devops", "cloud", "aws"],
    status: "active",
    rating: {
      average: 4.9,
      count: 41
    }
  },
  {
    title: "Data Science & Analytics Solutions",
    description: "Comprehensive data analysis, visualization, and insights. Services include exploratory data analysis, statistical modeling, predictive analytics, and interactive dashboards. Proficient in Python, R, Tableau, and Power BI. Experience with big data technologies.",
    category: "data-science",
    subcategory: "analytics",
    pricing: {
      type: "hourly",
      amount: 160,
      currency: "USD"
    },
    deliveryTime: 18,
    revisions: 2,
    images: [
      { url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800" }
    ],
    tags: ["data-science", "analytics"],
    status: "active",
    rating: {
      average: 4.6,
      count: 39
    }
  }
];

// Seed function
const seedGigs = async () => {
  try {
    await connectDB();

    // Clear existing gigs
    await Gig.deleteMany({});
    console.log('🗑️  Cleared existing gigs');

    // Delete only the sample developers (not all users)
    await User.deleteMany({ 
      email: { 
        $in: sampleDevelopers.map(dev => dev.email) 
      } 
    });
    console.log('🗑️  Cleared existing sample developers');

    // Create developers
    const createdDevelopers = await User.insertMany(sampleDevelopers);
    console.log(`✅ Created ${createdDevelopers.length} sample developers`);

    // Create gigs with each developer
    const gigsToCreate = sampleGigs.map((gig, index) => ({
      ...gig,
      developer: createdDevelopers[index]._id
    }));

    const createdGigs = await Gig.insertMany(gigsToCreate);
    console.log(`✅ Created ${createdGigs.length} sample gigs`);

    console.log('\n📊 Sample Gigs Summary:');
    createdGigs.forEach((gig, index) => {
      console.log(`  ${index + 1}. ${gig.title} (${gig.pricing.amount} ${gig.pricing.currency}) - ${createdDevelopers[index].profile.name}`);
    });

    console.log('\n✨ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedGigs();
