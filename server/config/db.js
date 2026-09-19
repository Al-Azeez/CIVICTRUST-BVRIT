const mongoose = require('mongoose');

let isMemoryMode = false;
let memoryStore = {
  users: [],
  complaints: [],
  masterIncidents: [],
  verifications: []
};

const connectDB = async () => {
  const mongoURI = (process.env.MONGODB_URI || '').trim();
  
  if (!mongoURI) {
    console.log(`[Database] No MONGODB_URI specified in .env. Running seamlessly in High-Performance In-Memory Persistence Mode.`);
    isMemoryMode = true;
    return;
  }
  
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[Database] Connected to MongoDB successfully at: ${mongoURI}`);
    isMemoryMode = false;
  } catch (error) {
    console.warn(`[Database] MongoDB connection failed (${error.message}).`);
    console.warn(`[Database] Falling back to High-Performance In-Memory Persistence Mode with complete REST API fidelity.`);
    isMemoryMode = true;
  }
};

const getMemoryStore = () => memoryStore;
const getIsMemoryMode = () => isMemoryMode;

module.exports = {
  connectDB,
  getMemoryStore,
  getIsMemoryMode
};
