import { useState, useEffect } from 'react';
import './styles/design-system.css';
import LoginPage from './components/LoginPage';
import MainLayout from './components/MainLayout';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('review360_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem('review360_token');
    localStorage.removeItem('review360_user');
    setUser(null);
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;
  return <MainLayout user={user} onLogout={handleLogout} />;
}
