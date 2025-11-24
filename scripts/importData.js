const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Gig = require('../models/Gig');
const Agreement = require('../models/Agreement');
const Review = require('../models/Review');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/CodeDript');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Import data
const importData = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Gig.deleteMany({});
    await Agreement.deleteMany({});
    await Review.deleteMany({});
    console.log('✅ Existing data cleared');

    // Read JSON files
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'users.json'), 'utf-8'));
    const gigs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'gigs.json'), 'utf-8'));
    const agreements = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'agreements.json'), 'utf-8'));
    const reviews = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'reviews.json'), 'utf-8'));

    // Import users first (because gigs reference users)
    console.log('📥 Importing users...');
    await User.insertMany(users);
    console.log(`✅ Created ${users.length} users`);

    // Import gigs (reference users)
    console.log('📥 Importing gigs...');
    await Gig.insertMany(gigs);
    console.log(`✅ Created ${gigs.length} gigs`);

    // Import agreements (reference users and gigs)
    console.log('📥 Importing agreements...');

    // Ensure agreements include required clientInfo and developerInfo
    console.log('🔧 Preparing agreements with client/developer info...');
    const preparedAgreements = [];
    for (const agr of agreements) {
      try {
        const clientUser = await User.findById(agr.client);
        const developerUser = await User.findById(agr.developer);

        if (clientUser) {
          agr.clientInfo = {
            name: (clientUser.profile && clientUser.profile.name) || clientUser.username || '',
            email: clientUser.email || '',
            walletAddress: clientUser.walletAddress || ''
          };
        } else {
          console.warn(`⚠️  Client user not found for agreement ${agr.agreementId} (id=${agr.client})`);
        }

        if (developerUser) {
          agr.developerInfo = {
            name: (developerUser.profile && developerUser.profile.name) || developerUser.username || '',
            email: developerUser.email || '',
            walletAddress: developerUser.walletAddress || ''
          };
        } else {
          console.warn(`⚠️  Developer user not found for agreement ${agr.agreementId} (id=${agr.developer})`);
        }

        preparedAgreements.push(agr);
      } catch (e) {
        console.warn('⚠️  Error preparing agreement', agr && agr.agreementId, e.message || e);
      }
    }

    await Agreement.insertMany(preparedAgreements);
    console.log(`✅ Created ${preparedAgreements.length} agreements`);

    // Import reviews (reference agreements, gigs, and users)
    console.log('📥 Importing reviews...');
    await Review.insertMany(reviews);
    console.log(`✅ Created ${reviews.length} reviews`);

    console.log('\n🎉 All data imported successfully!');
    console.log(`
📊 Summary:
   - Users: ${users.length}
   - Gigs: ${gigs.length}
   - Agreements: ${agreements.length}
   - Reviews: ${reviews.length}
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing data:', error);
    process.exit(1);
  }
};

// Run import
importData();
