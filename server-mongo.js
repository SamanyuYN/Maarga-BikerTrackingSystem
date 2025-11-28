// MAARGA MongoDB Server
// Real-time biker tracking with MongoDB

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { User, Room, Location, GeofenceViolation, EmergencyAlert, TripStats } = require('./database/models');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Configure this for production
        methods: ["GET", "POST"]
    }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('🍃 Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
});
app.use('/api', limiter);

// Store active rooms and users in memory for quick access
const activeRooms = new Map();
const userSockets = new Map();

// API Routes

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// User Management
app.post('/api/users/login', async (req, res) => {
    try {
        const { username, phoneNumber } = req.body;
        
        if (!username || !phoneNumber) {
            return res.status(400).json({ error: 'Username and phone number required' });
        }

        let user = await User.findOne({ username });
        if (!user) {
            user = new User({ username, phoneNumber });
            await user.save();
        } else {
            user.phoneNumber = phoneNumber;
            user.lastActive = new Date();
            await user.save();
        }
        
        res.json({ 
            success: true, 
            user: { 
                id: user._id, 
                username: user.username, 
                phoneNumber: user.phoneNumber 
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
        
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if room already exists
        const existingRoom = await Room.findOne({ code: roomCode });
        if (existingRoom) {
            return res.status(409).json({ error: 'Room code already exists' });
        }

        const room = new Room({
            code: roomCode,
            destination,
            leaderId: user._id,
            leaderUsername: username,
            members: [{
                userId: user._id,
                username: username,
                isLeader: true
            }]
        });

        await room.save();
        
        // Add to active rooms
        activeRooms.set(roomCode, {
            id: room._id,
            code: roomCode,
            destination,
            leaderId: user._id,
            leaderUsername: username,
            members: [{ id: user._id, username, isLeader: true }],
            createdAt: new Date()
        });

        res.json({ success: true, roomId: room._id, roomCode });
    } catch (error) {
        console.error('Room creation error:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

app.post('/api/rooms/join', async (req, res) => {
    try {
        const { roomCode, username } = req.body;
        
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const room = await Room.findOne({ code: roomCode, status: 'active' });
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Check if user is already in room
        const existingMember = room.members.find(m => m.userId.toString() === user._id.toString());
        if (!existingMember) {
            room.members.push({
                userId: user._id,
                username: username,
                isLeader: false
            });
            await room.save();
        }

        // Update active rooms
        if (activeRooms.has(roomCode)) {
            const roomData = activeRooms.get(roomCode);
            const existingActiveMember = roomData.members.find(m => m.id.toString() === user._id.toString());
            if (!existingActiveMember) {
                roomData.members.push({ id: user._id, username, isLeader: false });
            }
        }

        res.json({ success: true, room: { id: room._id, code: roomCode, destination: room.destination } });
    } catch (error) {
        console.error('Room join error:', error);
        res.status(500).json({ error: 'Failed to join room' });
    }
});

app.get('/api/rooms/:roomCode/members', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const room = await Room.findOne({ code: roomCode }).populate('members.userId');
        
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json({ members: room.members });
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Failed to get room members' });
    }
});

// Location Updates
app.post('/api/location/update', async (req, res) => {
    try {
        const { username, roomCode, location } = req.body;
        
        const user = await User.findOne({ username });
        const room = await Room.findOne({ code: roomCode });
        
        if (!user || !room) {
            return res.status(404).json({ error: 'User or room not found' });
        }

        const locationUpdate = new Location({
            userId: user._id,
            username: user.username,
            roomId: room._id,
            roomCode: roomCode,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            speed: location.speed,
            heading: location.heading
        });

        await locationUpdate.save();
        
        // Broadcast location update to room
        io.to(roomCode).emit('locationUpdate', {
            userId: user._id,
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
        const room = await Room.findOne({ code: roomCode });
        
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Get latest location for each user in the room
        const locations = await Location.aggregate([
            { $match: { roomId: room._id } },
            { $sort: { createdAt: -1 } },
            { $group: {
                _id: "$userId",
                username: { $first: "$username" },
                latitude: { $first: "$latitude" },
                longitude: { $first: "$longitude" },
                accuracy: { $first: "$accuracy" },
                speed: { $first: "$speed" },
                timestamp: { $first: "$createdAt" }
            }}
        ]);

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
        
        const user = await User.findOne({ username });
        const room = await Room.findOne({ code: roomCode });
        
        if (!user || !room) {
            return res.status(404).json({ error: 'User or room not found' });
        }

        const alert = new EmergencyAlert({
            roomId: room._id,
            userId: user._id,
            username: user.username,
            alertType: alertType,
            location: location,
            description: description
        });

        await alert.save();

        // Broadcast emergency to all room members
        io.to(roomCode).emit('emergencyAlert', {
            alertId: alert._id,
            username: user.username,
            type: alertType,
            location,
            description,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, alertId: alert._id });
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
            
            socket.join(roomCode);
            userSockets.set(username, socket.id);
            
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
            
            socket.to(roomCode).emit('locationUpdate', {
                username,
                location,
                timestamp: new Date().toISOString()
            });

            // Store in database (async, don't wait)
            const user = await User.findOne({ username });
            const room = await Room.findOne({ code: roomCode });
            if (user && room) {
                const locationUpdate = new Location({
                    userId: user._id,
                    username: user.username,
                    roomId: room._id,
                    roomCode: roomCode,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy,
                    speed: location.speed,
                    heading: location.heading
                });
                locationUpdate.save().catch(console.error);
            }
        } catch (error) {
            console.error('Real-time location update error:', error);
        }
    });

    // Geo-fence Violations
    socket.on('geofenceViolation', (data) => {
        const { username, roomCode, violation } = data;
        
        socket.to(roomCode).emit('geofenceAlert', {
            username,
            violation,
            timestamp: new Date().toISOString()
        });
    });

    // General Notifications
    socket.on('notification', (data) => {
        const { roomCode, message, type, sender } = data;
        
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
        
        socket.to(roomCode).emit('userLeft', {
            username,
            timestamp: new Date().toISOString()
        });

        console.log(`${username} left room ${roomCode}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
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
            await mongoose.connection.close();
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
    console.log(`🍃 Using MongoDB for persistent data`);
});

module.exports = { app, server, io };