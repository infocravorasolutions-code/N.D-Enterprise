// ============================================
// FIXED REACT NATIVE APP CODE
// Replace the top section of your App.js with this
// ============================================

// SOLUTION: Use your computer's IP address instead of localhost
// Your computer's IP: 192.168.1.9 (found via ifconfig)
// ⚠️ IMPORTANT: Make sure your device and computer are on the SAME WiFi network

const YOUR_COMPUTER_IP = '192.168.1.9'; // ⚠️ UPDATE THIS if your IP changes

// For local development - use your computer's IP
const WEB_URL = `http://${YOUR_COMPUTER_IP}:3000`;
const BACKEND_URL = `http://${YOUR_COMPUTER_IP}:5678/api`;

// For production (uncomment when deploying)
// const WEB_URL = 'https://ndenterpries.com';
// const BACKEND_URL = 'https://api.ndenterpries.com/api';

// ============================================
// REST OF YOUR CODE STAYS THE SAME
// Just replace the WEB_URL and BACKEND_URL constants above
// ============================================

