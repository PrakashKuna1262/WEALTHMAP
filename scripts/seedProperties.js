const mongoose = require('mongoose');
const Property = require('../models/Property');
const connectDB = require('../config/db');
const { faker } = require('@faker-js/faker'); // Updated import
const fs = require('fs');
const path = require('path');

// Function to generate random coordinates within the continental US
const getRandomUSCoordinates = () => {
  // Continental US bounds (approximately)
  const minLng = -124.848974; // West
  const maxLng = -66.885444;  // East
  const minLat = 24.396308;   // South
  const maxLat = 49.384358;   // North
  
  const lng = minLng + Math.random() * (maxLng - minLng);
  const lat = minLat + Math.random() * (maxLat - minLat);
  
  return [lng, lat];
};

// Array of real property images from Unsplash
const propertyImages = [
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
  'https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'
];

// Array of real person images from randomuser.me
const maleImages = Array.from({ length: 50 }, (_, i) => `https://randomuser.me/api/portraits/men/${i}.jpg`);
const femaleImages = Array.from({ length: 50 }, (_, i) => `https://randomuser.me/api/portraits/women/${i}.jpg`);

// Property name prefixes and suffixes for more realistic names
const propertyPrefixes = [
  'Sunset', 'Mountain', 'Lakeside', 'Ocean', 'River', 'Forest', 'Valley',
  'Highland', 'Meadow', 'Harbor', 'Coastal', 'Urban', 'Downtown', 'Uptown',
  'Skyline', 'Golden', 'Silver', 'Crystal', 'Diamond', 'Emerald', 'Ruby'
];

const propertySuffixes = [
  'Estates', 'Manor', 'Gardens', 'Towers', 'Plaza', 'Residences', 'Villas',
  'Heights', 'View', 'Terrace', 'Court', 'Place', 'Square', 'Commons',
  'Retreat', 'Haven', 'Sanctuary', 'Oasis', 'Enclave', 'Pointe', 'Landing'
];

// US States
const usStates = [
  { name: 'Alabama', abbreviation: 'AL' },
  { name: 'Alaska', abbreviation: 'AK' },
  { name: 'Arizona', abbreviation: 'AZ' },
  { name: 'Arkansas', abbreviation: 'AR' },
  { name: 'California', abbreviation: 'CA' },
  { name: 'Colorado', abbreviation: 'CO' },
  { name: 'Connecticut', abbreviation: 'CT' },
  { name: 'Delaware', abbreviation: 'DE' },
  { name: 'Florida', abbreviation: 'FL' },
  { name: 'Georgia', abbreviation: 'GA' }
];

// Common occupations with realistic income ranges
const occupations = [
  { title: 'Software Engineer', minIncome: 8000, maxIncome: 20000, wealthMultiplier: 24 },
  { title: 'Doctor', minIncome: 15000, maxIncome: 30000, wealthMultiplier: 36 },
  { title: 'Lawyer', minIncome: 10000, maxIncome: 25000, wealthMultiplier: 30 },
  { title: 'Financial Analyst', minIncome: 7000, maxIncome: 15000, wealthMultiplier: 24 },
  { title: 'Marketing Director', minIncome: 8000, maxIncome: 18000, wealthMultiplier: 24 },
  { title: 'Business Owner', minIncome: 12000, maxIncome: 40000, wealthMultiplier: 48 },
  { title: 'Real Estate Agent', minIncome: 6000, maxIncome: 20000, wealthMultiplier: 30 },
  { title: 'Professor', minIncome: 7000, maxIncome: 15000, wealthMultiplier: 24 },
  { title: 'Architect', minIncome: 7500, maxIncome: 16000, wealthMultiplier: 24 },
  { title: 'Dentist', minIncome: 12000, maxIncome: 25000, wealthMultiplier: 30 },
  { title: 'Pilot', minIncome: 10000, maxIncome: 20000, wealthMultiplier: 24 },
  { title: 'Executive', minIncome: 15000, maxIncome: 35000, wealthMultiplier: 36 },
  { title: 'Pharmacist', minIncome: 9000, maxIncome: 15000, wealthMultiplier: 24 },
  { title: 'Engineer', minIncome: 7000, maxIncome: 15000, wealthMultiplier: 24 },
  { title: 'Investment Banker', minIncome: 15000, maxIncome: 40000, wealthMultiplier: 48 },
  { title: 'Surgeon', minIncome: 20000, maxIncome: 45000, wealthMultiplier: 48 },
  { title: 'Consultant', minIncome: 10000, maxIncome: 25000, wealthMultiplier: 30 },
  { title: 'Accountant', minIncome: 6000, maxIncome: 12000, wealthMultiplier: 24 },
  { title: 'Teacher', minIncome: 4000, maxIncome: 8000, wealthMultiplier: 18 },
  { title: 'Nurse', minIncome: 5000, maxIncome: 10000, wealthMultiplier: 18 },
  { title: 'Truck Driver', minIncome: 5000, maxIncome: 10000, wealthMultiplier: 18 }
];

