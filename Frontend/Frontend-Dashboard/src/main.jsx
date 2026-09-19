import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import { ThemeProvider } from './context/ThemeContext'
import App from './App'
import './styles/globals.css'

// Leave baseURL empty in dev so /api/* goes through the Vite proxy (vite.config.js → :3001).
// Only set VITE_API_URL in .env.local when you need to point at a remote backend.
axios.defaults.baseURL = import.meta.env.VITE_API_URL ?? ''
axios.defaults.withCredentials = true

/**
 * Provider order:
 *   BrowserRouter — routing context (outermost, required for <Navigate> in child routes)
 *   ThemeProvider — Ant Design ConfigProvider + dark/light algorithm
 *   App           — mounts UserProvider (global/UserContext) then the route table
 */
ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<BrowserRouter>
			<ThemeProvider>
				<App />
			</ThemeProvider>
		</BrowserRouter>
	</React.StrictMode>,
)
