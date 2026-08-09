import { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { theme, ConfigProvider, App as AntApp } from 'antd'
import { antdTheme, paginationTheme } from '../theme/antdTheme'

const AUTH_PATH_PREFIX = '/auth'

const ThemeCtx = createContext(null)

/**
 * useAppTheme — access isDark and toggle() anywhere in the component tree.
 * Must be used inside <ThemeProvider>.
 */
export const useAppTheme = () => useContext(ThemeCtx)

/**
 * ThemeProvider wraps the whole app and owns:
 *  - Ant Design ConfigProvider (all brand tokens)
 *  - Light / dark algorithm switch
 *  - AntApp (enables App.useApp() message / notification hooks globally)
 *
 * Preference is persisted in localStorage so it survives page refresh.
 */
export function ThemeProvider({ children }) {
	const { pathname } = useLocation()
	const [isDark, setIsDark] = useState(() => {
		return localStorage.getItem('hcgm-theme') === 'dark'
	})

	// Login / forgot / reset pages are designed for a light card; keep them readable
	// when the user toggled dark mode in the dashboard and then logged out.
	const isAuthRoute = pathname.startsWith(AUTH_PATH_PREFIX)
	const effectiveDark = isDark && !isAuthRoute

	useLayoutEffect(() => {
		document.documentElement.dataset.theme = effectiveDark ? 'dark' : 'light'
	}, [effectiveDark])

	useEffect(() => {
		localStorage.setItem('hcgm-theme', isDark ? 'dark' : 'light')
	}, [isDark])

	const algorithm = effectiveDark ? theme.darkAlgorithm : theme.defaultAlgorithm
	const paginationTokens = effectiveDark ? paginationTheme.dark : paginationTheme.light

	const toggle = () => setIsDark((prev) => !prev)

	return (
		<ThemeCtx.Provider value={{ isDark, toggle }}>
			<ConfigProvider
				theme={{
					...antdTheme,
					algorithm,
					cssVar: { key: 'ant' },
					components: {
						...antdTheme.components,
						Pagination: paginationTokens,
					},
				}}
			>
				<AntApp>{children}</AntApp>
			</ConfigProvider>
		</ThemeCtx.Provider>
	)
}
