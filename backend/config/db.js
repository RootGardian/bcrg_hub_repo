require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'Store',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Required for some remote DBs like Render
      }
    },
    define: {
      timestamps: false // Les tables fournies n'ont que created_at, pas de updated_at
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connecté avec succès.');
  } catch (error) {
    console.error('❌ Erreur de connexion PostgreSQL:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
