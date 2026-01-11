# React Native WebView Localhost Fix

## Problem
Error code -6 (`NET::ERR_CONNECTION_REFUSED`) occurs when using `localhost` in React Native WebView because `localhost` refers to the device itself, not your development machine.

## Solution

### 1. Update Your React Native App Code

Replace the `WEB_URL` and `BACKEND_URL` in your React Native app:

```javascript
// Replace localhost with your computer's IP address
// Find your IP: On Mac/Linux run: ifconfig | grep "inet " | grep -v 127.0.0.1
// On Windows run: ipconfig and look for IPv4 Address

const YOUR_COMPUTER_IP = '192.168.1.9'; // ⚠️ UPDATE THIS TO YOUR ACTUAL IP

// For local development
const WEB_URL = `http://${YOUR_COMPUTER_IP}:3000`;
const BACKEND_URL = `http://${YOUR_COMPUTER_IP}:5678/api`;

// For production (use these when deployed)
// const WEB_URL = 'https://ndenterpries.com';
// const BACKEND_URL = 'https://api.ndenterpries.com/api';
```

### 2. Update Vite Config to Accept Network Connections

The Vite dev server needs to be configured to accept connections from your network:

```javascript
// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 3000,
    open: true
  }
})
```

### 3. Start Your Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The frontend should now be accessible at `http://192.168.1.9:3000` from your device.

### 4. Firewall Settings

Make sure your firewall allows connections on ports 3000 and 5678:

**macOS:**
- System Settings → Network → Firewall → Options
- Allow incoming connections for Node.js

**Windows:**
- Windows Defender Firewall → Allow an app
- Allow Node.js through firewall

### 5. Verify Connection

1. Make sure your device and computer are on the same WiFi network
2. Test in browser on your computer: `http://192.168.1.9:3000`
3. Test in browser on your device: `http://192.168.1.9:3000`
4. If both work, update your React Native app with the IP

### 6. Dynamic IP Address (Optional)

If your IP changes frequently, you can:
- Use a static IP on your router
- Use ngrok for a stable URL
- Or update the IP in your React Native app when it changes

## Updated React Native Code Snippet

```javascript
// At the top of your App.js file
const YOUR_COMPUTER_IP = '192.168.1.9'; // ⚠️ Change this!

// For local development
const WEB_URL = `http://${YOUR_COMPUTER_IP}:3000`;
const BACKEND_URL = `http://${YOUR_COMPUTER_IP}:5678/api`;

// For production
// const WEB_URL = 'https://ndenterpries.com';
// const BACKEND_URL = 'https://api.ndenterpries.com/api';
```

## Troubleshooting

### Still getting error -6?
1. ✅ Check both devices are on same WiFi
2. ✅ Verify IP address is correct: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)
3. ✅ Check firewall isn't blocking ports
4. ✅ Make sure Vite server is running with `host: '0.0.0.0'`
5. ✅ Test URL in device browser first

### Can't find your IP?
- **Mac/Linux:** `ifconfig | grep "inet " | grep -v 127.0.0.1`
- **Windows:** `ipconfig` (look for IPv4 Address under your WiFi adapter)

