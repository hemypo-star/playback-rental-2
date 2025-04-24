
export const login = async (username: string, password: string) => {
  if (username === 'admin' && password === 'admin123') {
    localStorage.setItem('auth_token', 'demo_token');
    localStorage.setItem('user', JSON.stringify({ username: 'admin', role: 'admin' }));
    return { success: true, token: 'demo_token' };
  }
  return { success: false };
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
