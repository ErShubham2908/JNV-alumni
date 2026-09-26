const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Notification = require('../models/Notification');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const houses = ['Aravali', 'Nilgiri', 'Shivalik', 'Udaygiri'];
const navodayaOptions = ['10th', '12th', 'Other'];
const currentStates = ['Student', 'Working Professional', 'Business', 'Higher Studies', 'Entrepreneur', 'Other'];
const professions = [
  'Software Engineer',
  'Doctor',
  'Teacher',
  'Architect',
  'Lawyer',
  'Entrepreneur',
  'Product Manager',
  'Civil Engineer',
  'Research Analyst',
  'Data Scientist',
  'Public Service Officer',
  'Designer',
  'Banker',
  'Consultant',
  'Journalist',
];

const firstNames = [
  'Rahul', 'Priya', 'Aman', 'Neha', 'Arjun', 'Megha', 'Karan', 'Ishita', 'Rohan', 'Sanya',
  'Dev', 'Ananya', 'Vikram', 'Pooja', 'Nikhil', 'Ritika', 'Harsh', 'Mitali', 'Yash', 'Sneha',
  'Aditi', 'Tushar', 'Shreya', 'Varun', 'Tanvi', 'Rajat', 'Nisha', 'Ankit', 'Kavya', 'Divya',
  'Manav', 'Kriti', 'Aditya', 'Sakshi', 'Akash', 'Simran', 'Gaurav', 'Jiya', 'Parth', 'Manya',
  'Nandini', 'Sarthak', 'Bhavna', 'Rishabh', 'Aarohi', 'Dhruv', 'Pallavi', 'Siddharth', 'Aisha', 'Nitin'
];

const lastNames = [
  'Sharma', 'Singh', 'Patel', 'Verma', 'Reddy', 'Nair', 'Iyer', 'Kapoor', 'Gupta', 'Chopra',
  'Joshi', 'Malhotra', 'Mehta', 'Saxena', 'Khanna', 'Bose', 'Sen', 'Das', 'Roy', 'Jha',
  'Rastogi', 'Kulkarni', 'Mishra', 'Arora', 'Mohan', 'Hegde', 'Agarwal', 'Saini', 'Khan', 'Suri'
];

const cities = ['Bengaluru', 'Delhi', 'Mumbai', 'Hyderabad', 'Pune', 'Jaipur', 'Lucknow', 'Chennai', 'Kolkata', 'Ahmedabad'];

const defaultPassword = 'testbatch@123';

const createBatchDummyUser = (batch, index) => {
  const house = houses[(batch + index) % houses.length];
  const navodaya = navodayaOptions[(batch + index) % navodayaOptions.length];
  const currentState = currentStates[(batch + index) % currentStates.length];
  const profession = professions[(batch + index) % professions.length];
  const city = cities[(batch + index) % cities.length];
  const userNumber = `user${index}`;

  return {
    name: `Batch ${batch} User ${index}`,
    username: `test${batch}${userNumber}`,
    email: `test${batch}${userNumber}@navodaya.com`,
    batch,
    house,
    navodaya,
    currently: currentState,
    profileImage: '',
    currentCity: city,
    profession,
    company: `${profession.split(' ')[0]} Labs`,
    bio: `Batch ${batch} alumni profile created for demo access.`,
    socialLinks: {
      linkedin: `https://linkedin.com/in/test${batch}${userNumber}`,
      github: `https://github.com/test${batch}${userNumber}`,
      instagram: `https://instagram.com/test${batch}${userNumber}`,
    },
    password: defaultPassword,
    isVerified: true,
    verificationStatus: 'approved',
    verificationDeleteAt: null,
  };
};

const generateSeedData = async () => {
  const years = Array.from({ length: 23 }, (_, index) => 2002 + index);
  const expectedUsers = years.flatMap((batch) => Array.from({ length: 5 }, (_, index) => createBatchDummyUser(batch, index + 1)));

  const insertedUsers = [];

  for (const userData of expectedUsers) {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      continue;
    }

    const createdUser = await User.create(userData);
    insertedUsers.push(createdUser);
  }

  await Promise.all(
    insertedUsers.slice(0, 10).map((user) =>
      Notification.create({
        userId: user._id,
        title: 'Welcome to the alumni network',
        message: 'Your alumni profile is now active.',
        isRead: false,
      })
    )
  );

  console.log(`Seeded ${insertedUsers.length} dummy alumni records across batches 2002-2024.`);
  return { seeded: true, count: insertedUsers.length, totalExpected: expectedUsers.length };
};

const run = async () => {
  try {
    await connectDB();
    await generateSeedData();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  run();
}

module.exports = { generateSeedData };
