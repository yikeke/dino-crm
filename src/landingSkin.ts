export const LANDING_SKIN_STORAGE_KEY = 'dinoai_landing_skins_v1'
export const LANDING_SKIN_DRAFT_KEY = 'dinoai_landing_skin_preview_draft'
export const LANDING_SKIN_ASSET_DB = 'dino-lp-skin-assets'

export type RegisterMode = 'full' | 'phone_only' | 'no_verify'
export type ThirdPartyLogin = 'google' | 'apple' | 'kakao' | 'line' | 'facebook' | 'zalo' | 'wechat'
export type LandingPageKind = 'first_login' | 'campaign_register' | 'standard_register' | 'payment'
export type SkinStatus = 'draft' | 'published'
export type SkinEffect = 'curtain' | 'carousel'

export type SkinAsset = {
  id: string
  kind: 'image' | 'video'
  src: string
  name?: string
  mime?: string
  bytes?: number
  width?: number
  height?: number
}

export type LandingSkin = {
  id: string
  code: string
  name: string
  line?: string
  seoImage?: SkinAsset
  title: string
  subtitle: string
  pageType: LandingPageKind
  language: string
  registerMode: RegisterMode
  thirdPartyLogins: ThirdPartyLogin[]
  hero?: SkinAsset
  registerBefore: SkinAsset[]
  registerAfter: SkinAsset[]
  stickyBar?: SkinAsset
  stickyBarCta?: string
  campaignAssets: SkinAsset[]
  effects: SkinEffect[]
  status: SkinStatus
  createdAt: string
  updatedAt: string
  updatedBy: string
}

export type LandingSkinStore = { version: 1; skins: LandingSkin[] }

export const PAGE_TYPE_OPTIONS: { value: LandingPageKind; zh: string; en: string }[] = [
  { value: 'first_login', zh: '首次登录页（注册页）', en: 'First login / register' },
  { value: 'campaign_register', zh: '活动注册页', en: 'Campaign register' },
  { value: 'standard_register', zh: '常规注册页', en: 'Standard register' },
  { value: 'payment', zh: '支付落地页', en: 'Payment landing' },
]

export const LANGUAGE_OPTIONS = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'vi', label: 'Tiếng Việt' },
]

export const REGISTER_MODE_OPTIONS: { value: RegisterMode; zh: string; en: string }[] = [
  { value: 'phone_only', zh: '无注册（仅手机号）', en: 'Phone only' },
  { value: 'full', zh: '完整注册', en: 'Full register' },
  { value: 'no_verify', zh: '无验证注册', en: 'Register without OTP' },
]

export const THIRD_PARTY_OPTIONS: { value: ThirdPartyLogin; zh: string }[] = [
  { value: 'google', zh: 'Google' },
  { value: 'apple', zh: 'Apple' },
  { value: 'kakao', zh: 'Kakao' },
  { value: 'line', zh: 'LINE' },
  { value: 'facebook', zh: 'Facebook' },
  { value: 'zalo', zh: 'Zalo' },
  { value: 'wechat', zh: '微信' },
]

function svgData(svg: string) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const HERO_KR = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 560" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7C5CFF"/><stop offset="1" stop-color="#2F6BFF"/></linearGradient></defs><rect width="750" height="560" fill="url(#g)"/><circle cx="560" cy="120" r="90" fill="#FFD54A" opacity=".9"/><text x="48" y="92" fill="#fff" font-size="42" font-family="Arial Black,sans-serif">Dino English</text><text x="48" y="150" fill="#E8F0FF" font-size="26" font-family="PingFang SC,sans-serif">7-day free trial for kids</text><rect x="80" y="210" width="280" height="260" rx="28" fill="#fff" opacity=".18"/><ellipse cx="220" cy="430" rx="110" ry="28" fill="#1a3a8a" opacity=".25"/><path d="M150 360c20-70 90-110 150-70 20 14 34 40 28 70-40 8-90 14-178 0z" fill="#7CFFB2"/><circle cx="210" cy="300" r="18" fill="#1f2329"/><circle cx="268" cy="298" r="18" fill="#1f2329"/><circle cx="216" cy="298" r="6" fill="#fff"/><circle cx="274" cy="296" r="6" fill="#fff"/></svg>`)

const HERO_JP = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 820" fill="none"><rect width="750" height="820" fill="#C8F0E8"/><rect y="620" width="750" height="200" fill="#8ED9A4"/><circle cx="560" cy="140" r="70" fill="#FFF3A3"/><rect x="430" y="210" width="90" height="280" rx="8" fill="#B9E4F2"/><rect x="448" y="160" width="54" height="70" fill="#9FD3E6"/><circle cx="475" cy="150" r="28" fill="#9FD3E6"/><text x="375" y="92" text-anchor="middle" fill="#2B2A6A" font-size="22" font-family="Arial Black,sans-serif">TODO ENGLISH</text><text x="375" y="128" text-anchor="middle" fill="#3B3A7A" font-size="28" font-family="Hiragino Sans,sans-serif">子どもが夢中になる！</text><rect x="90" y="180" width="570" height="320" rx="18" fill="#16324A"/><circle cx="375" cy="320" r="70" fill="#7C5CFF"/><rect x="300" y="300" width="150" height="40" rx="20" fill="#5EE0FF" opacity=".8"/><rect x="180" y="540" width="390" height="64" rx="32" fill="#FF4FA0"/><text x="375" y="580" text-anchor="middle" fill="#fff" font-size="20" font-family="Hiragino Sans,sans-serif">7日間の無料体験</text></svg>`)

