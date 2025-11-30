// Vercel-compatible MAARGA Server
// Simple version without WebSocket for serverless deployment

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();

// In-memory data storage
const users = new Map();
const rooms = new Map();
const userLocations = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Serve main page
app.get('/', (req, res) => {
    try {
        const htmlPath = path.join(__dirname, '../index.html');
        const html = fs.readFileSync(htmlPath, 'utf8');
        res.send(html);
    } catch (error) {
        res.status(500).send('<h1>MAARGA App</h1><p>Loading error. Please try again.</p>');
    }
});

// User registration/login
app.post('/api/users/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const userId = Date.now().toString();
        const user = {
            id: userId,
            username,
            password,
            createdAt: new Date()
        };

        users.set(userId, user);
        res.json({ user: { id: userId, username }, message: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Create room
app.post('/api/rooms/create', (req, res) => {
    try {
        const { userId, roomName, destination, maxMembers = 10 } = req.body;

        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const room = {
            id: roomCode,
            name: roomName,
            destination,
            leaderId: userId,
            maxMembers: parseInt(maxMembers),
            members: [userId],
            createdAt: new Date(),
            isActive: true
        };

        rooms.set(roomCode, room);
        res.json({ room, roomCode });
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// Join room
app.post('/api/rooms/join', (req, res) => {
    try {
        const { userId, roomCode } = req.body;
        const room = rooms.get(roomCode);

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        if (room.members.length >= room.maxMembers) {
            return res.status(400).json({ error: 'Room is full' });
        }

        if (!room.members.includes(userId)) {
            room.members.push(userId);
            rooms.set(roomCode, room);
        }

        res.json({ room, message: 'Joined room successfully' });
    } catch (error) {
        console.error('Join room error:', error);
        res.status(500).json({ error: 'Failed to join room' });
    }
});

// Update location
app.post('/api/location/update', (req, res) => {
    try {
        const { userId, roomCode, latitude, longitude, speed = 0 } = req.body;

        const locationData = {
            userId,
            roomCode,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            speed: parseFloat(speed),
            timestamp: new Date()
        };

        userLocations.set(userId, locationData);
        res.json({ message: 'Location updated successfully' });
    } catch (error) {
        console.error('Location update error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// Get room members and locations
app.get('/api/rooms/:roomCode/members', (req, res) => {
    try {
        const { roomCode } = req.params;
        const room = rooms.get(roomCode);

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const membersWithLocations = room.members.map(memberId => {
            const user = users.get(memberId);
            const location = userLocations.get(memberId);
            return {
                id: memberId,
                username: user ? user.username : 'Unknown',
                location: location || null
            };
        });

        res.json({ members: membersWithLocations });
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Failed to get room members' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'MAARGA Server is running',
        timestamp: new Date(),
        version: 'Simple (No WebSocket)'
    });
});

// Catch all other routes
app.get('*', (req, res) => {
    try {
        const htmlPath = path.join(__dirname, '../index.html');
        const html = fs.readFileSync(htmlPath, 'utf8');
        res.send(html);
    } catch (error) {
        res.status(500).send('<h1>MAARGA App</h1><p>Loading error. Please try again.</p>');
    }
});

module.exports = app;
