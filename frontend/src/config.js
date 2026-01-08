// Environment Configuration
// Set IS_PRODUCTION to true for production, false for local development

const IS_PRODUCTION = false; // Change to false for local development

// API Base URLs
const PRODUCTION_API_URL = 'https://api.ndenterpries.com/api';
const LOCAL_API_URL = 'http://localhost:5656/api';

// Static File URLs (for images/uploads)
const PRODUCTION_STATIC_URL = 'https://api.ndenterpries.com/static';
const LOCAL_STATIC_URL = 'http://localhost:5678/static';

// Export the appropriate API URL based on environment
export const API_BASE_URL = IS_PRODUCTION ? PRODUCTION_API_URL : LOCAL_API_URL;

// Export static file URL
export const STATIC_URL = IS_PRODUCTION ? PRODUCTION_STATIC_URL : LOCAL_STATIC_URL;

// Export environment flag for conditional logic if needed
export const IS_PROD = IS_PRODUCTION;

// Helper function to get full static file URL
export const getStaticUrl = (filename) => {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `${STATIC_URL}/${filename}`;
};

// Log current environment (helpful for debugging)
console.log(`🌍 Environment: ${IS_PRODUCTION ? 'PRODUCTION' : 'LOCAL'}`);
console.log(`🔗 API Base URL: ${API_BASE_URL}`);
console.log(`📁 Static URL: ${STATIC_URL}`);