// Connect to database and seed
const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB...');
    
    // Clear existing properties
    console.log('Clearing existing properties...');
    await Property.deleteMany({});
    console.log('Cleared existing properties');
    
    // Generate properties
    const TOTAL_PROPERTIES = 500;
    const BATCH_SIZE = 100; // Larger batch size for faster insertion
    
    console.log(`Generating ${TOTAL_PROPERTIES} properties...`);
    
    // Configure mongoose for better bulk insert performance
    mongoose.set('bufferCommands', false);
    
    // Process in batches to optimize memory usage
    for (let batchStart = 0; batchStart < TOTAL_PROPERTIES; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_PROPERTIES);
      console.log(`Generating batch ${batchStart + 1} to ${batchEnd}...`);
      
      const propertyBatch = [];
      
      for (let i = batchStart; i < batchEnd; i++) {
        // Generate random property data
        const prefix = propertyPrefixes[Math.floor(Math.random() * propertyPrefixes.length)];
        const suffix = propertySuffixes[Math.floor(Math.random() * propertySuffixes.length)];
        const name = `${prefix} ${suffix}`;
        
        const state = usStates[Math.floor(Math.random() * usStates.length)];
        const city = faker.location.city(); // Updated faker method
        const street = faker.location.streetAddress(); // Updated faker method
        const zipCode = faker.location.zipCode('#####'); // Updated faker method
        
        const coordinates = getRandomUSCoordinates();
        
        // Owner details
        const sex = Math.random() > 0.5 ? 'Male' : 'Female';
        const firstName = sex === 'Male' ? faker.person.firstName('male') : faker.person.firstName('female'); // Updated faker method
        const lastName = faker.person.lastName(); // Updated faker method
        const ownerName = `${firstName} ${lastName}`;
        const age = Math.floor(Math.random() * (75 - 25) + 25);
        const email = faker.internet.email({ firstName, lastName }); // Updated faker method
        const mobileNumber = faker.phone.number('(###) ###-####'); // Updated faker method
        
        const occupation = occupations[Math.floor(Math.random() * occupations.length)];
        const monthlyIncome = Math.floor(Math.random() * (occupation.maxIncome - occupation.minIncome) + occupation.minIncome);
        const totalWealth = monthlyIncome * occupation.wealthMultiplier * (Math.floor(Math.random() * 10) + 5);
        
        // Images
        const propertyImage = propertyImages[Math.floor(Math.random() * propertyImages.length)];
        const ownerImage = sex === 'Male' 
          ? maleImages[Math.floor(Math.random() * maleImages.length)]
          : femaleImages[Math.floor(Math.random() * femaleImages.length)];
        
        // Create property object
        const property = {
          name,
          address: {
            street,
            city,
            state: state.name,
            zipCode
          },
          location: {
            type: 'Point',
            coordinates
          },
          propertyImage,
          ownerDetails: {
            ownerName,
            age,
            sex,
            email,
            mobileNumber,
            occupation: occupation.title,
            monthlyIncome,
            totalWealth,
            ownerImage
          },
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 31536000000)) // Random date within the last year
        };
        
        propertyBatch.push(property);
      }
      
      // Insert batch using ordered: false for parallel insertion
      console.log(`Inserting batch ${batchStart + 1} to ${batchEnd}...`);
      const startTime = Date.now();
      
      await Property.insertMany(propertyBatch, { 
        ordered: false,
        rawResult: false
      });
      
      const endTime = Date.now();
      console.log(`Batch inserted in ${(endTime - startTime) / 1000} seconds`);
    }
    
    // Create indexes for better query performance
    console.log('Creating indexes...');
    await Property.collection.createIndex({ name: 1 });
    await Property.collection.createIndex({ 'address.city': 1 });
    await Property.collection.createIndex({ 'address.state': 1 });
    await Property.collection.createIndex({ 'ownerDetails.monthlyIncome': 1 });
    await Property.collection.createIndex({ location: '2dsphere' });
    
    console.log(`Successfully seeded database with ${TOTAL_PROPERTIES} properties!`);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();
