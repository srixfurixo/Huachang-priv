import { theme, Typography } from 'antd'
import warehouseImg from '../../assets/images/auth/login_warehouse.png'

const { Text } = Typography

/**
 * AuthLayout — Two-panel auth shell (Figma node 79:3821)
 *
 * Left panel : Warehouse background photo with dark gradient overlay,
 *              WMS version badge, brand tagline.
 * Right panel: White, vertically centred, renders {children} (the form).
 *
 * Left panel hides below 768px so mobile shows only the form.
 * Uses theme.useToken() for all brand colours — zero hardcoded hex.
 */
function AuthLayout({ children }) {
	const { token } = theme.useToken()

	return (
		<div
			style={{
				minHeight: '100vh',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'center',
				padding: '40px 20px',
				background: '#eef2f7',
			}}
		>
			{/* ── Card ─────────────────────────────────────────────────── */}
			<div
				style={{
					width: '100%',
					maxWidth: 980,
					minHeight: 580,
					display: 'flex',
					borderRadius: 18,
					overflow: 'hidden',
					background: token.colorBgContainer,
					boxShadow:
						'0px 4px 32px rgba(0,0,0,0.10), 0px 1px 4px rgba(0,0,0,0.06)',
				}}
			>
				{/* ── Left panel — warehouse photo + overlay ────────────── */}
				<div
					style={{
						width: '50%',
						position: 'relative',
						backgroundImage: `url(${warehouseImg})`,
						backgroundSize: 'cover',
						backgroundPosition: 'center',
						// Hide on mobile
						display: 'flex',
					}}
					className="auth-left-panel"
				>
					{/* Dark gradient overlay */}
					<div
						style={{
							position: 'absolute',
							inset: 0,
							background:
								'linear-gradient(to top, rgba(15,28,48,0.72) 0%, rgba(15,28,48,0.10) 55%, rgba(15,28,48,0) 100%)',
						}}
					/>

					{/* WMS version badge — top-left */}
					<div
						style={{
							position: 'absolute',
							top: 20,
							left: 20,
							background: 'rgba(255,255,255,0.14)',
							borderRadius: 99,
							padding: '4px 10px',
						}}
					>
						<Text
							style={{
								color: 'rgba(255,255,255,0.8)',
								fontSize: 10,
								fontWeight: 600,
								letterSpacing: '0.6px',
								textTransform: 'uppercase',
							}}
						>
							WMS v1.0
						</Text>
					</div>

					{/* Brand tagline — bottom-left */}
					<div
						style={{
							position: 'absolute',
							bottom: 44,
							left: 44,
							right: 44,
							display: 'flex',
							flexDirection: 'column',
							gap: 10,
						}}
					>
						<Text
							style={{
								color: '#ffffff',
								fontSize: 24,
								fontWeight: 700,
								lineHeight: '32px',
								letterSpacing: '-0.24px',
							}}
						>
							Empowering Modern Logistics
						</Text>
						<Text
							style={{
								color: 'rgba(239,244,255,0.88)',
								fontSize: 15,
								fontWeight: 400,
								lineHeight: '24px',
							}}
						>
							Streamlined inventory management and operational control for
							high-performance supply chains.
						</Text>
					</div>
				</div>

				{/* ── Right panel — form area ───────────────────────────── */}
				<div
					style={{
						flex: 1,
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						padding: '40px',
						background: token.colorBgContainer,
					}}
				>
					{children}
				</div>
			</div>

			{/* ── Footer ───────────────────────────────────────────────── */}
			<div style={{ marginTop: 20 }}>
				<Text style={{ fontSize: 11, color: token.colorTextQuaternary }}>
					© 2026 Huachang Growmax · All rights reserved · WMS v1.0
				</Text>
			</div>

			{/* ── Responsive: hide left panel on small screens ─────────── */}
			<style>{`
        @media (max-width: 768px) {
          .auth-left-panel { display: none !important; }
        }
      `}</style>
		</div>
	)
}

export default AuthLayout
