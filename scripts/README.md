# Seed Script

This directory contains database seeding scripts for populating the database with sample data for development and testing.

## Available Scripts

### seedGigs.js

Populates the database with 10 sample gigs across various categories including:
- Blockchain Development
- Smart Contracts
- Web Development
- Mobile Development
- AI/ML
- DevOps
- Data Science
- UI/UX Design

**Usage:**
```bash
node scripts/seedGigs.js
```

**Note:** This script will:
1. Clear all existing gigs from the database
2. Create a sample developer user if one doesn't exist
3. Create 10 sample gigs with realistic data

## Requirements

- MongoDB connection must be configured in `.env` file
- Server dependencies must be installed (`npm install`)
