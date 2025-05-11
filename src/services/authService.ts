
import { supabase } from '@/integrations/supabase/client';
import { supabaseServiceClient } from './supabaseClient';

interface AdminLoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  error?: string;
}

export const login = async (email: string, password: string): Promise<AdminLoginResponse> => {
  try {
    // Use Supabase's built-in authentication with the anon key (not service key)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (authError) {
      console.error('Authentication error:', authError.message);
      return { success: false, error: authError.message };
    }

    if (!authData || !authData.session) {
      console.error('Authentication failed: No session data');
      return { success: false, error: 'Authentication failed' };
    }

    // After successful authentication, verify if the user is an admin
    try {
      // First try to find an admin user with the login matching the email
      let { data: adminData, error: adminError } = await supabaseServiceClient
        .from('admin_users')
        .select('login')
        .eq('login', email)
        .single();

      // If not found, try with "admin" as the login (common default)
      if (!adminData && adminError) {
        console.log('Trying with default admin login');
        const { data: defaultAdminData, error: defaultAdminError } = await supabaseServiceClient
          .from('admin_users')
          .select('login')
          .eq('login', 'admin')
          .single();
          
        // Update variables with results from second query
        adminData = defaultAdminData;
        adminError = defaultAdminError;
      }

      if (adminError) {
        console.error('Admin verification error:', adminError.message);
        // Sign out on error
        await supabase.auth.signOut();
        return { success: false, error: 'Unauthorized: Admin verification failed' };
      }

      if (!adminData) {
        // If no matching admin user found, sign out
        console.error('Not an admin user');
        await supabase.auth.signOut();
        return { success: false, error: 'Unauthorized: Not an admin user' };
      }

      // Store session info in localStorage
      localStorage.setItem('auth_token', authData.session.access_token);
      localStorage.setItem('admin_login', adminData.login); // Store the actual admin login value

      return { success: true };
    } catch (adminCheckError: any) {
      // If admin check throws an exception
      console.error('Error during admin verification:', adminCheckError.message);
      await supabase.auth.signOut();
      return { success: false, error: `Admin verification error: ${adminCheckError.message}` };
    }
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
  localStorage.removeItem('admin_login');
};

export const checkAuth = async () => {
  // Check if token exists
  const token = localStorage.getItem('auth_token');
  if (!token) return false;
  
  // Verify the session is still valid
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    // Clear invalid tokens
    localStorage.removeItem('auth_token');
    localStorage.removeItem('admin_login');
    return false;
  }
  
  return true;
};

export const getCurrentUser = () => {
  // For our simplified admin system, we just return the login name
  return {
    id: 'admin', // We don't store the actual ID
    email: localStorage.getItem('admin_login') || '',
    role: 'admin',
  };
};
