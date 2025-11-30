// Vercel-compatible MAARGA Server
// Simple version without WebSocket for serverless deployment

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();

// MongoDB Connection
let isMongoConnected = false;
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://maarga-admin:C0meFast2836@maarga-cluster.bwdogps.mongodb.net/maarga-production?retryWrites=true&w=majority&appName=maarga-cluster';
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB connected successfully');
        isMongoConnected = true;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.log('🔄 App will run with in-memory storage as fallback');
        isMongoConnected = false;
    }
};

// In-memory fallback storage
const memoryUsers = new Map();
const memoryRooms = new Map();
const memoryLocations = new Map();

// MongoDB Schemas
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: String,
    password: String,
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
});

const RoomSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: String,
    destination: String,
    leaderId: { type: String, required: true },
    maxMembers: { type: Number, default: 10 },
    members: [{ type: String }],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const LocationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    roomCode: String,
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speed: { type: Number, default: 0 },
    accuracy: Number,
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Room = mongoose.model('Room', RoomSchema);
const Location = mongoose.model('Location', LocationSchema);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Serve main page - the full index.html with maps and tracking
app.get('/', (req, res) => {
    try {
        const htmlPath = path.join(__dirname, '../index.html');
        const html = fs.readFileSync(htmlPath, 'utf8');
        res.send(html);
    } catch (error) {
        console.error('Error serving index.html:', error);
        res.status(500).send('<h1>MAARGA App</h1><p>Loading error. Please refresh.</p>');
    }
});

// User registration/login
app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Find existing user or create new one
        let user = await User.findOne({ username });
        
        if (!user) {
            user = new User({
                username,
                password,
                email: `${username}@maarga.app`
            });
            await user.save();
        } else {
            user.lastActive = new Date();
            await user.save();
        }

        res.json({ 
            user: { 
                id: user._id.toString(), 
                username: user.username,
                email: user.email 
            }, 
            message: 'Login successful' 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Create room
app.post('/api/rooms/create', async (req, res) => {
    try {
        const { userId, roomName, destination, maxMembers = 10 } = req.body;

        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const room = new Room({
            code: roomCode,
            name: roomName || destination,
            destination,
            leaderId: userId,
            maxMembers: parseInt(maxMembers),
            members: [userId],
            isActive: true
        });

        await room.save();
        
        res.json({ 
            room: {
                code: room.code,
                name: room.name,
                destination: room.destination,
                memberCount: room.members.length
            }, 
            roomCode: room.code 
        });
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// Join room
app.post('/api/rooms/join', async (req, res) => {
    try {
        const { userId, roomCode } = req.body;
        const room = await Room.findOne({ code: roomCode.toUpperCase() });

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        if (room.members.length >= room.maxMembers) {
            return res.status(400).json({ error: 'Room is full' });
        }

        if (!room.members.includes(userId)) {
            room.members.push(userId);
            await room.save();
        }

        res.json({ 
            room: {
                code: room.code,
                name: room.name,
                destination: room.destination,
                memberCount: room.members.length
            }, 
            message: 'Joined room successfully' 
        });
    } catch (error) {
        console.error('Join room error:', error);
        res.status(500).json({ error: 'Failed to join room' });
    }
});

// Update location
app.post('/api/location/update', async (req, res) => {
    try {
        const { userId, roomCode, latitude, longitude, speed = 0, accuracy } = req.body;

        const location = new Location({
            userId,
            roomCode: roomCode?.toUpperCase(),
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            speed: parseFloat(speed),
            accuracy: accuracy ? parseFloat(accuracy) : undefined
        });

        await location.save();
        res.json({ message: 'Location updated successfully' });
    } catch (error) {
        console.error('Location update error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// Get room members and locations
app.get('/api/rooms/:roomCode/members', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const room = await Room.findOne({ code: roomCode.toUpperCase() });

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const membersWithLocations = await Promise.all(
            room.members.map(async (memberId) => {
                const user = await User.findById(memberId);
                const location = await Location.findOne({ userId: memberId }).sort({ timestamp: -1 });
                
                return {
                    id: memberId,
                    username: user ? user.username : 'Unknown',
                    location: location ? {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        speed: location.speed,
                        timestamp: location.timestamp
                    } : null
                };
            })
        );

        res.json({ members: membersWithLocations });
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Failed to get room members' });
    }
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const roomCount = await Room.countDocuments();
        const locationCount = await Location.countDocuments();
        
        res.json({ 
            status: 'OK', 
            message: 'MAARGA Server with MongoDB is running',
            timestamp: new Date(),
            version: 'MongoDB + Vercel Serverless',
            database: {
                connected: mongoose.connection.readyState === 1,
                users: userCount,
                rooms: roomCount,
                locations: locationCount
            }
        });
    } catch (error) {
        res.json({ 
            status: 'OK', 
            message: 'MAARGA Server running (DB connection issue)',
            timestamp: new Date(),
            error: error.message
        });
    }
});

// Catch all other routes - redirect to home
app.get('*', (req, res) => {
    res.redirect('/');
});

// Start server (for local development)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`🚴‍♂️ MAARGA Server running on port ${PORT}`);
            console.log(`📱 Access at: http://localhost:${PORT}`);
            console.log(`🗄️ Database: ${isMongoConnected ? 'MongoDB Atlas' : 'In-Memory Fallback'}`);
        });
    });
}

module.exports = app;
