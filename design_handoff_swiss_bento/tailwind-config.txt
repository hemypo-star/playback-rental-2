import type { Config } from "tailwindcss";

/**
 * Playback Rental — Swiss/Bento.
 * Полная замена корневого tailwind.config.ts.
 *
 * Отличия от прежнего конфига:
 *  - fontFamily.sans = Golos Text (было Inter);
 *  - borderRadius раскрыт в реальную шкалу дизайна (было три значения от --radius);
 *  - boxShadow сведён к одной рабочей тени `lift` (glass/soft/medium удалены);
 *  - добавлены кейфреймы и кривые из дизайна (bn*), старые fade/slide/scale оставлены
 *    только для radix-совместимости shadcn-компонентов;
 *  - добавлена палитра `pb` для случаев, когда семантики shadcn не хватает.
 *    Приоритет: пользоваться семантическими токенами (bg-card, text-muted-foreground),
 *    `pb-*` — только для того, чего в семантике нет (pb-quiet, pb-media, pb-track).
 */
export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '30px',
			screens: { '2xl': '1460px' }
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				/* Прямые токены дизайна */
				pb: {
					canvas: '#EFEEEB',
					surface: '#FFFFFF',
					quiet: '#F4F3F1',
					'quiet-hover': '#EAE8E4',
					field: '#F9F8F7',
					track: '#F0EFEC',
					media: '#E6E4E0',
					ink: '#0A0A0A',
					'ink-2': '#2A2925',
					'ink-3': '#4A4844',
					muted: '#75736E',
					accent: '#D62410',
					hairline: 'rgba(10,10,10,0.07)',
					'hairline-2': 'rgba(10,10,10,0.10)',
					'hairline-hover': 'rgba(10,10,10,0.15)'
				}
			},
			fontFamily: {
				sans: ['"Golos Text"', 'Helvetica', 'Arial', 'sans-serif']
			},
			fontSize: {
				/* Дизайн использует дробные размеры — они здесь названы, чтобы не разъезжались */
				'micro': ['9.5px', { lineHeight: '1', letterSpacing: '0.14em' }],
				'caps-xs': ['10px', { lineHeight: '1', letterSpacing: '0.13em' }],
				'caps': ['10.5px', { lineHeight: '1', letterSpacing: '0.16em' }],
				'caps-btn': ['11px', { lineHeight: '1', letterSpacing: '0.12em' }],
				'caps-cta': ['11.5px', { lineHeight: '1', letterSpacing: '0.13em' }],
				'meta': ['12.5px', { lineHeight: '1.4' }],
				'row': ['13.5px', { lineHeight: '1.45' }],
				'base': ['15px', { lineHeight: '1.45' }],
				'lead': ['16px', { lineHeight: '1.5' }],
				'blurb': ['16.5px', { lineHeight: '1.5' }],
				'card-title': ['17px', { lineHeight: '1.22', letterSpacing: '-0.025em' }],
				'cat-title': ['19px', { lineHeight: '1.2', letterSpacing: '-0.025em' }],
				'price': ['20px', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
				'kit-title': ['22px', { lineHeight: '1.15', letterSpacing: '-0.03em' }],
				'metric': ['32px', { lineHeight: '1', letterSpacing: '-0.04em' }],
				'metric-lg': ['42px', { lineHeight: '1', letterSpacing: '-0.045em' }],
				'h2': ['clamp(26px,3vw,40px)', { lineHeight: '1.05', letterSpacing: '-0.04em' }],
				'h1-page': ['clamp(30px,3.8vw,52px)', { lineHeight: '1', letterSpacing: '-0.045em' }],
				'h1-product': ['clamp(28px,3.6vw,50px)', { lineHeight: '1', letterSpacing: '-0.045em' }],
				'display': ['clamp(42px,5.4vw,84px)', { lineHeight: '0.94', letterSpacing: '-0.045em' }]
			},
			borderRadius: {
				/* shadcn-совместимость */
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 4px)',
				sm: 'calc(var(--radius) - 8px)',
				/* шкала дизайна */
				'check': '7px',
				'cell': '11px',
				'item': '12px',
				'nav': '13px',
				'field': '14px',
				'inset': '16px',
				'row': '18px',
				'header': '20px',
				'tile': '22px',
				'card': '24px',
				'hero': '26px'
			},
			boxShadow: {
				lift: '0 26px 48px -32px rgba(10,10,10,0.42)',
				header: '0 2px 3px rgba(10,10,10,0.03)',
				modal: '0 40px 90px -40px rgba(10,10,10,0.6)'
			},
			transitionTimingFunction: {
				/* ease-out-expo: вход, подъём, раскрытие */
				expo: 'cubic-bezier(0.16,1,0.3,1)',
				/* spring: смена состояния (чекбокс, день, тумблер) */
				spring: 'cubic-bezier(0.34,1.56,0.64,1)',
				/* мягкий кросс-фейд промо */
				promo: 'cubic-bezier(0.45,0,0.15,1)'
			},
			transitionDuration: {
				'240': '240ms',
				'260': '260ms',
				'320': '320ms',
				'380': '380ms',
				'420': '420ms',
				'560': '560ms',
				'900': '900ms'
			},
			maxWidth: {
				shell: '1460px'
			},
			keyframes: {
				/* ВАЖНО: bnIn/bnRise используют translate/scale, а НЕ transform —
				   иначе hover-transform карточки конфликтует с концом анимации входа
				   и карточка дёргается. Не переписывать на transform. */
				'bn-in': {
					from: { opacity: '0', translate: '0 18px', scale: '0.99' },
					to: { opacity: '1', translate: 'none', scale: 'none' }
				},
				'bn-rise': {
					from: { opacity: '0', translate: '0 14px' },
					to: { opacity: '1', translate: 'none' }
				},
				'bn-fade': { from: { opacity: '0' }, to: { opacity: '1' } },
				'bn-pop': {
					'0%': { scale: '0.6', opacity: '0' },
					'60%': { scale: '1.12' },
					'100%': { scale: '1', opacity: '1' }
				},
				'bn-rule': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
				'bn-clip': {
					from: { clipPath: 'inset(0 0 100% 0)', scale: '1.06' },
					to: { clipPath: 'inset(0 0 0 0)', scale: 'none' }
				},
				'bn-mark': {
					from: { transform: 'translate3d(0,0,0)' },
					to: { transform: 'translate3d(-50%,0,0)' }
				},
				'bn-blink': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.2' } },
				/* radix / shadcn */
				'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
				'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } }
			},
			animation: {
				'bn-in': 'bn-in 560ms cubic-bezier(0.16,1,0.3,1) both',
				'bn-in-fast': 'bn-in 420ms cubic-bezier(0.16,1,0.3,1) both',
				'bn-rise': 'bn-rise 560ms cubic-bezier(0.16,1,0.3,1) both',
				'bn-fade': 'bn-fade 380ms ease both',
				'bn-fade-slow': 'bn-fade 420ms ease both',
				'bn-pop': 'bn-pop 380ms cubic-bezier(0.16,1,0.3,1) both',
				'bn-rule': 'bn-rule 900ms cubic-bezier(0.16,1,0.3,1) both',
				'bn-clip': 'bn-clip 900ms cubic-bezier(0.16,1,0.3,1) both',
				'bn-mark': 'bn-mark 40s linear infinite',
				'bn-blink': 'bn-blink 2.6s ease-in-out infinite',
				'accordion-down': 'accordion-down 240ms cubic-bezier(0.16,1,0.3,1)',
				'accordion-up': 'accordion-up 240ms cubic-bezier(0.16,1,0.3,1)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
