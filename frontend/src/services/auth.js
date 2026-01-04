import { managerAPI, setToken, removeToken } from './api';

export const login = async (email, password) => {
  try {
    const response = await managerAPI.login(email, password);
    if (response.token) {
      setToken(response.token);
      return response;
    }
    throw new Error('No token received');
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = () => {
  removeToken();
  // Redirect to login page if needed
  window.location.href = '/';
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export const getStoredUser = () => {
  // You might want to decode JWT token or store user data separately
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    // Simple JWT decode (without verification - for client-side only)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

