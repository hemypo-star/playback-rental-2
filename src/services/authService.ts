
import { supabaseServiceClient } from './supabaseClient';

export const login = async (email: string, password: string) => {
  try {
    const { data, error } = await supabaseServiceClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      throw error;
    }

    localStorage.setItem('auth_token', data.session?.access_token || '');
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  } catch (error: any) {
    console.error('Error during login:', error.message);
    throw error;
  }
};

export const signupuser = async (email: string, password: string) => {
  try {
    const { data, error } = await supabaseServiceClient.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      throw error;
    }

    localStorage.setItem('auth_token', data.session?.access_token || '');
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  } catch (error: any) {
    console.error('Error during signup:', error.message);
    throw error;
  }
};

export const forgotPassword = async (email: string) => {
  try {
    const { data, error } = await supabaseServiceClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error during forgot password:', error.message);
    throw error;
  }
};

export const resetPassword = async (password: string) => {
  try {
    const { data, error } = await supabaseServiceClient.auth.updateUser({ password: password });

    if (error) {
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error during reset password:', error.message);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
};

export const checkAuth = () => {
  return !!localStorage.getItem('auth_token');
};

export const getCurrentUser = () => {
  const userString = localStorage.getItem('user');
  if (userString) {
    return JSON.parse(userString);
  }
  return null;
};
