import { API_BASE_URL } from '../config.js';

// Get token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// Set token in localStorage
export const setToken = (token) => {
  localStorage.setItem('token', token);
};

// Remove token from localStorage
export const removeToken = () => {
  localStorage.removeItem('token');
};

// Helper function to make API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    // Check if response is ok before parsing
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'API request failed' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', {
      endpoint,
      url,
      error: error.message,
    });
    throw error;
  }
};

// Helper function for FormData (file uploads)
const apiCallFormData = async (endpoint, formData, method = 'POST') => {
  const token = getToken();
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Employee APIs
export const employeeAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/employee/all${queryString ? `?${queryString}` : ''}`);
  },
  
  create: (employeeData, imageFile) => {
    const formData = new FormData();
    Object.keys(employeeData).forEach(key => {
      formData.append(key, employeeData[key]);
    });
    if (imageFile) {
      formData.append('image', imageFile);
    }
    return apiCallFormData('/employee/', formData);
  },
  
  update: (id, employeeData, imageFile) => {
    const formData = new FormData();
    Object.keys(employeeData).forEach(key => {
      formData.append(key, employeeData[key]);
    });
    if (imageFile) {
      formData.append('image', imageFile);
    }
    return apiCallFormData(`/employee/${id}`, formData, 'PUT');
  },
  
  delete: (id) => {
    return apiCall(`/employee/${id}`, { method: 'DELETE' });
  },
  
  deleteMultiple: (employeeIds) => {
    return apiCall('/employee/bulk-delete', {
      method: 'DELETE',
      body: JSON.stringify({ employeeIds }),
    });
  },
  
  // Manager-specific employee creation
  createByManager: (employeeData, imageFile) => {
    const formData = new FormData();
    Object.keys(employeeData).forEach(key => {
      formData.append(key, employeeData[key]);
    });
    if (imageFile) {
      formData.append('image', imageFile);
    }
    return apiCallFormData('/employee/manager', formData);
  },
  
  // Assign employees to a site
  assignEmployeesToSite: (siteId, employeeIds) => {
    return apiCall(`/site/${siteId}/assign-employees`, {
      method: 'POST',
      body: JSON.stringify({ employeeIds }),
    });
  },
};

// Manager/Supervisor APIs
export const managerAPI = {
  getAll: () => {
    return apiCall('/manager/all');
  },
  
  create: (managerData) => {
    return apiCall('/manager/', {
      method: 'POST',
      body: JSON.stringify(managerData),
    });
  },
  
  get: (id) => {
    return apiCall(`/manager/${id}`);
  },
  
  update: (id, managerData) => {
    return apiCall(`/manager/${id}`, {
      method: 'PUT',
      body: JSON.stringify(managerData),
    });
  },
  
  delete: (id) => {
    return apiCall(`/manager/${id}`, { method: 'DELETE' });
  },
  
  login: (email, password) => {
    return apiCall('/manager/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
};

// Dashboard APIs
export const dashboardAPI = {
  getData: () => {
    return apiCall('/dashboard/');
  },
};

// Attendance APIs
export const attendanceAPI = {
  getAll: (params = {}) => {
    // Map fromDate/toDate to startDate/endDate for backend compatibility
    const queryParams = { ...params };
    if (queryParams.fromDate) {
      queryParams.startDate = queryParams.fromDate;
      delete queryParams.fromDate;
    }
    if (queryParams.toDate) {
      queryParams.endDate = queryParams.toDate;
      delete queryParams.toDate;
    }
    const queryString = new URLSearchParams(queryParams).toString();
    // Backend returns { attendance: [...] } so we need to handle that
    return apiCall(`/attendence/${queryString ? `?${queryString}` : ''}`).then(response => {
      // Transform response to match expected format
      return { data: response.attendance || [] };
    });
  },
  
  getSummary: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    try {
      return await apiCall(`/attendence/summary${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      // Return default structure if API fails
      return { presentEmployees: 0 };
    }
  },
  
  getByEmployee: (employeeId) => {
    return apiCall(`/attendence/${employeeId}`);
  },
  
  stepIn: (data, imageFile) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });
    if (imageFile) {
      formData.append('stepInImage', imageFile);
    }
    return apiCallFormData('/attendence/step-in', formData);
  },
  
  stepOut: (data) => {
    return apiCall('/attendence/step-out', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: (attendanceId, data, imageFile) => {
    if (imageFile) {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });
      formData.append('stepInImage', imageFile);
      return apiCallFormData(`/attendence/${attendanceId}`, formData, 'PUT');
    } else {
      return apiCall(`/attendence/${attendanceId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
  },
  
  delete: (attendanceId) => {
    return apiCall(`/attendence/${attendanceId}`, { method: 'DELETE' });
  },
};

// Admin APIs
export const adminAPI = {
  getAll: () => {
    return apiCall('/admin/all');
  },
  
  create: (adminData) => {
    return apiCall('/admin/', {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
  },
  
  get: (id) => {
    return apiCall(`/admin/${id}`);
  },
  
  update: (id, adminData) => {
    return apiCall(`/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(adminData),
    });
  },
  
  delete: (id) => {
    return apiCall(`/admin/${id}`, { method: 'DELETE' });
  },
  
  login: (email, password) => {
    return apiCall('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
};

// Site/Event APIs
export const siteAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/site/all${queryString ? `?${queryString}` : ''}`);
  },
  
  get: (id) => {
    return apiCall(`/site/${id}`);
  },
  
  create: (siteData) => {
    return apiCall('/site/', {
      method: 'POST',
      body: JSON.stringify(siteData),
    });
  },
  
  update: (id, siteData) => {
    return apiCall(`/site/${id}`, {
      method: 'PUT',
      body: JSON.stringify(siteData),
    });
  },
  
  delete: (id) => {
    return apiCall(`/site/${id}`, { method: 'DELETE' });
  },
  
  getStats: (id) => {
    return apiCall(`/site/${id}/stats`);
  },
  
  getEmployees: (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/site/${id}/employees${queryString ? `?${queryString}` : ''}`);
  },
  
  getManagers: (id) => {
    return apiCall(`/site/${id}/managers`);
  },
  
  getAttendance: (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/site/${id}/attendance${queryString ? `?${queryString}` : ''}`);
  },
  
  assignEmployees: (siteId, employeeIds) => {
    return apiCall(`/site/${siteId}/assign-employees`, {
      method: 'POST',
      body: JSON.stringify({ employeeIds }),
    });
  },
  
  unassignEmployees: (siteId, employeeIds) => {
    return apiCall(`/site/${siteId}/unassign-employees`, {
      method: 'POST',
      body: JSON.stringify({ employeeIds }),
    });
  },
  
  reassignEmployees: (employeeIds, targetSiteId) => {
    return apiCall(`/site/reassign-employees`, {
      method: 'POST',
      body: JSON.stringify({ employeeIds, targetSiteId }),
    });
  },
};

export default {
  employeeAPI,
  managerAPI,
  dashboardAPI,
  attendanceAPI,
  adminAPI,
  siteAPI,
  setToken,
  removeToken,
};

