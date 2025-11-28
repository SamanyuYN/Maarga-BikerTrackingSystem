// Database Configuration for MAARGA
module.exports = {
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'maarga_user',
        password: process.env.DB_PASSWORD || 'your_secure_password',
        database: process.env.DB_NAME || 'maarga_db',
        port: process.env.DB_PORT || 3306
    },
    server: {
        port: process.env.PORT || 5000,
        jwt_secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here'
    },
    geofence: {
        defaultRadius: 500, // meters
        updateInterval: 5000, // milliseconds
        violationThreshold: 30000 // 30 seconds outside fence before alert
    },
    notifications: {
        pushEnabled: true,
        emailEnabled: false,
        smsEnabled: false
    }
};