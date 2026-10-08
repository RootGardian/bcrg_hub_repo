require('dotenv').config();
const { connectDB } = require('./config/db');
const { LdapConfig } = require('./models');

const checkDB = async () => {
    await connectDB();
    const configs = await LdapConfig.findAll();
    console.log(JSON.stringify(configs, null, 2));
    process.exit();
};
checkDB();
