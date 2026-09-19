const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { connectDB, getIsMemoryMode, getMemoryStore } = require('./config/db');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const MasterIncident = require('./models/MasterIncident');
const { createSyntheticData } = require('./services/seedData');

// Route Handlers
const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const analyticsRoutes = require('./routes/analytics');
const osintRoutes = require('./routes/osint');

const app = express();
const PORT = process.env.PORT || 5439;

// Middleware - Allow frontend on port 3121
app.use(
  cors({
    origin: ['http://localhost:3121', 'http://127.0.0.1:3121', 'http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Seed Database on startup if needed
const seedDatabase = async () => {
  try {
    const seed = await createSyntheticData();
    
    if (getIsMemoryMode()) {
      const store = getMemoryStore();
      store.users = [...seed.users];
      store.complaints = [...seed.complaints];
      store.masterIncidents = [...seed.masterIncidents];
      console.log(`[Seed] In-Memory store seeded with ${store.users.length} users, ${store.masterIncidents.length} master incidents, and ${store.complaints.length} complaints.`);
    } else {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        await User.insertMany(seed.users);
        await MasterIncident.insertMany(seed.masterIncidents);
        await Complaint.insertMany(seed.complaints);
        console.log(`[Seed] MongoDB seeded with synthetic master incidents and complaints.`);
      } else {
        console.log(`[Seed] Database ready.`);
      }
    }
  } catch (error) {
    console.error('[Seed Error]:', error.message);
  }
};

// Root Welcome & Service Status Page
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CivicTrust API Server (Port ${PORT})</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #111827; border: 1px solid #1f2937; border-radius: 24px; padding: 40px; max-width: 580px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; }
          .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; }
          .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px #10b981; }
          h1 { font-size: 26px; font-weight: 800; margin: 0 0 10px 0; color: #ffffff; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; text-align: left; }
          .stat { background: #1e293b; padding: 14px; border-radius: 12px; border: 1px solid #334155; }
          .stat-label { font-size: 11px; color: #94a3b8; font-weight: 600; }
          .stat-val { font-size: 15px; color: #f8fafc; font-weight: 700; margin-top: 4px; font-family: monospace; }
          .btn { display: inline-block; background: #10b981; color: #ffffff; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 12px; text-decoration: none; transition: background 0.2s; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3); }
          .btn:hover { background: #059669; }
          .api-links { margin-top: 20px; font-size: 12px; color: #64748b; }
          .api-links a { color: #38bdf8; text-decoration: none; margin: 0 8px; }
          .api-links a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">
            <span class="dot"></span> Backend API Running Live
          </div>
          <h1>CivicTrust REST API Server</h1>
          <p>
            The CivicTrust backend verification service is running on port <strong>${PORT}</strong>. 
            To access the full web application UI, open the frontend portal.
          </p>
          <div class="grid">
            <div class="stat">
              <div class="stat-label">FRONTEND UI</div>
              <div class="stat-val"><a href="http://localhost:3121" style="color:#38bdf8; text-decoration:none;">Port 3121 ↗</a></div>
            </div>
            <div class="stat">
              <div class="stat-label">BACKEND PORT</div>
              <div class="stat-val">Port ${PORT}</div>
            </div>
            <div class="stat">
              <div class="stat-label">DATABASE MODE</div>
              <div class="stat-val">${getIsMemoryMode() ? 'In-Memory Store' : 'MongoDB Connected'}</div>
            </div>
            <div class="stat">
              <div class="stat-label">API HEALTH</div>
              <div class="stat-val" style="color:#34d399;">ONLINE 200 OK</div>
            </div>
          </div>
          <a href="http://localhost:3121" class="btn">Open CivicTrust Web Portal (Port 3121) →</a>
          <div class="api-links">
            API Endpoints: 
            <a href="/api/health">/api/health</a> • 
            <a href="/api/analytics/kpis">/api/analytics/kpis</a> • 
            <a href="/api/complaints">/api/complaints</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } else {
    res.json({
      service: 'CivicTrust REST API',
      status: 'online',
      port: PORT,
      frontendUrl: 'http://localhost:3121',
      apiBase: `http://localhost:${PORT}/api`,
      health: `http://localhost:${PORT}/api/health`,
    });
  }
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/osint', osintRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'CivicTrust Multi-Signal Verification API',
    port: PORT,
    mode: getIsMemoryMode() ? 'In-Memory Fidelity Store' : 'MongoDB Connected',
    time: new Date().toISOString(),
  });
});

// Demo Data Reset Endpoint
app.post('/api/seed/reset', async (req, res) => {
  try {
    const seed = await createSyntheticData();
    if (getIsMemoryMode()) {
      const store = getMemoryStore();
      store.users = [...seed.users];
      store.complaints = [...seed.complaints];
      store.masterIncidents = [...seed.masterIncidents];
      store.verifications = [];
    } else {
      await User.deleteMany({});
      await Complaint.deleteMany({});
      await MasterIncident.deleteMany({});
      await User.insertMany(seed.users);
      await MasterIncident.insertMany(seed.masterIncidents);
      await Complaint.insertMany(seed.complaints);
    }
    res.json({ message: 'Synthetic prototype data reset successfully to initial state.' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting seed data', error: error.message });
  }
});

// Start Server on Port 5439
const startServer = async () => {
  await connectDB();
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  CIVICTRUST SERVER RUNNING ON PORT ${PORT}`);
    console.log(`  API Base: http://localhost:${PORT}/api`);
    console.log(`====================================================`);
  });
};

startServer();