const STICKY = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 120" fill="none"><defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#FF4D6A"/><stop offset="1" stop-color="#FF8A3D"/></linearGradient></defs><rect width="750" height="120" fill="url(#s)"/><text x="40" y="48" fill="#fff" font-size="22" font-family="PingFang SC,sans-serif">限时免费体验课</text><text x="40" y="82" fill="#FFE8D6" font-size="16" font-family="PingFang SC,sans-serif">留下手机号，顾问马上联系你</text><rect x="520" y="34" width="190" height="52" rx="26" fill="#fff"/><text x="615" y="67" text-anchor="middle" fill="#FF4D6A" font-size="18" font-family="PingFang SC,sans-serif">立即领取</text></svg>`)

const SEO = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#2F6BFF"/><text x="80" y="280" fill="#fff" font-size="64" font-family="Arial Black,sans-serif">Dino English</text><text x="80" y="360" fill="#D6E4FF" font-size="36" font-family="PingFang SC,sans-serif">Kids learn English with a game-like tutor</text></svg>`)

const BEFORE = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 220" fill="none"><rect width="750" height="220" rx="16" fill="#FFF4D6"/><text x="40" y="90" fill="#7A4E00" font-size="28" font-family="PingFang SC,sans-serif">注册即送 7 天体验</text><text x="40" y="140" fill="#A56A12" font-size="18" font-family="PingFang SC,sans-serif">适合 4–12 岁，每天 15 分钟</text></svg>`)

const AFTER = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 240" fill="none"><rect width="750" height="240" rx="16" fill="#EEF4FF"/><text x="40" y="80" fill="#1F3B8A" font-size="26" font-family="PingFang SC,sans-serif">家长看得见进步</text><text x="40" y="130" fill="#526172" font-size="16" font-family="PingFang SC,sans-serif">学习报告 · 发音反馈 · 趣味关卡</text></svg>`)

function asset(id: string, src: string, name: string, kind: SkinAsset['kind'] = 'image'): SkinAsset {
  return { id, kind, src, name }
}

function now() {
  return '2026-09-20 17:40:00'
}

