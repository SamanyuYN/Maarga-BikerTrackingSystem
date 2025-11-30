// Vercel-compatible MAARGA Server
// Simple version without WebSocket for serverless deployment

const express = require('express');
const cors = require('cors');

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

// Catch all other routes - redirect to home
app.get('*', (req, res) => {
    res.redirect('/');
});

module.exports = app;
