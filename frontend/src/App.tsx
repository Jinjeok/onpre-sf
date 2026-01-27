import { ThumbnailGrid } from './components/ThumbnailGrid';
import { Login } from './pages/Login';
import { useState, useEffect } from 'react';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    // Listen for storage changes if redirect happened in another tab or simple check
    setToken(localStorage.getItem('token'));
  }, []);

  if (!token) {
    return <Login />;
  }

  return (
    <ThumbnailGrid />
  );
}

export default App;
