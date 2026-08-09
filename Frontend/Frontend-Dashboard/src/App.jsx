import AppRoutes from './routes/AppRoutes'
import { UserProvider } from './global/UserContext' 

function App() {
	return (
		<UserProvider>
			<AppRoutes />
		</UserProvider>
	)
}
	
export default App