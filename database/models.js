// MongoDB Models for MAARGA
const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Room Schema  
const roomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    length: 6
  },
  destination: {
    type: String,
    required: true,
    trim: true
  },
  leaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leaderUsername: String,
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    isLeader: {
      type: Boolean,
      default: false
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'left'],
      default: 'active'
    }
  }]
}, {
  timestamps: true
});

// Location Update Schema
const locationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: String,
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  roomCode: String,
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  accuracy: Number,
  speed: Number,
  heading: Number
}, {
  timestamps: true
});

// Geofence Violation Schema
const violationSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: String,
  violationType: {
    type: String,
    enum: ['outside_fence', 'speed_limit', 'stopped_detected'],
    default: 'outside_fence'
  },
  distanceFromLeader: Number,
  leaderLocation: {
    latitude: Number,
    longitude: Number
  },
  userLocation: {
    latitude: Number,
    longitude: Number
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date
}, {
  timestamps: true
});

// Emergency Alert Schema
const alertSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: String,
  alertType: {
    type: String,
    enum: ['emergency', 'help', 'accident', 'breakdown'],
    default: 'emergency'
  },
  location: {
    latitude: Number,
    longitude: Number
  },
  description: String,
  status: {
    type: String,
    enum: ['active', 'resolved', 'false_alarm'],
    default: 'active'
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Trip Statistics Schema
const tripStatsSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalDistance: {
    type: Number,
    default: 0
  },
  maxSpeed: {
    type: Number,
    default: 0
  },
  avgSpeed: {
    type: Number,
    default: 0
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  violationsCount: {
    type: Number,
    default: 0
  },
  stopsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create Models
const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);
const Location = mongoose.model('Location', locationSchema);
const GeofenceViolation = mongoose.model('GeofenceViolation', violationSchema);
const EmergencyAlert = mongoose.model('EmergencyAlert', alertSchema);
const TripStats = mongoose.model('TripStats', tripStatsSchema);

module.exports = {
  User,
  Room,
  Location,
  GeofenceViolation,
  EmergencyAlert,
  TripStats
};