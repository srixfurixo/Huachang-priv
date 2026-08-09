import { generate } from '@ant-design/colors'
const navyPalette = generate('#0F3563') // index [5] = #0F3563 — primary / sidebar
const skyPalette = generate('#049DD9') // index [5] = #049DD9 — interactive accent
const redPalette = generate('#BF2604') // index [5] = #BF2604 — error / danger
const goldPalette = generate('#F3BC00') // index [5] = #F3BC00 — warning / planning

export { navyPalette, skyPalette, redPalette, goldPalette }

/** Pagination — light uses soft tint; dark uses solid navy (see ThemeContext). */
export const paginationTheme = {
	light: {
		itemActiveBg: `${navyPalette[5]}14`,
		itemActiveColor: navyPalette[5],
		itemActiveColorHover: navyPalette[6],
	},
	dark: {
		itemActiveBg: navyPalette[5],
		itemActiveColor: '#FFFFFF',
		itemActiveColorHover: '#FFFFFF',
	},
}

/**
 * Single source of truth for all Ant Design design tokens.
 * Consumed by <ConfigProvider theme={antdTheme}> in ThemeContext.
 *
 * Page rule: prefer theme.useToken() or class "hcgm-data-panel" for tables/lists.
 * Do not hardcode #fff / #1e293b on data surfaces — the dark algorithm sets those.
 */
export const antdTheme = {
	token: {
		colorPrimary: navyPalette[5],  // #0F3563 Oxford Navy
		colorInfo: skyPalette[5],   // #049DD9 Sky Blue
		colorError: redPalette[5],   // #BF2604 Burnt Red
		colorWarning: goldPalette[5],  // #F3BC00 School Bus Gold
		colorSuccess: '#237804',
		borderRadius: 8,
		fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
		fontSize: 14,
	},
	components: {
		Table: {
			headerBorderRadius: 8,
			cellPaddingBlock: 12,
			cellPaddingInline: 16,
			footerBg: 'transparent',
			footerColor: 'inherit',
		},
		Pagination: paginationTheme.light,
		Card: {
			headerFontSize: 14,
			headerFontSizeSM: 13,
		},
		Select: {
			optionSelectedBg: `${navyPalette[5]}18`,
			optionSelectedColor: navyPalette[5],
		},
		Input: {
			activeBorderColor: navyPalette[5],
			hoverBorderColor: skyPalette[4],
		},
		Button: {
			fontWeight: 600,
		},
		Menu: {
			// Dark sidebar — Navy bg with Sky Blue active highlight
			darkItemBg:            navyPalette[9],
			darkSubMenuItemBg:     navyPalette[8],
			darkItemSelectedBg:    skyPalette[5],
			darkItemSelectedColor: '#FFFFFF',
			// Light sidebar — Navy tint for selected/hover items
			itemSelectedBg:        `${navyPalette[5]}18`,
			itemSelectedColor:     navyPalette[5],
			itemHoverBg:           `${navyPalette[5]}08`,
			itemHoverColor:        navyPalette[5],
			itemActiveBg:          `${navyPalette[5]}18`,
		},
		Layout: {
			siderBg:   navyPalette[9],
			triggerBg: navyPalette[8],
		},
	},
}
