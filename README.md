# MAARGA - Biker Tracking App

MAARGA is a standalone HTML web application designed for group biker safety and tracking. It provides real-time location sharing, geo-fencing, and emergency notifications to keep biking groups safe and connected.

## Features

### 🚴‍♂️ Core Functionality
- **Real-time Location Tracking**: GPS-based location sharing among group members
- **Room-based Groups**: Create or join biker groups using unique room codes
- **Geo-fencing**: 500-meter safety radius around the lead biker
- **Smart Notifications**: Automatic alerts for safety and coordination

### 🛡️ Safety Features
- **Leader Speed Control**: Notifications when leader goes too fast
- **Fall-behind Detection**: Alerts when bikers fall outside the geo-fence
- **Stop Detection**: Interactive prompts to determine if a biker has stopped
- **Emergency SOS**: Automatic accident detection and emergency alerts
- **Real-time Map View**: Live visualization of all group members

### 📱 User Experience
- **Mobile-first Design**: Optimized for smartphone usage while riding
- **Intuitive Interface**: Simple login with username and phone number
- **Visual Feedback**: Color-coded markers and status indicators
- **Browser Notifications**: Push notifications for important alerts

## Technology Stack

- **Frontend**: Standalone HTML5 with Vanilla JavaScript
- **Maps**: Native browser Geolocation API
- **Storage**: Browser localStorage for multi-tab synchronization
- **Styling**: CSS3 with responsive design
- **Location Services**: HTML5 Geolocation API
- **Real-time Features**: Socket.io-client ready (backend integration)

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Modern web browser with GPS support
- HTTPS connection (required for geolocation)

### Installation

1. **Download the app**
   - Download the project files
   - Extract to a folder on your computer

2. **Run the app**
   - Double-click `index.html` to open in your browser
   - OR use the `Launch_MAARGA.bat` file for easy startup
   - OR run from a local server: `python -m http.server 8000`

3. **Allow permissions**
   - Allow location permissions when prompted by your browser
   - For best results, use a modern browser (Chrome, Firefox, Safari, Edge)

### No Installation Required!

This is a standalone HTML app that runs entirely in your browser - no npm, React, or other dependencies needed.

## Usage Guide

### 1. Login
- Enter your username (minimum 3 characters)
- Provide a valid phone number
- Click "Continue to Ride"

### 2. Room Management
**Create Room:**
- Enter destination location
- Click "Create Room & Lead"
- Share the generated room code with other bikers

**Join Room:**
- Enter the 6-digit room code
- Click "Join Room"

### 3. Tracking Features
- **Start Tracking**: Begin GPS location sharing
- **View Map**: See all group members in real-time
- **Monitor Notifications**: Check alerts and safety messages
- **Geo-fence Visualization**: Blue circle shows 500m safety zone

## Safety Notifications

### For Leaders 👑
- **Slow Down Alert**: When group members fall behind the geo-fence
- **Speed Monitoring**: Continuous tracking of group cohesion

### For Group Members 👥
- **Outside Safe Zone**: When you're more than 500m from the leader
- **Stop Detection**: Interactive prompts to check your status
- **Catch Up Alerts**: Reminders to stay within the group

### Emergency Situations 🚨
- **SOS Alerts**: Automatic detection of potential accidents
- **Emergency Notifications**: Immediate alerts to all group members
- **Last Known Location**: GPS coordinates for emergency response

## Browser Compatibility

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ⚠️ Requires HTTPS for geolocation access

## Privacy & Permissions

### Required Permissions
- **Location Access**: For real-time GPS tracking
- **Notifications**: For safety alerts and emergency notifications

### Data Storage
- Local storage for user preferences and room data
- No personal data sent to external servers (in current demo mode)

## Development

### Project Structure
```
src/
├── components/
│   ├── Login.js & Login.css
│   ├── RoomSelection.js & RoomSelection.css
│   └── TrackingMap.js & TrackingMap.css
├── services/
│   ├── geolocation.js
│   └── notifications.js
├── App.js & App.css
└── index.js & index.css
```

### Key Services

**GeolocationService**
- GPS tracking and positioning
- Distance calculations
- Geo-fence validation
- Stop detection algorithms

**NotificationService**
- Alert management
- Emergency notifications
- Browser notification integration
- Safety monitoring

## Future Enhancements

- [ ] Backend integration with real-time WebSocket communication
- [ ] Offline mode support
- [ ] Route planning and navigation
- [ ] Historical trip data
- [ ] Group chat functionality
- [ ] Weather integration
- [ ] Advanced analytics dashboard

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@maarga.app or create an issue in the repository.

---

**Stay Safe, Ride Together! 🏍️**