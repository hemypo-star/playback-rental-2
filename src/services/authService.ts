
import { supabase } from '@/integrations/supabase/client';

interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  error?: string;
}

export const login = async (emailOrUsername: string, password: string): Promise<LoginResponse> => {
  try {
    console.log('Attempting login for:', emailOrUsername);
    
    // Use Supabase's built-in authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailOrUsername,
      password: password,
    });

    if (authError) {
      console.error('Authentication error:', authError.message);
      return { success: false, error: `Authentication failed: ${authError.message}` };
    }

    if (!authData || !authData.session) {
      console.error('Authentication failed: No session data');
      return { success: false, error: 'Authentication failed: No session data returned' };
    }

    console.log('Authentication successful');

    // Store session info in localStorage
    localStorage.setItem('auth_token', authData.session.access_token);
    localStorage.setItem('user_email', authData.user?.email || '');

    return { 
      success: true,
      message: `Login successful as: ${authData.user?.email}`
    };
  } catch (error: any) {
    console.error('Error during login:', error);
    return { 
      success: false, 
      error: `Login error: ${error.message}`
    };
  }
};

export const signupuser = async (email: string, password: string) => {
  // This functionality is disabled as users are created via Supabase
  return { success: false, error: 'Signup is disabled' };
};

export const forgotPassword = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const resetPassword = async (password: string) => {
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const logout = () => {
  supabase.auth.signOut();
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_email');
};

export const checkAuth = async () => {
  // Check if token exists
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.log('No auth token found in localStorage');
    return false;
  }
  
  // Verify the session is still valid
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    // Clear invalid tokens
    console.log('Invalid session, clearing tokens');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
    return false;
  }
  
  return true;
};

export const getCurrentUser = () => {
  return {
    id: 'user',
    email: localStorage.getItem('user_email') || '',
    role: 'admin',
  };
};
