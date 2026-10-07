const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const { sequelize, connectDB } = require('./config/db');
require('./models'); // Load models and associations

// Connect to database
connectDB().then(() => {
  sequelize.sync({ alter: true }).then(async () => {
    console.log('Database synced');
    
    // Create Default Admin
    const bcrypt = require('bcryptjs');
    const { User } = require('./models');

    try {
      const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
      const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
      const adminMatricule = process.env.DEFAULT_ADMIN_MATRICULE || 'ADMIN001';

      if (adminEmail && adminPassword) {
        const existingAdmin = await User.findOne({ where: { email: adminEmail } });
        if (!existingAdmin) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(adminPassword, salt);
          await User.create({
            matricule: adminMatricule,
            email: adminEmail,
            password_hash: hashedPassword,
            first_name: 'Super',
            last_name: 'Admin',
            department: 'IT',
            is_active: true,
            is_admin: true
          });
          console.log('✅ Default Admin created successfully.');
        } else {
          console.log('ℹ️ Default Admin already exists.');
        }
      }
    } catch (err) {
      console.error('❌ Error creating default admin:', err);
    }
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
