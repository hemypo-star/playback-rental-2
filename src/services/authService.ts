
interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  error?: string;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      return { success: false, error: error || 'Ошибка входа' };
    }
    const data = await res.json();
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user_email', email);
    return { success: true, message: data.message, token: data.token };
  } catch (error: any) {
    console.error('Error during login:', error);
    return { success: false, error: error.message || String(error) };
  }
};

export const signupuser = async (email: string, password: string) => {
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      return { success: false, error: error || 'Ошибка регистрации' };
    }
    const data = await res.json();
    return { success: true, message: data.message, token: data.token };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
};

export const forgotPassword = async (email: string) => {
  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const { error } = await res.json();
      return { success: false, error: error || 'Ошибка сброса пароля' };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
};

export const resetPassword = async (password: string) => {
  try {
    const token = localStorage.getItem('auth_token');
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ password })
    });
    if (!res.ok) {
      const { error } = await res.json();
      return { success: false, error: error || 'Ошибка обновления пароля' };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
};

export const logout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_email');
};

export const checkAuth = async () => {
  const token = localStorage.getItem('auth_token');
  if (!token) return false;
  // Optional: Validate token via backend
  try {
    const res = await fetch('/api/auth/check', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_email');
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
    return false;
  }
};

export const getCurrentUser = () => {
  return {
    id: 'user',
    email: localStorage.getItem('user_email') || '',
    role: 'admin',
  };
};
