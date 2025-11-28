// MAARGA Backend Server
// Real-time biker tracking with multi-user support

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const DatabaseService = require('./database/DatabaseService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Configure this for production
        methods: ["GET", "POST"]
    }
});

// Initialize Database
const db = new DatabaseService();

// Middleware
app.use(helmet({
    contentSecurityPolicy: false // Disable for development - configure properly for production
}));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Store active rooms and users in memory for quick access
const activeRooms = new Map();
const userSockets = new Map();

// API Routes

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// User Management
app.post('/api/users/login', async (req, res) => {
    try {
        const { username, phoneNumber } = req.body;
        
        if (!username || !phoneNumber) {
            return res.status(400).json({ error: 'Username and phone number required' });
        }

        const userId = await db.createUser(username, phoneNumber);
        const user = await db.getUserByUsername(username);
        
        res.json({ 
            success: true, 
            user: { 
                id: user.id, 
                username: user.username, 
                phoneNumber: user.phone_number 
            } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Room Management
app.post('/api/rooms/create', async (req, res) => {
    try {
        const { roomCode, destination, username } = req.body;
        
        const user = await db.getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const roomId = await db.createRoom(roomCode, destination, user.id);
        
        // Add to active rooms
        activeRooms.set(roomCode, {
            id: roomId,
            code: roomCode,
            destination,
            leaderId: user.id,
            leaderUsername: username,
            members: [{ id: user.id, username, isLeader: true }],
            createdAt: new Date()
        });

        res.json({ success: true, roomId, roomCode });
    } catch (error) {
        console.error('Room creation error:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

app.post('/api/rooms/join', async (req, res) => {
    try {
        const { roomCode, username } = req.body;
        
        const user = await db.getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const room = await db.getRoomByCode(roomCode);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        await db.joinRoom(room.id, user.id);
        
        // Update active rooms
        if (activeRooms.has(roomCode)) {
            const roomData = activeRooms.get(roomCode);
            const existingMember = roomData.members.find(m => m.id === user.id);
            if (!existingMember) {
                roomData.members.push({ id: user.id, username, isLeader: false });
            }
        }

        res.json({ success: true, room: { id: room.id, code: roomCode, destination: room.destination } });
    } catch (error) {
        console.error('Room join error:', error);
        res.status(500).json({ error: 'Failed to join room' });
    }
});

app.get('/api/rooms/:roomCode/members', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const room = await db.getRoomByCode(roomCode);
        
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const members = await db.getRoomMembers(room.id);
        res.json({ members });
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Failed to get room members' });
    }
});

// Location Updates
app.post('/api/location/update', async (req, res) => {
    try {
        const { username, roomCode, location } = req.body;
        
        const user = await db.getUserByUsername(username);
        const room = await db.getRoomByCode(roomCode);
        
        if (!user || !room) {
            return res.status(404).json({ error: 'User or room not found' });
        }

        await db.updateLocation(user.id, room.id, location);
        
        // Broadcast location update to room
        io.to(roomCode).emit('locationUpdate', {
            userId: user.id,
            username: user.username,
            location,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Location update error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

app.get('/api/location/:roomCode', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const room = await db.getRoomByCode(roomCode);
        
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const locations = await db.getLatestLocations(room.id);
        res.json({ locations });
    } catch (error) {
        console.error('Get locations error:', error);
        res.status(500).json({ error: 'Failed to get locations' });
    }
});

// Emergency Alerts
app.post('/api/emergency', async (req, res) => {
    try {
        const { username, roomCode, alertType, location, description } = req.body;
        
        const user = await db.getUserByUsername(username);
        const room = await db.getRoomByCode(roomCode);
        
        if (!user || !room) {
            return res.status(404).json({ error: 'User or room not found' });
        }

        const alertId = await db.createEmergencyAlert({
            roomId: room.id,
            userId: user.id,
            type: alertType,
            location,
            description
        });

        // Broadcast emergency to all room members
        io.to(roomCode).emit('emergencyAlert', {
            alertId,
            username: user.username,
            type: alertType,
            location,
            description,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, alertId });
    } catch (error) {
        console.error('Emergency alert error:', error);
        res.status(500).json({ error: 'Failed to create emergency alert' });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// WebSocket Connection Handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join Room
    socket.on('joinRoom', async (data) => {
        try {
            const { roomCode, username } = data;
            
            // Join socket room
            socket.join(roomCode);
            
            // Store user-socket mapping
            userSockets.set(username, socket.id);
            
            // Notify room members
            socket.to(roomCode).emit('userJoined', {
                username,
                timestamp: new Date().toISOString()
            });

            // Send current room state to new user
            const room = activeRooms.get(roomCode);
            if (room) {
                socket.emit('roomState', {
                    members: room.members,
                    destination: room.destination
                });
            }

            console.log(`${username} joined room ${roomCode}`);
        } catch (error) {
            console.error('Join room error:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    // Real-time Location Updates
    socket.on('locationUpdate', async (data) => {
        try {
            const { username, roomCode, location } = data;
            
            // Broadcast to room members
            socket.to(roomCode).emit('locationUpdate', {
                username,
                location,
                timestamp: new Date().toISOString()
            });

            // Store in database (async, don't wait)
            const user = await db.getUserByUsername(username);
            const room = await db.getRoomByCode(roomCode);
            if (user && room) {
                db.updateLocation(user.id, room.id, location).catch(console.error);
            }
        } catch (error) {
            console.error('Real-time location update error:', error);
        }
    });

    // Geo-fence Violations
    socket.on('geofenceViolation', (data) => {
        const { username, roomCode, violation } = data;
        
        // Broadcast violation alert to room
        socket.to(roomCode).emit('geofenceAlert', {
            username,
            violation,
            timestamp: new Date().toISOString()
        });
    });

    // General Notifications
    socket.on('notification', (data) => {
        const { roomCode, message, type, sender } = data;
        
        // Broadcast to room
        io.to(roomCode).emit('notification', {
            message,
            type,
            sender,
            timestamp: new Date().toISOString()
        });
    });

    // Leave Room
    socket.on('leaveRoom', (data) => {
        const { roomCode, username } = data;
        
        socket.leave(roomCode);
        userSockets.delete(username);
        
        // Notify room members
        socket.to(roomCode).emit('userLeft', {
            username,
            timestamp: new Date().toISOString()
        });

        console.log(`${username} left room ${roomCode}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Clean up user-socket mapping
        for (const [username, socketId] of userSockets.entries()) {
            if (socketId === socket.id) {
                userSockets.delete(username);
                break;
            }
        }
    });
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Cleanup function
async function gracefulShutdown() {
    console.log('Received shutdown signal. Gracefully closing server...');
    
    server.close(async () => {
        console.log('HTTP server closed.');
        
        try {
            await db.close();
            console.log('Database connection closed.');
        } catch (error) {
            console.error('Error closing database:', error);
        }
        
        process.exit(0);
    });
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚴‍♂️ MAARGA Server running on port ${PORT}`);
    console.log(`📱 Access the app at: http://localhost:${PORT}`);
});

module.exports = { app, server, io };