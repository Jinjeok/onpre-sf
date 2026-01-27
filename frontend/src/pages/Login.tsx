import styled from 'styled-components';
import { useState } from 'react';
import axios from 'axios';

const Container = styled.div`
  height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #000;
  color: white;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 320px;
  padding: 20px;
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
`;

const Input = styled.input`
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #333;
  background: #111;
  color: white;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: #5865F2;
  }
`;

const Button = styled.button`
  padding: 12px;
  border-radius: 8px;
  background: #5865F2;
  color: white;
  font-weight: bold;
  font-size: 16px;
  border: none;
  cursor: pointer;
  
  &:hover {
    background: #4752C4;
  }
  
  &:disabled {
    opacity: 0.5;
  }
`;

const ErrorMsg = styled.div`
  color: #ff4444;
  font-size: 14px;
  text-align: center;
`;

export const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await axios.post(`${apiUrl}/auth/login`, { username, password });

            localStorage.setItem('token', res.data.access_token);
            window.location.href = '/'; // Simple redirect to reload App
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container>
            <Form onSubmit={handleSubmit}>
                <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Login</h2>
                {error && <ErrorMsg>{error}</ErrorMsg>}
                <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                />
                <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <Button type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </Button>
            </Form>
        </Container>
    );
};
