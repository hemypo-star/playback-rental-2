
import { supabase } from '@/integrations/supabase/client';
import { supabaseServiceClient } from './supabaseClient';

interface AdminLoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  error?: string;
  debug?: any; // Add debug info for troubleshooting
}

export const login = async (usernameOrEmail: string, password: string): Promise<AdminLoginResponse> => {
  try {
    console.log('Attempting login for:', usernameOrEmail);
    
    // Try to find if the input is a valid admin login first
    const isAdminLogin = usernameOrEmail === 'admin';
    
    // If it's "admin", we'll use a default email for Supabase auth
    const authEmail = isAdminLogin ? 'admin@example.com' : usernameOrEmail;
    
    // Step 1: Use Supabase's built-in authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: authEmail,
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

    console.log('Supabase authentication successful, checking admin status');

    // Step 2: After successful authentication, verify if the user is an admin
    try {
      // Check if user is using "admin" as login directly
      console.log('Checking admin login:', isAdminLogin ? 'admin' : usernameOrEmail);
      
      let adminData;
      let adminError;
      
      if (isAdminLogin) {
        // If using "admin" login, check for that directly
        const result = await supabaseServiceClient
          .from('admin_users')
          .select('login, id')
          .eq('login', 'admin')
          .maybeSingle();
        
        adminData = result.data;
        adminError = result.error;
      } else {
        // Try with the email first
        const result = await supabaseServiceClient
          .from('admin_users')
          .select('login, id')
          .eq('login', usernameOrEmail)
          .maybeSingle();
          
        adminData = result.data;
        adminError = result.error;
        
        // If not found with email, try with "admin" as fallback
        if (!adminData) {
          console.log('Email login not found, trying with default admin login');
          const fallbackResult = await supabaseServiceClient
            .from('admin_users')
            .select('login, id')
            .eq('login', 'admin')
            .maybeSingle();
            
          adminData = fallbackResult.data;
          adminError = fallbackResult.error;
          
          console.log('Default admin check result:', adminData ? 'Found' : 'Not found');
        }
      }

      if (!adminData) {
        // If no matching admin user found, sign out
        console.error('Not an admin user - no matching record in admin_users table');
        await supabase.auth.signOut();
        return { 
          success: false, 
          error: 'Unauthorized: Не найдено учетной записи администратора. Убедитесь, что в таблице admin_users есть запись с логином "admin".'
        };
      }

      console.log('Admin verification successful:', adminData);

      // Store session info in localStorage
      localStorage.setItem('auth_token', authData.session.access_token);
      localStorage.setItem('admin_login', adminData.login); // Store the actual admin login value

      return { 
        success: true,
        message: `Login successful as admin: ${adminData.login}`
      };
    } catch (adminCheckError: any) {
      // If admin check throws an exception
      console.error('Error during admin verification:', adminCheckError);
      await supabase.auth.signOut();
      return { 
        success: false, 
        error: `Admin verification error: ${adminCheckError.message}`,
        debug: adminCheckError 
      };
    }
  } catch (error: any) {
    console.error('Error during login:', error);
    return { 
      success: false, 
      error: `Login error: ${error.message}`,
      debug: error 
    };
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
