// Database Setup Script for MAARGA
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    };

    let connection;

    try {
        console.log('🔄 Connecting to MySQL...');
        connection = await mysql.createConnection(config);

        // Create database if it doesn't exist
        const dbName = process.env.DB_NAME || 'maarga_db';
        console.log(`🔄 Creating database: ${dbName}`);
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
        await connection.execute(`USE ${dbName}`);

        // Read and execute schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('🔄 Creating tables...');
        await connection.execute(schema);

        console.log('✅ Database setup completed successfully!');
        console.log(`📊 Database: ${dbName}`);
        console.log('📋 Tables created:');
        console.log('   - users');
        console.log('   - rooms');
        console.log('   - room_members');
        console.log('   - location_updates');
        console.log('   - geofence_violations');
        console.log('   - emergency_alerts');
        console.log('   - notifications');
        console.log('   - trip_stats');
        console.log('   - room_locations (view)');

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Check if we have required environment variables
if (!process.env.DB_HOST && !process.env.DB_PASSWORD) {
    console.log('⚠️  No environment variables detected. Using defaults for local development.');
    console.log('💡 For production, create a .env file with:');
    console.log('   DB_HOST=your_db_host');
    console.log('   DB_USER=your_db_user');
    console.log('   DB_PASSWORD=your_db_password');
    console.log('   DB_NAME=maarga_db');
    console.log('');
}

setupDatabase();