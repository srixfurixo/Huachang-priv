import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';


// this is to make sure all request to backend has the token pending protected api.
axios.defaults.withCredentials = true; 
export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
            setLoading(false);
        };

        fetchUser();
    }, []);

    function login(userData) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    }

    async function logout() {
        try {
            await axios.post('/api/auth/logout'); // pending 
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