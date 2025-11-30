// Vercel-compatible MAARGA Server
// Simple version without WebSocket for serverless deployment

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// MongoDB Connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://maarga-admin:C0meFast2836@maarga-cluster.bwdogps.mongodb.net/maarga-production?retryWrites=true&w=majority&appName=maarga-cluster';
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
    }
};

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

// Serve main page
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>MAARGA - Biker Tracking System</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
            .container { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            input, button { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; }
            button { background: #007bff; color: white; cursor: pointer; }
            button:hover { background: #0056b3; }
            .error { color: red; margin: 10px 0; }
            .success { color: green; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚴‍♂️ MAARGA</h1>
            <p>Biker Tracking System</p>
            
            <form id="loginForm">
                <input type="text" id="username" placeholder="Enter your name" required>
                <input type="password" id="password" placeholder="Enter password" required>
                <button type="submit">Login</button>
            </form>
            
            <div id="message"></div>
            
            <div id="roomSection" style="display:none;">
                <h3>Create or Join Room</h3>
                <input type="text" id="destination" placeholder="Destination">
                <button onclick="createRoom()">Create Room</button>
                
                <hr>
                
                <input type="text" id="roomCode" placeholder="Room Code">
                <button onclick="joinRoom()">Join Room</button>
            </div>
        </div>
        
        <script>
            let currentUser = null;
            
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                try {
                    const response = await fetch('/api/users/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        currentUser = data.user;
                        document.getElementById('message').innerHTML = '<div class="success">Login successful!</div>';
                        document.getElementById('roomSection').style.display = 'block';
                    } else {
                        document.getElementById('message').innerHTML = '<div class="error">' + data.error + '</div>';
                    }
                } catch (error) {
                    document.getElementById('message').innerHTML = '<div class="error">Connection error</div>';
                }
            });
            
            async function createRoom() {
                if (!currentUser) return;
                
                const destination = document.getElementById('destination').value;
                if (!destination) {
                    alert('Please enter a destination');
                    return;
                }
                
                try {
                    const response = await fetch('/api/rooms/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            userId: currentUser.id, 
                            roomName: destination,
                            destination: destination 
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        alert('Room created! Code: ' + data.roomCode);
                    } else {
                        alert('Error: ' + data.error);
                    }
                } catch (error) {
                    alert('Connection error');
                }
            }
            
            async function joinRoom() {
                if (!currentUser) return;
                
                const roomCode = document.getElementById('roomCode').value;
                if (!roomCode) {
                    alert('Please enter a room code');
                    return;
                }
                
                try {
                    const response = await fetch('/api/rooms/join', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            userId: currentUser.id, 
                            roomCode: roomCode 
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        alert('Joined room successfully!');
                    } else {
                        alert('Error: ' + data.error);
                    }
                } catch (error) {
                    alert('Connection error');
                }
            }
        </script>
    </body>
    </html>
    `);
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

module.exports = app;

