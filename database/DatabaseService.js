// MAARGA Database Service
// This handles all database operations for the biker tracking app

const mysql = require('mysql2/promise');
const config = require('./config');

class DatabaseService {
    constructor() {
        this.pool = mysql.createPool({
            host: config.db.host,
            user: config.db.user,
            password: config.db.password,
            database: config.db.database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    // User Management
    async createUser(username, phoneNumber) {
        const query = `
            INSERT INTO users (username, phone_number) 
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE 
                phone_number = VALUES(phone_number),
                last_active = CURRENT_TIMESTAMP
        `;
        const [result] = await this.pool.execute(query, [username, phoneNumber]);
        return result.insertId;
    }

    async getUserByUsername(username) {
        const query = 'SELECT * FROM users WHERE username = ?';
        const [rows] = await this.pool.execute(query, [username]);
        return rows[0];
    }

    async updateUserActivity(userId) {
        const query = 'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?';
        await this.pool.execute(query, [userId]);
    }

    // Room Management
    async createRoom(roomCode, destination, leaderId) {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            // Create room
            const roomQuery = `
                INSERT INTO rooms (room_code, destination, leader_id) 
                VALUES (?, ?, ?)
            `;
            const [roomResult] = await connection.execute(roomQuery, [roomCode, destination, leaderId]);
            const roomId = roomResult.insertId;

            // Add leader as room member
            const memberQuery = `
                INSERT INTO room_members (room_id, user_id, is_leader) 
                VALUES (?, ?, true)
            `;
            await connection.execute(memberQuery, [roomId, leaderId]);

            await connection.commit();
            return roomId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async getRoomByCode(roomCode) {
        const query = `
            SELECT r.*, u.username as leader_name
            FROM rooms r
            JOIN users u ON r.leader_id = u.id
            WHERE r.room_code = ? AND r.status = 'active'
        `;
        const [rows] = await this.pool.execute(query, [roomCode]);
        return rows[0];
    }

    async joinRoom(roomId, userId) {
        const query = `
            INSERT INTO room_members (room_id, user_id) 
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE 
                status = 'active',
                left_at = NULL
        `;
        await this.pool.execute(query, [roomId, userId]);
    }

    async getRoomMembers(roomId) {
        const query = `
            SELECT rm.*, u.username, u.phone_number
            FROM room_members rm
            JOIN users u ON rm.user_id = u.id
            WHERE rm.room_id = ? AND rm.status = 'active'
            ORDER BY rm.is_leader DESC, rm.joined_at ASC
        `;
        const [rows] = await this.pool.execute(query, [roomId]);
        return rows;
    }

    async leaveRoom(roomId, userId) {
        const query = `
            UPDATE room_members 
            SET status = 'inactive', left_at = CURRENT_TIMESTAMP 
            WHERE room_id = ? AND user_id = ?
        `;
        await this.pool.execute(query, [roomId, userId]);
    }

    // Location Tracking
    async updateLocation(userId, roomId, locationData) {
        const query = `
            INSERT INTO location_updates 
            (user_id, room_id, latitude, longitude, accuracy, speed, heading) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            userId, roomId, 
            locationData.latitude, 
            locationData.longitude,
            locationData.accuracy || null,
            locationData.speed || null,
            locationData.heading || null
        ];
        await this.pool.execute(query, values);
    }

    async getLatestLocations(roomId) {
        const query = `
            SELECT * FROM room_locations WHERE room_id = ?
            ORDER BY is_leader DESC, last_update DESC
        `;
        const [rows] = await this.pool.execute(query, [roomId]);
        return rows;
    }

    async getLocationHistory(userId, roomId, limit = 100) {
        const query = `
            SELECT * FROM location_updates 
            WHERE user_id = ? AND room_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        `;
        const [rows] = await this.pool.execute(query, [userId, roomId, limit]);
        return rows;
    }

    // Geo-fence Violations
    async recordGeofenceViolation(violationData) {
        const query = `
            INSERT INTO geofence_violations 
            (room_id, user_id, violation_type, distance_from_leader, 
             leader_location_lat, leader_location_lng, 
             user_location_lat, user_location_lng) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            violationData.roomId,
            violationData.userId,
            violationData.violationType,
            violationData.distanceFromLeader,
            violationData.leaderLocation?.latitude,
            violationData.leaderLocation?.longitude,
            violationData.userLocation.latitude,
            violationData.userLocation.longitude
        ];
        const [result] = await this.pool.execute(query, values);
        return result.insertId;
    }

    async resolveGeofenceViolation(violationId) {
        const query = `
            UPDATE geofence_violations 
            SET resolved = true, resolved_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `;
        await this.pool.execute(query, [violationId]);
    }

    async getActiveViolations(roomId) {
        const query = `
            SELECT gv.*, u.username
            FROM geofence_violations gv
            JOIN users u ON gv.user_id = u.id
            WHERE gv.room_id = ? AND gv.resolved = false
            ORDER BY gv.created_at DESC
        `;
        const [rows] = await this.pool.execute(query, [roomId]);
        return rows;
    }

    // Notifications
    async createNotification(notificationData) {
        const query = `
            INSERT INTO notifications 
            (room_id, sender_id, notification_type, title, message, target_users, priority) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            notificationData.roomId,
            notificationData.senderId || null,
            notificationData.type,
            notificationData.title,
            notificationData.message,
            JSON.stringify(notificationData.targetUsers) || null,
            notificationData.priority || 'medium'
        ];
        const [result] = await this.pool.execute(query, values);
        return result.insertId;
    }

    async getRoomNotifications(roomId, limit = 50) {
        const query = `
            SELECT n.*, u.username as sender_name
            FROM notifications n
            LEFT JOIN users u ON n.sender_id = u.id
            WHERE n.room_id = ?
            ORDER BY n.created_at DESC
            LIMIT ?
        `;
        const [rows] = await this.pool.execute(query, [roomId, limit]);
        return rows;
    }

    // Emergency Alerts
    async createEmergencyAlert(alertData) {
        const query = `
            INSERT INTO emergency_alerts 
            (room_id, user_id, alert_type, location_lat, location_lng, description) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const values = [
            alertData.roomId,
            alertData.userId,
            alertData.type,
            alertData.location.latitude,
            alertData.location.longitude,
            alertData.description || null
        ];
        const [result] = await this.pool.execute(query, values);
        return result.insertId;
    }

    async getActiveEmergencies(roomId) {
        const query = `
            SELECT ea.*, u.username
            FROM emergency_alerts ea
            JOIN users u ON ea.user_id = u.id
            WHERE ea.room_id = ? AND ea.status = 'active'
            ORDER BY ea.created_at DESC
        `;
        const [rows] = await this.pool.execute(query, [roomId]);
        return rows;
    }

    async resolveEmergency(alertId, resolverUserId) {
        const query = `
            UPDATE emergency_alerts 
            SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `;
        await this.pool.execute(query, [alertId]);
    }

    // Statistics
    async updateTripStats(roomId, userId, statsData) {
        const query = `
            INSERT INTO trip_stats 
            (room_id, user_id, total_distance, max_speed, avg_speed, 
             duration_minutes, geofence_violations_count, stops_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                total_distance = VALUES(total_distance),
                max_speed = GREATEST(max_speed, VALUES(max_speed)),
                avg_speed = VALUES(avg_speed),
                duration_minutes = VALUES(duration_minutes),
                geofence_violations_count = VALUES(geofence_violations_count),
                stops_count = VALUES(stops_count)
        `;
        const values = [
            roomId, userId,
            statsData.totalDistance || 0,
            statsData.maxSpeed || 0,
            statsData.avgSpeed || 0,
            statsData.durationMinutes || 0,
            statsData.violationsCount || 0,
            statsData.stopsCount || 0
        ];
        await this.pool.execute(query, values);
    }

    async getTripStats(roomId, userId) {
        const query = 'SELECT * FROM trip_stats WHERE room_id = ? AND user_id = ?';
        const [rows] = await this.pool.execute(query, [roomId, userId]);
        return rows[0];
    }

    // Cleanup methods
    async cleanupOldData(daysToKeep = 30) {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            // Clean old location updates
            await connection.execute(`
                DELETE FROM location_updates 
                WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [daysToKeep]);

            // Clean resolved violations
            await connection.execute(`
                DELETE FROM geofence_violations 
                WHERE resolved = true AND resolved_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [daysToKeep]);

            // Clean old notifications
            await connection.execute(`
                DELETE FROM notifications 
                WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [daysToKeep]);

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = DatabaseService;