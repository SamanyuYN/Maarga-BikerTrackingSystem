-- MAARGA Database Schema
-- This creates the necessary tables for the biker tracking app

-- Users table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE rooms (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    room_code VARCHAR(6) NOT NULL UNIQUE,
    destination VARCHAR(255) NOT NULL,
    leader_id VARCHAR(36) NOT NULL,
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    max_bikers INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_room_code (room_code),
    INDEX idx_status (status)
);

-- Room members table (many-to-many relationship)
CREATE TABLE room_members (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    is_leader BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    status ENUM('active', 'inactive', 'emergency') DEFAULT 'active',
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_room_user (room_id, user_id),
    INDEX idx_room_members (room_id, status)
);

-- Location tracking table
CREATE TABLE location_updates (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    room_id VARCHAR(36) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy FLOAT DEFAULT NULL,
    speed FLOAT DEFAULT NULL,
    heading FLOAT DEFAULT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_user_location (user_id, timestamp DESC),
    INDEX idx_room_location (room_id, timestamp DESC)
);

-- Geo-fence violations table
CREATE TABLE geofence_violations (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    violation_type ENUM('outside_fence', 'speed_limit', 'stopped', 'emergency') NOT NULL,
    distance_from_leader FLOAT DEFAULT NULL,
    leader_location_lat DECIMAL(10, 8) DEFAULT NULL,
    leader_location_lng DECIMAL(11, 8) DEFAULT NULL,
    user_location_lat DECIMAL(10, 8) NOT NULL,
    user_location_lng DECIMAL(11, 8) NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_violations (room_id, violation_type, resolved)
);

-- Notifications table
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    room_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) DEFAULT NULL,
    notification_type ENUM('geofence_violation', 'speed_alert', 'stop_detected', 'emergency_sos', 'general') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_users JSON DEFAULT NULL, -- null means all room members
    priority ENUM('low', 'medium', 'high', 'emergency') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_notifications (room_id, created_at DESC),
    INDEX idx_priority (priority, created_at DESC)
);

-- Emergency alerts table
CREATE TABLE emergency_alerts (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    alert_type ENUM('accident', 'manual_sos', 'no_response', 'medical') NOT NULL,
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    description TEXT DEFAULT NULL,
    status ENUM('active', 'resolved', 'false_alarm') DEFAULT 'active',
    responders JSON DEFAULT NULL, -- IDs of users who responded
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_emergency (room_id, status, created_at DESC)
);

-- Trip statistics table
CREATE TABLE trip_stats (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    total_distance FLOAT DEFAULT 0,
    max_speed FLOAT DEFAULT 0,
    avg_speed FLOAT DEFAULT 0,
    duration_minutes INT DEFAULT 0,
    geofence_violations_count INT DEFAULT 0,
    stops_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_trip_user (room_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(last_active DESC);
CREATE INDEX idx_rooms_active ON rooms(status, created_at DESC);
CREATE INDEX idx_location_recent ON location_updates(timestamp DESC);

-- Views for common queries
CREATE VIEW active_rooms AS
SELECT 
    r.*,
    u.username as leader_name,
    COUNT(rm.user_id) as member_count
FROM rooms r
JOIN users u ON r.leader_id = u.id
LEFT JOIN room_members rm ON r.id = rm.room_id AND rm.status = 'active'
WHERE r.status = 'active'
GROUP BY r.id;

CREATE VIEW room_locations AS
SELECT 
    rm.room_id,
    rm.user_id,
    u.username,
    rm.is_leader,
    lu.latitude,
    lu.longitude,
    lu.speed,
    lu.heading,
    lu.timestamp as last_update
FROM room_members rm
JOIN users u ON rm.user_id = u.id
JOIN location_updates lu ON rm.user_id = lu.user_id AND rm.room_id = lu.room_id
WHERE rm.status = 'active'
AND lu.timestamp = (
    SELECT MAX(timestamp) 
    FROM location_updates 
    WHERE user_id = rm.user_id AND room_id = rm.room_id
);