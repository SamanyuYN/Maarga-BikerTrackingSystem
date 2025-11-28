// Simple MAARGA Server - No Database Required
// Uses in-memory storage for immediate deployment

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// In-memory data storage (for demo purposes)
const users = new Map();
const rooms = new Map();
const userLocations = new Map();
const userSockets = new Map();

// Middleware
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// API Routes

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        activeUsers: users.size,
        activeRooms: rooms.size
    });
});

// User login/registration
app.post('/api/users/login', (req, res) => {
    try {
        const { username, phoneNumber } = req.body;
        
        if (!username || !phoneNumber) {
            return res.status(400).json({ error: 'Username and phone number required' });
        }

        const user = {
            id: Date.now().toString(),
            username,
            phoneNumber,
            joinedAt: new Date().toISOString()
        };
        
        users.set(username, user);
        
        res.json({ 
            success: true, 
            user: { 
                id: user.id, 
                username: user.username, 
                phoneNumber: user.phoneNumber 
            } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Create room
app.post('/api/rooms/create', (req, res) => {
    try {
        const { roomCode, destination, username } = req.body;
        
        const user = users.get(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (rooms.has(roomCode)) {
            return res.status(409).json({ error: 'Room code already exists' });
        }

        const room = {
            id: Date.now().toString(),
            code: roomCode,
            destination,
            leaderId: user.id,
            leaderUsername: username,
            members: [{ ...user, isLeader: true }],
            createdAt: new Date().toISOString(),
            status: 'active'
        };
        
        rooms.set(roomCode, room);

        res.json({ success: true, roomId: room.id, roomCode });
    } catch (error) {
        console.error('Room creation error:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// Join room
app.post('/api/rooms/join', (req, res) => {
    try {
        const { roomCode, username } = req.body;
        
        const user = users.get(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const room = rooms.get(roomCode);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Check if user is already in room
        const existingMember = room.members.find(m => m.username === username);
        if (!existingMember) {
            room.members.push({ ...user, isLeader: false });
        }

        res.json({ 
            success: true, 
            room: { 
                id: room.id, 
                code: roomCode, 
                destination: room.destination,
                members: room.members 
            } 
        });
    } catch (error) {
        console.error('Room join error:', error);
        res.status(500).json({ error: 'Failed to join room' });
    }
});

// Get room members
app.get('/api/rooms/:roomCode/members', (req, res) => {
    try {
        const { roomCode } = req.params;
        const room = rooms.get(roomCode);
        
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json({ members: room.members });
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Failed to get room members' });
    }
});

// Update location
app.post('/api/location/update', (req, res) => {
    try {
        const { username, roomCode, location } = req.body;
        
        const user = users.get(username);
        const room = rooms.get(roomCode);
        
        if (!user || !room) {
            return res.status(404).json({ error: 'User or room not found' });
        }

        // Store location
        const locationKey = `${username}-${roomCode}`;
        userLocations.set(locationKey, {
            ...location,
            username,
            roomCode,
            timestamp: new Date().toISOString()
        });
        
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

// Get locations
app.get('/api/location/:roomCode', (req, res) => {
    try {
        const { roomCode } = req.params;
        
        const locations = [];
        for (const [key, location] of userLocations) {
            if (location.roomCode === roomCode) {
                locations.push(location);
            }
        }
        
        res.json({ locations });
    } catch (error) {
        console.error('Get locations error:', error);
        res.status(500).json({ error: 'Failed to get locations' });
    }
});

// Emergency alert
app.post('/api/emergency', (req, res) => {
    try {
        const { username, roomCode, alertType, location, description } = req.body;
        
        const user = users.get(username);
        const room = rooms.get(roomCode);
        
        if (!user || !room) {
            return res.status(404).json({ error: 'User or room not found' });
        }

        const alertId = Date.now().toString();

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

// Serve main HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// WebSocket handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinRoom', (data) => {
        try {
            const { roomCode, username } = data;
            
            socket.join(roomCode);
            userSockets.set(username, socket.id);
            
            socket.to(roomCode).emit('userJoined', {
                username,
                timestamp: new Date().toISOString()
            });

            const room = rooms.get(roomCode);
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

    socket.on('locationUpdate', (data) => {
        try {
            const { username, roomCode, location } = data;
            
            socket.to(roomCode).emit('locationUpdate', {
                username,
                location,
                timestamp: new Date().toISOString()
            });

            // Store location in memory
            const locationKey = `${username}-${roomCode}`;
            userLocations.set(locationKey, {
                ...location,
                username,
                roomCode,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Real-time location update error:', error);
        }
    });

    socket.on('geofenceViolation', (data) => {
        const { username, roomCode, violation } = data;
        
        socket.to(roomCode).emit('geofenceAlert', {
            username,
            violation,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('notification', (data) => {
        const { roomCode, message, type, sender } = data;
        
        io.to(roomCode).emit('notification', {
            message,
            type,
            sender,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('leaveRoom', (data) => {
        const { roomCode, username } = data;
        
        socket.leave(roomCode);
        userSockets.delete(username);
        
        // Remove user from room members
        const room = rooms.get(roomCode);
        if (room) {
            room.members = room.members.filter(m => m.username !== username);
            if (room.members.length === 0) {
                rooms.delete(roomCode); // Delete empty room
            }
        }
        
        socket.to(roomCode).emit('userLeft', {
            username,
            timestamp: new Date().toISOString()
        });

        console.log(`${username} left room ${roomCode}`);
    });

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

// Cleanup old data periodically (every hour)
setInterval(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // Clean old locations
    for (const [key, location] of userLocations.entries()) {
        if (location.timestamp < oneHourAgo) {
            userLocations.delete(key);
        }
    }
    
    // Clean empty rooms
    for (const [roomCode, room] of rooms.entries()) {
        if (room.members.length === 0) {
            rooms.delete(roomCode);
        }
    }
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚴‍♂️ MAARGA Server running on port ${PORT}`);
    console.log(`📱 Access at: http://localhost:${PORT}`);
    console.log(`💡 This version uses in-memory storage (no database required)`);
    console.log(`🚀 Ready for deployment to Heroku, Railway, Vercel, etc.`);
});

module.exports = { app, server };