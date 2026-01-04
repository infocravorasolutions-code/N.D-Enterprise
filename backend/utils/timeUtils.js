/**
 * Time utility functions for consistent IST timezone handling
 */

/**
 * Get current time in IST timezone
 * @returns {Date} Current date and time in IST
 */
export const getCurrentISTTime = () => {
  // Return current UTC time - let the frontend handle timezone conversion
  // This prevents double timezone conversion issues
  return new Date();
};

/**
 * Get current time in IST timezone as string
 * @returns {string} Current date and time in IST as string
 */
export const getCurrentISTTimeString = () => {
  const now = new Date();
  return now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
};

/**
 * Get current year in IST timezone
 * @returns {number} Current year in IST
 */
export const getCurrentISTYear = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  return new Date(now.getTime() + istOffset).getFullYear();
};

/**
 * Check if a date is expired (in IST timezone)
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is expired
 */
export const isExpiredInIST = (date) => {
  const currentIST = getCurrentISTTime();
  return date < currentIST;
};

/**
 * Get time X hours ago in IST timezone
 * @param {number} hours - Number of hours to subtract
 * @returns {Date} Date X hours ago in IST
 */
export const getHoursAgoInIST = (hours) => {
  const currentIST = getCurrentISTTime();
  return new Date(currentIST.getTime() - (hours * 60 * 60 * 1000));
};

/**
 * Get current hour in IST timezone
 * @returns {number} Current hour in IST (0-23)
 */
export const getCurrentISTHour = () => {
  const now = new Date();
  // Get hour in IST timezone
  const istHour = parseInt(now.toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false
  }));
  return istHour;
};

/**
 * Format date for API response in IST timezone
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string in IST
 */
export const formatDateForAPI = (date) => {
  if (!date) return null;
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istDate = new Date(date.getTime() + istOffset);
  return istDate.toISOString().replace('Z', '+05:30');
};

/**
 * Format attendance object for API response with IST dates
 * @param {Object} attendance - Attendance object
 * @returns {Object} Formatted attendance object
 */
export const formatAttendanceForAPI = (attendance) => {
  if (!attendance) return null;
  
  const formatted = { ...attendance.toObject ? attendance.toObject() : attendance };
  
  // Return dates as ISO strings without additional timezone conversion
  // Let the frontend handle timezone display
  if (formatted.stepIn) {
    formatted.stepIn = new Date(formatted.stepIn).toISOString();
  }
  if (formatted.stepOut) {
    formatted.stepOut = new Date(formatted.stepOut).toISOString();
  }
  if (formatted.createdAt) {
    formatted.createdAt = new Date(formatted.createdAt).toISOString();
  }
  if (formatted.updatedAt) {
    formatted.updatedAt = new Date(formatted.updatedAt).toISOString();
  }
  
  return formatted;
};
