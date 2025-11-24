/**
 * Seed Script to Create 25 Reviews across Multiple Gigs
 * Run after seedGigsMultiple.js: node scripts/seedReviewsMultiple.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Review = require('../models/Review');
const Agreement = require('../models/Agreement');
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

const reviewTemplates = [
  { rating: 5, text: 'Exceptional work! Delivered exactly what I needed and even added extra features. Highly professional and communicative throughout the project.' },
  { rating: 5, text: 'Outstanding developer! The code quality is top-notch and the project was completed ahead of schedule. Will definitely hire again.' },
  { rating: 5, text: 'Absolutely brilliant work! Very knowledgeable and patient. Explained everything clearly and delivered a perfect solution.' },
  { rating: 5, text: 'Best developer I\'ve worked with! Fast, professional, and the final product exceeded my expectations. Can\'t recommend enough!' },
  { rating: 5, text: 'Amazing experience! Great communication, quick turnaround, and delivered exactly what was promised. A+++' },
  { rating: 5, text: 'Fantastic job! Very skilled and detail-oriented. The project runs smoothly and looks great. Thank you!' },
  { rating: 5, text: 'Incredible work! Went above and beyond to ensure everything was perfect. Will be my go-to developer from now on.' },
  { rating: 4, text: 'Great work overall! The project was completed successfully with minor adjustments needed. Good communication.' },
  { rating: 4, text: 'Very good service. Delivered on time and the quality was excellent. Would work with again.' },
  { rating: 4, text: 'Solid work! Met all the requirements and was responsive to feedback. Happy with the results.' },
  { rating: 4, text: 'Good experience. The developer was professional and delivered quality work. A few small issues but resolved quickly.' },
  { rating: 4, text: 'Nice job! The project turned out well and communication was clear throughout. Recommended!' },
  { rating: 4, text: 'Very competent developer. Delivered a working solution with good documentation. Minor improvements suggested.' },
  { rating: 4, text: 'Great collaboration! The final product works as expected and the developer was easy to work with.' },
  { rating: 3, text: 'Decent work. The project was completed but required several revisions to meet expectations.' },
  { rating: 3, text: 'Satisfactory outcome. Some delays but the developer eventually delivered a working solution.' },
  { rating: 3, text: 'Average experience. The work was acceptable but communication could have been better.' },
  { rating: 5, text: 'Phenomenal developer! Extremely skilled and delivered a production-ready solution. Worth every penny!' },
  { rating: 5, text: 'Top-tier work! The attention to detail and code quality is outstanding. Very impressed!' },
  { rating: 5, text: 'Excellent developer! Fast response time, great communication, and perfect execution. Highly recommended!' },
  { rating: 4, text: 'Strong performance! Delivered a quality product with good documentation and support.' },
  { rating: 4, text: 'Really good work! Professional attitude and delivered everything that was promised.' },
  { rating: 5, text: 'Superb work! The developer demonstrated deep expertise and delivered flawlessly. Will hire again!' },
  { rating: 5, text: 'Perfect! Everything was handled professionally and the end result is exactly what I envisioned.' },
  { rating: 4, text: 'Very pleased with the work! The developer was helpful and delivered a solid product.' }
];

const createSampleClients = async () => {
  const clients = [
    {
      email: 'client1@example.com',
      walletAddress: '0x1111111111111111111111111111111111111111',
      role: 'client',
      profile: { name: 'John Smith', avatar: 'https://i.pravatar.cc/150?img=1' },
      reputation: { rating: 0, reviewCount: 0 },
      isActive: true
    },
    {
      email: 'client2@example.com',
      walletAddress: '0x2222222222222222222222222222222222222222',
      role: 'client',
      profile: { name: 'Emily Johnson', avatar: 'https://i.pravatar.cc/150?img=2' },
      reputation: { rating: 0, reviewCount: 0 },
      isActive: true
    },
    {
      email: 'client3@example.com',
      walletAddress: '0x3333333333333333333333333333333333333333',
      role: 'client',
      profile: { name: 'Michael Brown', avatar: 'https://i.pravatar.cc/150?img=3' },
      reputation: { rating: 0, reviewCount: 0 },
      isActive: true
    },
    {
      email: 'client4@example.com',
      walletAddress: '0x4444444444444444444444444444444444444444',
      role: 'client',
      profile: { name: 'Jessica Davis', avatar: 'https://i.pravatar.cc/150?img=4' },
      reputation: { rating: 0, reviewCount: 0 },
      isActive: true
    },
    {
      email: 'client5@example.com',
      walletAddress: '0x5555555555555555555555555555555555555555',
      role: 'client',
      profile: { name: 'Robert Wilson', avatar: 'https://i.pravatar.cc/150?img=6' },
      reputation: { rating: 0, reviewCount: 0 },
      isActive: true
    }
  ];

  // Clear existing sample clients
  await User.deleteMany({ email: { $in: clients.map(c => c.email) } });
  
  return await User.insertMany(clients);
};

const seedReviews = async () => {
  try {
    await connectDB();

    // Clear existing reviews and agreements
    await Review.deleteMany({});
    await Agreement.deleteMany({});
    console.log('🗑️  Cleared existing reviews and agreements');

    // Get gigs and developers
    const gigs = await Gig.find({}).populate('developer');
    if (gigs.length === 0) {
      console.log('❌ No gigs found. Please run seedGigsMultiple.js first!');
      process.exit(1);
    }

    // Create sample clients
    const clients = await createSampleClients();
    console.log(`✅ Created ${clients.length} sample clients`);

    // Create agreements first (needed for reviews)
    const agreements = [];
    const projectTitles = [
      'E-commerce Platform', 'Mobile App', 'Smart Contract', 'Website Redesign',
      'API Integration', 'Data Analytics', 'Security Audit', 'NFT Marketplace',
      'DApp Development', 'Dashboard UI', 'Backend System', 'ML Model',
      'Design System', 'Token Contract', 'Payment Gateway'
    ];

    for (let i = 0; i < 25; i++) {
      const gig = gigs[i % gigs.length];
      const client = clients[i % clients.length];
      const createdDate = new Date(Date.now() - (60 + i) * 24 * 60 * 60 * 1000);
      const endDate = new Date(createdDate.getTime() + gig.deliveryTime * 24 * 60 * 60 * 1000);
      
      agreements.push({
        agreementId: `AGR-${String(i + 1).padStart(4, '0')}`,
        client: client._id,
        developer: gig.developer._id,
        gig: gig._id,
        project: {
          name: projectTitles[i % projectTitles.length],
          description: `${projectTitles[i % projectTitles.length]} - ${gig.title}`,
          requirements: 'Project requirements and specifications',
          deliverables: ['Source code', 'Documentation', 'Testing'],
          startDate: createdDate,
          expectedEndDate: endDate,
          actualEndDate: endDate
        },
        financials: {
          totalValue: gig.pricing.amount,
          currency: gig.pricing.currency,
          releasedAmount: gig.pricing.amount,
          remainingAmount: 0,
          platformFee: {
            percentage: 2.5,
            amount: gig.pricing.amount * 0.025
          }
        },
        status: 'completed',
        signatures: {
          client: { 
            signed: true, 
            signedAt: new Date(createdDate.getTime() + 24 * 60 * 60 * 1000),
            walletAddress: client.walletAddress
          },
          developer: { 
            signed: true, 
            signedAt: new Date(createdDate.getTime() + 25 * 60 * 60 * 1000),
            walletAddress: gig.developer.walletAddress
          }
        },
        createdAt: createdDate,
        updatedAt: endDate
      });
    }

    const createdAgreements = await Agreement.insertMany(agreements);
    console.log(`✅ Created ${createdAgreements.length} agreements`);

    // Create reviews
    const reviews = createdAgreements.map((agreement, index) => {
      const template = reviewTemplates[index];
      
      return {
        reviewId: `REV-${String(index + 1).padStart(4, '0')}`,
        agreement: agreement._id,
        gig: agreement.gig,
        reviewer: agreement.client,
        reviewee: agreement.developer,
        rating: template.rating,
        review: template.text,
        categories: {
          communication: template.rating,
          quality: template.rating === 5 ? 5 : Math.max(3, template.rating - 1 + Math.floor(Math.random() * 2)),
          timeline: template.rating,
          professionalism: template.rating
        },
        helpful: {
          count: Math.floor(Math.random() * 10),
          users: []
        },
        createdAt: new Date(Date.now() - (50 - index) * 24 * 60 * 60 * 1000)
      };
    });

    const createdReviews = await Review.insertMany(reviews);
    console.log(`✅ Created ${createdReviews.length} reviews`);

    // Calculate statistics
    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    createdReviews.forEach(review => {
      ratingCounts[review.rating]++;
    });

    console.log('\n📊 Reviews Summary:');
    console.log(`  Total Reviews: ${createdReviews.length}`);
    console.log('  Rating Distribution:');
    for (let i = 5; i >= 1; i--) {
      const stars = '⭐'.repeat(i);
      console.log(`    ${stars}: ${ratingCounts[i]}`);
    }

    // Show reviews per developer
    console.log('\n📝 Reviews per Developer:');
    const developerReviews = {};
    for (const review of createdReviews) {
      const populated = await review.populate('reviewee');
      const devName = populated.reviewee.profile.name;
      developerReviews[devName] = (developerReviews[devName] || 0) + 1;
    }
    
    Object.entries(developerReviews).forEach(([name, count]) => {
      console.log(`  ${name}: ${count} reviews`);
    });

    console.log('\n✨ Reviews seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding reviews:', error);
    process.exit(1);
  }
};

seedReviews();
