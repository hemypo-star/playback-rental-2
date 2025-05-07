
import { supabaseServiceClient } from './supabaseClient';

interface AdminLoginResponse {
  success: boolean;
  message?: string;
  token?: string;
}

export const login = async (email: string, password: string) => {
  try {
    // Use Supabase's built-in authentication
    const { data: authData, error: authError } = await supabaseServiceClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (authError) {
      throw authError;
    }

    if (!authData || !authData.session) {
      throw new Error('Authentication failed');
    }

    // Store the session token in localStorage
    localStorage.setItem('auth_token', authData.session.access_token);
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
  try {
    const { error } = await supabaseServiceClient.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const resetPassword = async (password: string) => {
  try {
    const { error } = await supabaseServiceClient.auth.updateUser({ password });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const logout = () => {
  supabaseServiceClient.auth.signOut();
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
