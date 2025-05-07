
import { supabaseServiceClient } from './supabaseClient';

interface AdminLoginResponse {
  success: boolean;
  message?: string;
  token?: string;
}

export const login = async (email: string, password: string) => {
  try {
    // Call the admin_login database function
    const { data, error } = await supabaseServiceClient.rpc('admin_login', {
      login_input: email,
      password_input: password,
    });

    if (error) {
      throw error;
    }

    // Parse the response to ensure we have the right types
    const response = data as AdminLoginResponse;
    
    if (!response.success) {
      throw new Error(response.message || 'Authentication failed');
    }

    // Store the token in localStorage
    localStorage.setItem('auth_token', response.token || '');
    localStorage.setItem('admin_login', email);

    return { success: true };
  } catch (error: any) {
    console.error('Error during login:', error.message);
    return { success: false, error: error.message };
  }
};

export const signupuser = async (email: string, password: string) => {
  // This functionality is disabled as admin users are created via database seeding
  return { success: false, error: 'Admin signup is disabled' };
};

export const forgotPassword = async (email: string) => {
  // This functionality would require additional backend implementation
  return { success: false, error: 'Password reset not available' };
};

export const resetPassword = async (password: string) => {
  // This functionality would require additional backend implementation
  return { success: false, error: 'Password reset not available' };
};

export const logout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('admin_login');
};

export const checkAuth = () => {
  return !!localStorage.getItem('auth_token');
};

export const getCurrentUser = () => {
  // For our simplified admin system, we just return the login name
  return {
    id: 'admin', // We don't store the actual ID
    email: localStorage.getItem('admin_login') || '',
    role: 'admin',
  };
};
