# MAARGA Database Setup Guide

## 📊 Database Architecture

The MAARGA biker tracking app uses **MySQL** for robust, real-time data management with the following key components:

### 🗂️ **Database Tables:**

1. **`users`** - User accounts and profiles
2. **`rooms`** - Biker group rooms with codes  
3. **`room_members`** - Who's in which room
4. **`location_updates`** - Real-time GPS tracking data
5. **`geofence_violations`** - Safety zone breach records
6. **`notifications`** - All app notifications
7. **`emergency_alerts`** - SOS and accident reports
8. **`trip_stats`** - Ride statistics and analytics

### 🔄 **Real-time Features:**
- **Live location tracking** every 5 seconds
- **Geo-fence monitoring** with 500m radius
- **Emergency detection** and automated alerts
- **Group notifications** for safety events

## 🚀 **Quick Setup Instructions:**

### **1. Install MySQL**
```bash
# Windows (using Chocolatey)
choco install mysql

# Or download from: https://dev.mysql.com/downloads/mysql/
```

### **2. Create Database**
```sql
CREATE DATABASE maarga_db;
CREATE USER 'maarga_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON maarga_db.* TO 'maarga_user'@'localhost';
FLUSH PRIVILEGES;
```

### **3. Run Schema**
```bash
mysql -u maarga_user -p maarga_db < database/schema.sql
```

### **4. Install Dependencies**
```bash
npm install mysql2 express socket.io jsonwebtoken bcryptjs
```

### **5. Configure Environment**
Create `.env` file:
```env
DB_HOST=localhost
DB_USER=maarga_user
DB_PASSWORD=your_secure_password
DB_NAME=maarga_db
DB_PORT=3306
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
```

## 📈 **Database Features:**

### **📍 Location Tracking:**
- Stores GPS coordinates with timestamp
- Tracks speed, heading, and accuracy
- Optimized indexes for real-time queries

### **🛡️ Geo-fencing:**
- Records safety zone violations
- Tracks distance from group leader
- Automated resolution tracking

### **🚨 Emergency System:**
- Multiple alert types (accident, SOS, medical)
- Location-based emergency data
- Response tracking and resolution

### **📊 Analytics:**
- Trip statistics (distance, speed, duration)
- Violation counts and patterns
- Performance metrics

## 🔧 **Alternative Database Options:**

### **Option 1: PostgreSQL**
- Better for complex queries
- Excellent geospatial support with PostGIS
- More robust for large-scale deployments

### **Option 2: MongoDB**
- Document-based storage
- Better for rapid development
- Good for real-time location data

### **Option 3: Firebase Realtime Database**
- Serverless solution
- Built-in real-time sync
- Easy integration with frontend

### **Option 4: Supabase**
- PostgreSQL-based
- Real-time subscriptions
- Built-in authentication

## 📱 **Current App Data Flow:**

```
User Login → localStorage (username, phone)
    ↓
Create/Join Room → localStorage (room data)
    ↓
GPS Tracking → Browser memory + notifications
    ↓
Geo-fence Check → Real-time alerts
    ↓
Emergency Detection → SOS notifications
```

## 🔄 **Upgrading to Database:**

To connect your current MAARGA app to a database:

1. **Replace localStorage calls** with API calls
2. **Add WebSocket connection** for real-time updates
3. **Implement authentication** with JWT tokens
4. **Add offline support** with local caching

Your current app works perfectly as a demo, and the database schema is ready for production scaling!

## 📞 **Next Steps:**

Would you like me to:
1. **Set up a specific database** (MySQL/PostgreSQL/MongoDB)?
2. **Create the backend API** server?
3. **Add WebSocket integration** for real-time features?
4. **Implement authentication** system?

The database foundation is ready - just let me know which direction you'd like to go! 🚀