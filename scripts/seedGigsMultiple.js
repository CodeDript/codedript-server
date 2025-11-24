/**
 * Seed Script to Create 15 Gigs across 6 Developers
 * Run after seedDevelopers.js: node scripts/seedGigsMultiple.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Gig = require('../models/Gig');
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

const gigTemplates = [
  // Alex Chen - Blockchain (3 gigs)
  {
    developerEmail: 'alex.blockchain@codedript.com',
    title: 'Full-Stack Web3 DApp Development',
    description: 'I will develop a complete decentralized application with smart contracts, frontend integration, and wallet connectivity. Experienced with Solidity, React, Web3.js, and Hardhat. I ensure secure, gas-optimized smart contracts and seamless user experience.',
    category: 'blockchain-development',
    subcategory: 'dapp-development',
    pricing: { type: 'fixed', amount: 5000, currency: 'ETH' },
    deliveryTime: 30,
    revisions: 3,
    tags: ['blockchain', 'web3', 'dapp', 'solidity'],
    images: [{ url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800' }]
  },
  {
    developerEmail: 'alex.blockchain@codedript.com',
    title: 'DeFi Protocol Development',
    description: 'Complete DeFi protocol development including liquidity pools, yield farming, and token staking mechanisms. Expert in AMM design and tokenomics.',
    category: 'blockchain-development',
    subcategory: 'defi',
    pricing: { type: 'fixed', amount: 8000, currency: 'ETH' },
    deliveryTime: 45,
    revisions: 2,
    tags: ['defi', 'blockchain', 'smart-contracts'],
    images: [{ url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800' }]
  },
  {
    developerEmail: 'alex.blockchain@codedript.com',
    title: 'ERC-20/ERC-721 Token Development',
    description: 'Professional token development services for fungible and non-fungible tokens. Includes deployment, testing, and documentation.',
    category: 'blockchain-development',
    subcategory: 'token-development',
    pricing: { type: 'fixed', amount: 2500, currency: 'ETH' },
    deliveryTime: 14,
    revisions: 2,
    tags: ['erc20', 'erc721', 'nft', 'tokens'],
    images: [{ url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800' }]
  },

  // Sarah Johnson - Security (2 gigs)
  {
    developerEmail: 'sarah.security@codedript.com',
    title: 'Smart Contract Security Audit',
    description: 'Comprehensive smart contract audit service using industry-standard tools like Slither, Mythril, and manual code review. Detailed report with vulnerability analysis and recommendations.',
    category: 'smart-contracts',
    subcategory: 'security-audit',
    pricing: { type: 'fixed', amount: 3500, currency: 'ETH' },
    deliveryTime: 21,
    revisions: 1,
    tags: ['security', 'audit', 'smart-contracts'],
    images: [{ url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800' }]
  },
  {
    developerEmail: 'sarah.security@codedript.com',
    title: 'Blockchain Security Consultation',
    description: 'Expert security consultation for blockchain projects. Risk assessment, architecture review, and security best practices implementation.',
    category: 'blockchain-development',
    subcategory: 'consulting',
    pricing: { type: 'hourly', amount: 250, currency: 'USD' },
    deliveryTime: 7,
    revisions: 0,
    tags: ['security', 'consulting', 'blockchain'],
    images: [{ url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800' }]
  },

  // Mike Rodriguez - Full-stack (3 gigs)
  {
    developerEmail: 'mike.fullstack@codedript.com',
    title: 'React & TypeScript Web Application',
    description: 'Modern web application development with React, TypeScript, and best practices. Includes responsive design, state management, and API integration.',
    category: 'web-development',
    subcategory: 'frontend',
    pricing: { type: 'fixed', amount: 3000, currency: 'USD' },
    deliveryTime: 28,
    revisions: 3,
    tags: ['react', 'typescript', 'web-development'],
    images: [{ url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800' }]
  },
  {
    developerEmail: 'mike.fullstack@codedript.com',
    title: 'Node.js Backend API Development',
    description: 'Robust RESTful API development with Node.js, Express, and MongoDB/PostgreSQL. Includes authentication, validation, and comprehensive documentation.',
    category: 'backend',
    subcategory: 'api-development',
    pricing: { type: 'fixed', amount: 2500, currency: 'USD' },
    deliveryTime: 20,
    revisions: 2,
    tags: ['nodejs', 'backend', 'api'],
    images: [{ url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800' }]
  },
  {
    developerEmail: 'mike.fullstack@codedript.com',
    title: 'Full-Stack E-commerce Platform',
    description: 'Complete e-commerce solution with product management, cart, checkout, payment integration, and admin dashboard.',
    category: 'full-stack',
    subcategory: 'e-commerce',
    pricing: { type: 'fixed', amount: 6000, currency: 'USD' },
    deliveryTime: 45,
    revisions: 3,
    tags: ['ecommerce', 'fullstack', 'react', 'nodejs'],
    images: [{ url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800' }]
  },

  // Emma Davis - Mobile (2 gigs)
  {
    developerEmail: 'emma.mobile@codedript.com',
    title: 'React Native Mobile App Development',
    description: 'Cross-platform mobile app development for iOS and Android using React Native. Beautiful UI, smooth performance, and native features.',
    category: 'mobile-development',
    subcategory: 'cross-platform',
    pricing: { type: 'fixed', amount: 4500, currency: 'USD' },
    deliveryTime: 35,
    revisions: 3,
    tags: ['react-native', 'mobile', 'ios', 'android'],
    images: [{ url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800' }]
  },
  {
    developerEmail: 'emma.mobile@codedript.com',
    title: 'Flutter App with Firebase Integration',
    description: 'Beautiful Flutter mobile application with Firebase backend. Includes authentication, real-time database, and cloud storage.',
    category: 'mobile-development',
    subcategory: 'flutter',
    pricing: { type: 'fixed', amount: 4000, currency: 'USD' },
    deliveryTime: 30,
    revisions: 2,
    tags: ['flutter', 'firebase', 'mobile'],
    images: [{ url: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800' }]
  },

  // Sophia Kumar - AI/ML (3 gigs)
  {
    developerEmail: 'sophia.ai@codedript.com',
    title: 'Custom Machine Learning Model Development',
    description: 'End-to-end ML model development including data preprocessing, feature engineering, model training, and deployment. Expertise in TensorFlow and PyTorch.',
    category: 'ai-ml',
    subcategory: 'model-development',
    pricing: { type: 'fixed', amount: 5000, currency: 'USD' },
    deliveryTime: 28,
    revisions: 2,
    tags: ['machine-learning', 'ai', 'tensorflow', 'pytorch'],
    images: [{ url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800' }]
  },
  {
    developerEmail: 'sophia.ai@codedript.com',
    title: 'NLP & Text Analysis Solutions',
    description: 'Natural Language Processing solutions including sentiment analysis, text classification, and chatbot development.',
    category: 'ai-ml',
    subcategory: 'nlp',
    pricing: { type: 'fixed', amount: 4000, currency: 'USD' },
    deliveryTime: 25,
    revisions: 2,
    tags: ['nlp', 'ai', 'text-analysis'],
    images: [{ url: 'https://images.unsplash.com/photo-1655720828018-edd2daec9349?w=800' }]
  },
  {
    developerEmail: 'sophia.ai@codedript.com',
    title: 'Data Science & Analytics Dashboard',
    description: 'Interactive data visualization dashboards with advanced analytics. Python, Pandas, and visualization libraries.',
    category: 'data-science',
    subcategory: 'analytics',
    pricing: { type: 'hourly', amount: 150, currency: 'USD' },
    deliveryTime: 20,
    revisions: 3,
    tags: ['data-science', 'analytics', 'visualization'],
    images: [{ url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800' }]
  },

  // David Martinez - UI/UX (2 gigs)
  {
    developerEmail: 'david.uiux@codedript.com',
    title: 'UI/UX Design for Web & Mobile Apps',
    description: 'Complete UI/UX design service from wireframes to high-fidelity prototypes. User-centered design approach with modern aesthetics.',
    category: 'ui-ux-design',
    subcategory: 'web-design',
    pricing: { type: 'fixed', amount: 2000, currency: 'USD' },
    deliveryTime: 15,
    revisions: 3,
    tags: ['ui', 'ux', 'design', 'figma'],
    images: [{ url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800' }]
  },
  {
    developerEmail: 'david.uiux@codedript.com',
    title: 'Design System & Component Library',
    description: 'Professional design system creation with reusable components, style guide, and documentation. Scalable and maintainable.',
    category: 'ui-ux-design',
    subcategory: 'design-systems',
    pricing: { type: 'fixed', amount: 3500, currency: 'USD' },
    deliveryTime: 25,
    revisions: 2,
    tags: ['design-system', 'ui', 'components'],
    images: [{ url: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800' }]
  }
];

const getPackageFeatures = (category) => {
  const featureMap = {
    'blockchain-development': {
      basic: ['Smart contract development', 'Basic testing', 'Code documentation', 'Email support'],
      standard: ['Advanced smart contracts', 'Security audit', 'Gas optimization', 'Priority support', 'Source code'],
      premium: ['Enterprise-grade contracts', 'Full security audit', 'Multi-chain support', 'Complete documentation', '24/7 support']
    },
    'smart-contracts': {
      basic: ['Contract review', 'Basic security check', 'Report document', 'Email support'],
      standard: ['Comprehensive audit', 'Vulnerability analysis', 'Detailed report', 'Remediation guide', 'Priority support'],
      premium: ['Full security audit', 'Automated testing', 'Manual code review', 'Follow-up audit', '24/7 support']
    },
    'web-development': {
      basic: ['Responsive design', 'Basic features', 'Standard testing', 'Email support'],
      standard: ['Advanced UI/UX', 'API integration', 'Performance optimization', 'Priority support', 'Source files'],
      premium: ['Premium design', 'Advanced features', 'SEO optimization', 'PWA support', '24/7 support']
    },
    'backend': {
      basic: ['REST API', 'Basic auth', 'Documentation', 'Email support'],
      standard: ['Advanced APIs', 'JWT authentication', 'Database optimization', 'API docs', 'Priority support'],
      premium: ['Microservices', 'Advanced security', 'Load balancing', 'Complete docs', '24/7 support']
    },
    'full-stack': {
      basic: ['Frontend & backend', 'Basic features', 'Database setup', 'Email support'],
      standard: ['Full-stack app', 'User authentication', 'Admin panel', 'API integration', 'Priority support'],
      premium: ['Enterprise solution', 'Advanced features', 'Real-time updates', 'Deployment', '24/7 support']
    },
    'mobile-development': {
      basic: ['Single platform', 'Core features', 'Basic UI', 'Email support'],
      standard: ['Cross-platform', 'Advanced features', 'Custom UI', 'API integration', 'Priority support'],
      premium: ['Native performance', 'Offline support', 'Push notifications', 'App store deployment', '24/7 support']
    },
    'ai-ml': {
      basic: ['Data analysis', 'Basic model', 'Report', 'Email support'],
      standard: ['Advanced modeling', 'Feature engineering', 'Model optimization', 'Detailed report', 'Priority support'],
      premium: ['Custom ML pipeline', 'Advanced algorithms', 'Deployment', 'Complete documentation', '24/7 support']
    },
    'data-science': {
      basic: ['Data cleaning', 'Basic analytics', 'Visualization', 'Email support'],
      standard: ['Advanced analytics', 'Interactive dashboards', 'Statistical analysis', 'Report', 'Priority support'],
      premium: ['End-to-end solution', 'Advanced visualizations', 'Predictive analytics', 'Deployment', '24/7 support']
    },
    'ui-ux-design': {
      basic: ['Wireframes', 'Basic mockups', '2 revisions', 'Email support'],
      standard: ['High-fidelity designs', 'Interactive prototype', 'Design system', '3 revisions', 'Priority support'],
      premium: ['Complete design system', 'Advanced prototypes', 'User testing', 'Developer handoff', '24/7 support']
    }
  };

  return featureMap[category] || featureMap['web-development'];
};

const seedGigs = async () => {
  try {
    await connectDB();

    // Clear existing gigs
    await Gig.deleteMany({});
    console.log('🗑️  Cleared existing gigs');

    // Get all developers
    const developers = await User.find({ 
      email: { $in: gigTemplates.map(g => g.developerEmail) } 
    });

    if (developers.length === 0) {
      console.log('❌ No developers found. Please run seedDevelopers.js first!');
      process.exit(1);
    }

    const developerMap = {};
    developers.forEach(dev => {
      developerMap[dev.email] = dev;
    });

    // Create gigs with packages
    const gigsToCreate = gigTemplates.map((template, index) => {
      const developer = developerMap[template.developerEmail];
      const features = getPackageFeatures(template.category);

      return {
        gigId: 1001 + index,
        developer: developer._id,
        title: template.title,
        description: template.description,
        category: template.category,
        subcategory: template.subcategory,
        pricing: template.pricing,
        deliveryTime: template.deliveryTime,
        revisions: template.revisions,
        images: template.images,
        tags: template.tags,
        status: 'active',
        isActive: true,
        isFeatured: index < 5,
        rating: {
          average: 4.5 + Math.random() * 0.5,
          count: 0
        },
        statistics: {
          views: Math.floor(Math.random() * 500) + 100,
          inquiries: 0,
          ordersInProgress: 0,
          ordersCompleted: 0
        },
        packages: [
          {
            name: 'Basic',
            description: features.basic.slice(0, 3),
            price: Math.floor(template.pricing.amount * 0.6),
            currency: template.pricing.currency,
            deliveryTime: Math.ceil(template.deliveryTime * 1.2),
            revisions: 1,
            features: features.basic
          },
          {
            name: 'Standard',
            description: features.standard.slice(0, 4),
            price: Math.floor(template.pricing.amount * 0.8),
            currency: template.pricing.currency,
            deliveryTime: template.deliveryTime,
            revisions: 2,
            features: features.standard
          },
          {
            name: 'Premium',
            description: features.premium.slice(0, 5),
            price: template.pricing.amount,
            currency: template.pricing.currency,
            deliveryTime: Math.ceil(template.deliveryTime * 0.7),
            revisions: 3,
            features: features.premium
          }
        ]
      };
    });

    const createdGigs = await Gig.insertMany(gigsToCreate);
    console.log(`✅ Created ${createdGigs.length} gigs`);

    console.log('\n📊 Gigs Summary:');
    developers.forEach(dev => {
      const devGigs = createdGigs.filter(g => g.developer.toString() === dev._id.toString());
      console.log(`\n${dev.profile.name} (${devGigs.length} gigs):`);
      devGigs.forEach((gig, idx) => {
        console.log(`  ${idx + 1}. ${gig.title} (${gig.pricing.amount} ${gig.pricing.currency})`);
      });
    });

    console.log('\n✨ Gigs seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding gigs:', error);
    process.exit(1);
  }
};

seedGigs();
