const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const { sequelize, connectDB } = require('./config/db');
require('./models'); // Load models and associations

// Connect to database
connectDB().then(() => {
  sequelize.sync({ alter: true }).then(() => {
    console.log('Database synced');
  });
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/apps', require('./routes/appsRoutes'));
app.use('/api/ldap-config', require('./routes/ldapRoutes'));

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
