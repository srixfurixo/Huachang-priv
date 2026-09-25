import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/auth/me');
                setUser(response.data.user);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            } catch (error) {
                console.error('Session verification failed:', error);
                localStorage.removeItem('user');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    function login(userData) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    }

    async function logout() {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Error during logout:', error);
        } finally {
            setUser(null);
            localStorage.removeItem('user');
        }
    }

    return (
        <UserContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </UserContext.Provider>
    );
}