export function emptySkin(actor = 'admin@dinoai.ai'): LandingSkin {
  return {
    id: `SKIN_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    code: Math.random().toString(36).slice(2, 5),
    name: '',
    line: '韩国',
    title: '',
    subtitle: '',
    pageType: 'first_login',
    language: 'ko',
    registerMode: 'phone_only',
    thirdPartyLogins: [],
    registerBefore: [],
    registerAfter: [],
    campaignAssets: [],
    effects: [],
    status: 'draft',
    createdAt: now(),
    updatedAt: now(),
    updatedBy: actor,
  }
}

export function seedLandingSkins(): LandingSkinStore {
  return {
    version: 1,
    skins: [
      {
        id: 'SKIN_1MW',
        code: '1mw',
        name: '韩国暑期体验课 · 注册页皮肤',
        line: '韩国',
        seoImage: asset('seo-1mw', SEO, 'seo-kr.png'),
        title: '孩子开口说英语，从今天开始',
        subtitle: '7 天免费体验课 · AI 外教陪练',
        pageType: 'first_login',
        language: 'ko',
        registerMode: 'phone_only',
        thirdPartyLogins: ['kakao', 'apple', 'google'],
        hero: asset('hero-1mw', HERO_KR, 'hero-kr.png'),
        registerBefore: [asset('before-1mw', BEFORE, 'register-before.png')],
        registerAfter: [asset('after-1mw', AFTER, 'register-after.png')],
        stickyBar: asset('sticky-1mw', STICKY, 'sticky-kr.png'),
        stickyBarCta: '立即领取体验课',
        campaignAssets: [],
        effects: [],
        status: 'published',
        createdAt: now(),
        updatedAt: now(),
        updatedBy: 'admin@dinoai.ai',
      },
      {
        id: 'SKIN_JP01',
        code: 'jp01',
        name: '日本活动页 · 幕布动效 + 轮播',
        line: '其他',
        seoImage: asset('seo-jp', SEO, 'seo-jp.png'),
        title: '子どもが夢中になる！ゲーム感覚の英語学習',
        subtitle: 'アプリで7日間の無料体験 ＋簡単レベルテスト',
        pageType: 'campaign_register',
        language: 'ja',
        registerMode: 'full',
        thirdPartyLogins: ['line', 'apple', 'google'],
        hero: asset('hero-jp', HERO_JP, 'hero-jp.png'),
        registerBefore: [],
        registerAfter: [asset('after-jp', AFTER, 'after-jp.png')],
        stickyBar: asset('sticky-jp', STICKY, 'sticky-jp.png'),
        stickyBarCta: '7日間の無料体験',
        campaignAssets: [
          asset('slide-1', BEFORE, 'carousel-1.png'),
          asset('slide-2', AFTER, 'carousel-2.png'),
          asset('slide-3', HERO_KR, 'carousel-3.png'),
        ],
        effects: ['curtain', 'carousel'],
        status: 'published',
        createdAt: now(),
        updatedAt: now(),
        updatedBy: 'admin@dinoai.ai',
      },
      {
        id: 'SKIN_VN01',
        code: 'vn01',
        name: '越南线索页 · 无验证注册',
        line: '越南',
        title: 'Học tiếng Anh cùng Dino',
        subtitle: 'Để lại số điện thoại, nhận buổi học thử miễn phí',
        pageType: 'standard_register',
        language: 'vi',
        registerMode: 'no_verify',
        thirdPartyLogins: ['zalo', 'google', 'facebook'],
        hero: asset('hero-vn', HERO_KR, 'hero-vn.png'),
        registerBefore: [asset('before-vn', BEFORE, 'before-vn.png')],
        registerAfter: [],
        stickyBar: asset('sticky-vn', STICKY, 'sticky-vn.png'),
        stickyBarCta: 'Đăng ký ngay',
        campaignAssets: [],
        effects: [],
        status: 'published',
        createdAt: now(),
        updatedAt: now(),
        updatedBy: 'admin@dinoai.ai',
      },
    ],
  }
}

export function loadLandingSkinStore(): LandingSkinStore {
  try {
    const raw = JSON.parse(localStorage.getItem(LANDING_SKIN_STORAGE_KEY) ?? 'null') as LandingSkinStore | null
    if (raw?.version === 1 && Array.isArray(raw.skins)) return raw
  } catch {
    /* ignore */
  }
  const seed = seedLandingSkins()
  saveLandingSkinStore(seed)
  return seed
}

export function saveLandingSkinStore(store: LandingSkinStore) {
  localStorage.setItem(LANDING_SKIN_STORAGE_KEY, JSON.stringify(store))
}

export function findSkin(codeOrId: string, store = loadLandingSkinStore()) {
  const aliases: Record<string, string> = { KR_SKIN_A: '1mw', KR_SKIN_B: 'jp01', VN_SKIN_A: 'vn01', VN_SKIN_B: 'vn01', DEFAULT: 'vn01' }
  const key = aliases[codeOrId] || codeOrId
  return store.skins.find((s) => s.code === key || s.id === key || s.code === codeOrId || s.id === codeOrId)
}

export function previewPath(code: string, extra: Record<string, string> = {}) {
  const query = new URLSearchParams({ code, preview: '1', ...extra })
  return `#/website/promotion/landingpage?${query.toString()}`
}

export function previewHref(code: string, extra: Record<string, string> = {}) {
  const root = location.pathname.includes('/dino-crm') ? '/dino-crm/' : '/'
  return `${location.origin}${root}${previewPath(code, extra)}`
}

export function writePreviewDraft(skin: LandingSkin) {
  sessionStorage.setItem(LANDING_SKIN_DRAFT_KEY, JSON.stringify(skin))
}

export function readPreviewDraft(): LandingSkin | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(LANDING_SKIN_DRAFT_KEY) ?? 'null')
    return raw?.id ? (raw as LandingSkin) : null
  } catch {
    return null
  }
}

export function pageTypeLabel(type: LandingPageKind, en = false) {
  const hit = PAGE_TYPE_OPTIONS.find((x) => x.value === type)
  return en ? hit?.en ?? type : hit?.zh ?? type
}

export function registerModeLabel(mode: RegisterMode, en = false) {
  const hit = REGISTER_MODE_OPTIONS.find((x) => x.value === mode)
  return en ? hit?.en ?? mode : hit?.zh ?? mode
}
