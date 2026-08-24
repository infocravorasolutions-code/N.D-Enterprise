// Environment Configuration
const isLocalHost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

// API Base URLs
const PRODUCTION_API_URL = import.meta.env.VITE_API_URL || 'https://api.ndenterpries.com/api';
const LOCAL_API_URL = 'http://localhost:5656/api';

// Static File URLs (for images/uploads)
const PRODUCTION_STATIC_URL = import.meta.env.VITE_STATIC_URL || 'https://api.ndenterpries.com/static';
const LOCAL_STATIC_URL = 'http://localhost:5656/static';

// Export the appropriate API URL based on environment
export const API_BASE_URL = isLocalHost ? LOCAL_API_URL : PRODUCTION_API_URL;

// Export static file URL
export const STATIC_URL = isLocalHost ? LOCAL_STATIC_URL : PRODUCTION_STATIC_URL;

// Export environment flag for conditional logic if needed
export const IS_PROD = !isLocalHost;

// Helper function to get full static file URL
export const getStaticUrl = (filename) => {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `${STATIC_URL}/${filename}`;
};

// Log current environment (helpful for debugging)
console.log(`🌍 Environment: ${isLocalHost ? 'LOCAL (localhost:5656)' : 'PRODUCTION'}`);
console.log(`🔗 API Base URL: ${API_BASE_URL}`);
console.log(`📁 Static URL: ${STATIC_URL}`);


