import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { UserRole } from '@oneform/shared-types';

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  phone?: string;
  role: UserRole;
  tenantId: string;
  status: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

interface AuthContextType extends AuthState {
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true, // Start loading to check localStorage
    token: null,
  });

  // Check localStorage on initial mount
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUserStr = localStorage.getItem('user_data');

    if (storedToken && storedUserStr) {
      try {
        const storedUser = JSON.parse(storedUserStr) as AuthUser;
        setState({
          user: storedUser,
          isAuthenticated: true,
          isLoading: false,
          token: storedToken,
        });
      } catch (e) {
        // Parse error means data is corrupt. Clear it.
        localStorage.clear();
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = (token: string, user: AuthUser) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
    setState({
      user,
      isAuthenticated: true,
      isLoading: false,
      token,
    });
  };

  const logout = () => {
    // FIX: Hardcoded localStorage.clear() stops infinite auth loop bug from v1
    localStorage.clear();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,
    });
    // Hard redirect on logout enforces entire React app state reload
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for easier consumer access
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
