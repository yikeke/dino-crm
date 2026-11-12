import type { CSSProperties } from 'react'

export const LANDING_SKIN_STORAGE_KEY = 'dinoai_landing_skins_v17'
export const LANDING_SKIN_DRAFT_KEY = 'dinoai_landing_skin_preview_draft'
export const LANDING_SKIN_ASSET_DB = 'dino-lp-skin-assets'
export const DEFAULT_VIDEO_HOLE = { left: 12, top: 22, width: 76, height: 39 }
export const DEFAULT_SCENE_CTA_RECT = { left: 8, top: 86, width: 84, height: 11 }
/** Default hotspot when sticky button is overlaid on the sticky image. */
export const DEFAULT_STICKY_CTA_RECT = { left: 8, top: 30, width: 84, height: 48 }

/** 10.7 起只表示「手机号注册」开关；三方登录单独存在 thirdPartyLogins。老数据的 'oauth' 回填为 'none'。 */
export type RegisterMode = 'none' | 'full'
export type LoginLayout = 'form_first' | 'two_zone'
export type LoginRenderState = 'R0' | 'R1' | 'R2' | 'R3' | 'R4'
export type RegisterBgKind = 'color' | 'image'
export type RegisterAreaBgKind = 'none' | 'color' | 'image'
export type AfterRegisterAction = 'sku_promo_pay' | 'onelink' | 'download_app' | 'lead_my' | 'lead_vn' | 'lead_sa'
export type ThirdPartyLogin = 'line' | 'google' | 'apple' | 'facebook' | 'kakao'
export type LoginMethod = 'phone' | ThirdPartyLogin
/** Two kinds, aligned with 落地页管理: payment vs acquisition (CC lead + KOL web-to-app). */
export type LandingPageKind = 'pay' | 'lead'
/**
 * 1 draft — 刚创建未发布
 * 2 published — 已发布（V1 或再次发布后的 Vn）
 * 3 published_draft — 已发布后又编辑并暂时保存的草稿（线上仍认 lastPublishedRevision）
 */
export type SkinStatus = 'draft' | 'published' | 'published_draft'
export type SkinEffect = 'curtain'

/** UI / 弹窗用的生命周期相位（由 status + revision 推导）。 */
export type SkinLifecycle = 'new_draft' | 'published_v1' | 'published_editing' | 'published_vn'

export type RegisterField = {
  id: string
  key: string
  label: string
  required: boolean
}

export type ButtonPreset = 'sunset' | 'chunky' | 'midnight'

export type CtaStyle = {
  preset: ButtonPreset
  from: string
  to: string
  text: string
  breathe: boolean
}

export type SceneCtaMode = 'none' | 'bottom' | 'custom'

export const BUTTON_PRESET_OPTIONS: { value: ButtonPreset; zh: string; en: string }[] = [
  { value: 'sunset', zh: '落日橙', en: 'Sunset' },
  { value: 'chunky', zh: '游戏块', en: 'Chunky' },
  { value: 'midnight', zh: '夜色金', en: 'Midnight gold' },
]

export const PRESET_COLORS: Record<ButtonPreset, { from: string; to: string; text: string }> = {
  sunset: { from: '#ffd56a', to: '#ff7a18', text: '#ffffff' },
  chunky: { from: '#ffb06a', to: '#ff4d00', text: '#ffffff' },
  midnight: { from: '#3b3348', to: '#121018', text: '#f6d58a' },
}

export const DEFAULT_CTA_STYLE: CtaStyle = {
  preset: 'sunset',
  ...PRESET_COLORS.sunset,
  breathe: true,
}

export type VideoHole = { left: number; top: number; width: number; height: number }

/** How the scene video hole plays on the landing page. */
export type VideoPlayMode = 'loop' | 'lightbox'

export type SkinAsset = {
  id: string
  kind: 'image' | 'video'
  src: string
  name?: string
  mime?: string
  bytes?: number
  width?: number
  height?: number
  /** Image description written to alt; the main text Google reads from image-heavy pages. */
  alt?: string
  withVideo?: boolean
  video?: SkinAsset
  /** Poster shown in the hole for lightbox mode. Not used for muted loop. */
  videoCover?: SkinAsset
  videoRect?: VideoHole
  /** loop = muted autoplay in the hole; lightbox = tap hole to play fullscreen. */
  videoPlayMode?: VideoPlayMode
  /** Overlay a CTA on this image: docked to the bottom, or a dragged hotspot. */
  ctaMode?: SceneCtaMode
  ctaText?: string
  ctaStyle?: CtaStyle
  ctaRect?: VideoHole
}

export type LandingSkin = {
  id: string
  code: string
  name: string
  line?: string
  pageType: LandingPageKind
  language: string
  registerMode: RegisterMode
  verifyEnabled: boolean
  extraFields: RegisterField[]
  thirdPartyLogins: ThirdPartyLogin[]
  /** 缺省按 form_first（现网样式）。 */
  loginLayout?: LoginLayout
  /** 已开启方式的展示顺序（含 phone）。 */
  loginOrder?: LoginMethod[]
  /** 仅 two_zone：放在「其他登录方式」副区的方式。 */
  secondaryLogins?: LoginMethod[]
  afterRegisterAction: AfterRegisterAction
  ctaText?: string
  ctaStyle: CtaStyle
  registerTitle?: string
  registerSubtitle?: string
  registerTitleColor?: string
  seoTitle?: string
  seoDescription?: string
  /** Legacy header image; migrated into registerBefore[0] on load. */
  hero?: SkinAsset
  registerBgKind: RegisterBgKind
  registerBgColor: string
  registerBgImage?: SkinAsset
  /** Full-bleed section behind the register form; spans screen width, height follows the form. */
  registerAreaBgKind: RegisterAreaBgKind
  registerAreaBgColor: string
  registerAreaBgImage?: SkinAsset
  registerAfter: SkinAsset[]
  registerBefore: SkinAsset[]
  stickyBar?: SkinAsset
  /** Independent of the sticky button — both can be on at once. */
  stickyImageEnabled?: boolean
  stickyBarCta?: string
  /** Independent of the sticky image — both can be on at once. */
  stickyButtonEnabled?: boolean
  /** When overlaid on sticky image: dock to bottom, or custom hotspot. */
  stickyCtaMode?: 'bottom' | 'custom'
  stickyCtaRect?: VideoHole
  stickyCtaStyle: CtaStyle
  effects: SkinEffect[]
  status: SkinStatus
  /** Working revision. Bumps when starting an edit cycle after a publish. */
  revision: number
  /** Last revision that was submitted live; undefined if never published. */
  lastPublishedRevision?: number
  createdAt: string
  updatedAt: string
  updatedBy: string
  /** Audit trail shown in the list「操作记录」drawer. */
  history?: SkinHistoryEntry[]
}

export type SkinHistoryEntry = {
  id: string
  at: string
  actor: string
  action: string
  detail: string
}

export type LandingSkinStore = { version: 6; skins: LandingSkin[] }

export function pushSkinHistory(
  skin: LandingSkin,
  actor: string,
  action: string,
  detail: string,
  at = skin.updatedAt,
): LandingSkin {
  const entry: SkinHistoryEntry = {
    id: `H_${Math.random().toString(36).slice(2, 10)}`,
    at,
    actor,
    action,
    detail,
  }
  return { ...skin, history: [...(skin.history || []), entry] }
}

export function normalizeSkinStatus(status?: string): SkinStatus {
  if (status === 'published' || status === 'published_draft' || status === 'draft') return status
  return 'draft'
}

export function normalizeSkinRevision(skin: Pick<LandingSkin, 'revision' | 'status' | 'lastPublishedRevision'>) {
  const revision = Math.max(1, Number(skin.revision) || 1)
  const lastPublishedRevision = skin.lastPublishedRevision != null
    ? Math.max(1, Number(skin.lastPublishedRevision))
    : (normalizeSkinStatus(skin.status) === 'published' ? revision : undefined)
  return { revision, lastPublishedRevision }
}

/** Has a live published revision (even if current working copy is a draft). */
export function skinHasLiveVersion(skin: Pick<LandingSkin, 'status' | 'lastPublishedRevision'>) {
  return normalizeSkinStatus(skin.status) === 'published'
    || normalizeSkinStatus(skin.status) === 'published_draft'
    || skin.lastPublishedRevision != null
}

export function skinLifecycle(skin: Pick<LandingSkin, 'status' | 'revision' | 'lastPublishedRevision'>): SkinLifecycle {
  const status = normalizeSkinStatus(skin.status)
  const { revision, lastPublishedRevision } = normalizeSkinRevision(skin)
  if (status === 'published_draft') return 'published_editing'
  if (status === 'draft' && lastPublishedRevision == null) return 'new_draft'
  if (status === 'draft' && lastPublishedRevision != null) return 'published_editing'
  if (status === 'published' && (lastPublishedRevision ?? revision) <= 1 && revision <= 1) return 'published_v1'
  return 'published_vn'
}

export function skinStatusLabel(skin: Pick<LandingSkin, 'status' | 'revision' | 'lastPublishedRevision'>, en = false) {
  const life = skinLifecycle(skin)
  const { revision, lastPublishedRevision } = normalizeSkinRevision(skin)
  if (life === 'new_draft') return en ? 'Draft' : '草稿（未发布）'
  if (life === 'published_v1') return en ? 'Published · V1' : '已发布 · V1'
  if (life === 'published_editing') {
    const live = lastPublishedRevision ?? Math.max(1, revision - 1)
    return en ? `Draft · editing (live V${live})` : `草稿 · 修改中（线上 V${live}）`
  }
  return en ? `Published · V${revision}` : `已发布 · V${revision}`
}

export function skinStatusColor(skin: Pick<LandingSkin, 'status' | 'revision' | 'lastPublishedRevision'>) {
  const life = skinLifecycle(skin)
  if (life === 'published_v1' || life === 'published_vn') return 'green'
  if (life === 'published_editing') return 'orange'
  return 'gold'
}

export type SkinActionKind = 'cancel' | 'temp_save' | 'submit'

/** Confirm copy for 取消 / 暂时保存 / 提交, keyed by the four lifecycle phases. */
export function skinActionDialog(
  skin: Pick<LandingSkin, 'status' | 'revision' | 'lastPublishedRevision'>,
  action: SkinActionKind,
  en = false,
): { title: string; content: string; okText: string; cancelText: string } {
  const life = skinLifecycle(skin)
  const { revision, lastPublishedRevision } = normalizeSkinRevision(skin)
  const live = lastPublishedRevision ?? Math.max(1, revision - (life === 'published_editing' ? 1 : 0))
  const next = life === 'published_editing' ? revision : live + 1

  if (action === 'cancel') {
    if (life === 'new_draft') {
      return en
        ? { title: 'Leave without saving?', content: 'This skin is not in the list yet. Leaving now discards your edits.', okText: 'Leave', cancelText: 'Keep editing' }
        : { title: '确认取消？', content: '当前内容尚未保存到列表，离开后将丢失，请确认是否取消。', okText: '确认取消', cancelText: '继续编辑' }
    }
    if (life === 'published_editing') {
      return en
        ? { title: 'Discard draft edits?', content: `Your edits will not be saved. Live V${live} stays unchanged.`, okText: 'Discard', cancelText: 'Keep editing' }
        : { title: '确认取消？', content: '您所编辑的内容将不会进行保存，线上版本保持不变，请确认。', okText: '确认取消', cancelText: '继续编辑' }
    }
    // published_v1 / published_vn
    return en
      ? { title: 'Discard edits?', content: `Edits on this published skin will not be saved. Live V${live} stays unchanged.`, okText: 'Discard', cancelText: 'Keep editing' }
      : { title: '确认取消？', content: `您本次在已发布皮肤上的编辑不会保存，线上 V${live} 保持不变，请确认是否取消。`, okText: '确认取消', cancelText: '继续编辑' }
  }

  if (action === 'temp_save') {
    if (life === 'new_draft') {
      return en
        ? { title: 'Save as draft?', content: 'Saves to the list as an unpublished draft. No template_code is issued until you submit.', okText: 'Save draft', cancelText: 'Back' }
        : { title: '确认暂时保存？', content: '将保存为未发布草稿，可随时回来继续编辑；此时不会发布，也不会生成模板 ID。', okText: '暂时保存', cancelText: '返回' }
    }
    if (life === 'published_editing') {
      return en
        ? { title: 'Save draft?', content: `Your content will be saved online as V${next} draft. Live stays at V${live}. You can come back anytime.`, okText: 'Save draft', cancelText: 'Back' }
        : { title: '确认暂时保存？', content: '您的内容已经保存在线上，可以随时回来进行编辑（草稿版本不会覆盖线上）。', okText: '暂时保存', cancelText: '返回' }
    }
    // First temp-save off a live published skin → opens V(next) draft
    return en
      ? { title: 'Save as draft?', content: `Saves as V${next} draft. Live stays at V${live} until you submit.`, okText: 'Save draft', cancelText: 'Back' }
      : { title: '确认暂时保存？', content: `将保存为 V${next} 草稿，线上仍为 V${live}；可随时回来继续编辑，不会立刻覆盖线上。`, okText: '暂时保存', cancelText: '返回' }
  }

  // submit
  if (life === 'new_draft') {
    return en
      ? { title: 'Submit & publish?', content: 'After checks pass, template_code is issued and the skin goes live as V1.', okText: 'Submit', cancelText: 'Back' }
      : { title: '确认提交？', content: '通过校验后将生成模板 ID 并上线，状态变为「已发布 · V1」。', okText: '确认提交', cancelText: '返回' }
  }
  if (life === 'published_editing') {
    return en
      ? { title: 'Overwrite live version?', content: `Your changes will replace live V${live} with V${next}. Rollback is not supported in this version; the change is written to the operation log.`, okText: 'Submit', cancelText: 'Back' }
      : { title: '确认提交？', content: '您所做的修改会覆盖线上的版本，请确认提交。本期不支持回退，变更会写入操作记录。', okText: '确认提交', cancelText: '返回' }
  }
  return en
    ? { title: 'Overwrite live version?', content: `Your changes will replace live V${live} with V${next}. Rollback is not supported; the change is written to the operation log.`, okText: 'Submit', cancelText: 'Back' }
    : { title: '确认提交？', content: `您所做的修改会覆盖线上的 V${live}，发布为 V${next}。本期不支持回退，变更会写入操作记录。`, okText: '确认提交', cancelText: '返回' }
}

export const PAGE_TYPE_OPTIONS: { value: LandingPageKind; zh: string; en: string }[] = [
  { value: 'pay', zh: '支付落地页', en: 'Payment landing' },
  { value: 'lead', zh: '获客落地页', en: 'Acquisition landing' },
]

export const PAGE_TYPE_HINT: Record<LandingPageKind, { zh: string; en: string }> = {
  pay: {
    zh: '用户提交注册表单后，会进入 SKU 列表 → 输入优惠码 → 支付 → 下载 App。适合付费转化场景。',
    en: 'After register, users go SKU list → promo code → pay → download App. Use for paid conversion.',
  },
  lead: {
    zh: '用于留资获客或引导下载。',
    en: 'For lead collection or app download.',
  },
}

export const LANGUAGE_OPTIONS = [
  { value: 'vi', label: '越南语' },
  { value: 'ko', label: '韩语' },
  { value: 'ar', label: '阿拉伯语' },
  { value: 'ms', label: '马来语' },
  { value: 'th', label: '泰语' },
  { value: 'id', label: '印尼语' },
  { value: 'ja', label: '日语' },
  { value: 'zh-Hant', label: '繁体中文' },
  { value: 'en', label: '英语' },
]

export const LOGIN_LAYOUT_OPTIONS: { value: LoginLayout; zh: string; en: string; hintZh: string; hintEn: string }[] = [
  {
    value: 'form_first',
    zh: '表单优先',
    en: 'Form first',
    hintZh: '现网样式。手机号表单在上，三方是表单下面一排小图标。',
    hintEn: 'Current style. Phone form on top, third-party icons in a row below.',
  },
  {
    value: 'two_zone',
    zh: '主次两区',
    en: 'Two zones',
    hintZh: '对齐 App：主区大按钮，下面「其他登录方式」放小圆按钮。全部放主区就是一列同样大小的按钮（韩国）。',
    hintEn: 'Like the app: big buttons in the primary zone, small circles under “Other ways”. All primary = one column of equal buttons (Korea).',
  },
]

export const LOGIN_STATE_INFO: Record<LoginRenderState, { zh: string; en: string }> = {
  R0: { zh: '无登录区', en: 'No login area' },
  R1: { zh: '表单 + 图标行', en: 'Form + icons' },
  R2: { zh: '仅表单', en: 'Form only' },
  R3: { zh: '仅图标行', en: 'Icons only' },
  R4: { zh: '主次两区', en: 'Two zones' },
}

/**
 * 业务线 × 落地页类型决定登录区哪些项可改（10.7）。
 * phone：free 可开关 / on 锁定开 / off 锁定关；thirds：free 可勾 / off 不可勾。
 */
export type LoginPolicy = {
  phone: 'free' | 'on' | 'off'
  thirds: 'free' | 'off'
  reasonZh?: string
  reasonEn?: string
}

export function loginPolicy(line: string | undefined, pageType: LandingPageKind, action?: string): LoginPolicy {
  if (pageType === 'lead' && (line === '日本' || line === '香港')) {
    return {
      phone: 'off',
      thirds: 'off',
      reasonZh: `${line}获客落地页直接跳 OneLink，没有登录区。`,
      reasonEn: 'This acquisition page opens OneLink directly; there is no login area.',
    }
  }
  if (line === '日本') {
    return {
      phone: 'off',
      thirds: 'free',
      reasonZh: '日本支付落地页不接短信，不能开手机号；至少勾一家三方。',
      reasonEn: 'Japan payment pages have no SMS: phone stays off; pick at least one provider.',
    }
  }
  if (pageType === 'lead' && isLeadCollectAction(action)) {
    return {
      phone: 'on',
      thirds: 'free',
      reasonZh: '收集留资页面要落到手机号，手机号必须开。',
      reasonEn: 'Lead collection lands on a phone number, so phone stays on.',
    }
  }
  return { phone: 'free', thirds: 'free' }
}

export const AFTER_REGISTER_ACTION_OPTIONS: { value: AfterRegisterAction; zh: string; en: string }[] = [
  { value: 'sku_promo_pay', zh: '跳转 SKU 列表 -> 输入 promo code -> 支付 -> 出下载 app 弹窗', en: 'SKU list → promo code → pay → download-app popup' },
  { value: 'onelink', zh: '直接跳转 OneLink', en: 'Open OneLink directly' },
  { value: 'download_app', zh: '直接出下载 App 弹窗（Web to App）', en: 'Download-app popup (Web to App)' },
  { value: 'lead_my', zh: '出收集四个留资页面（马来版）-> 出下载 App 弹窗', en: 'Four lead pages (Malaysia) → download-app popup' },
  { value: 'lead_vn', zh: '出收集两个留资页面（越南版）-> 出下载 App 弹窗', en: 'Two lead pages (Vietnam) → download-app popup' },
  { value: 'lead_sa', zh: '出收集四个留资页面（沙特阿语版）-> 出下载 App 弹窗', en: 'Four lead pages (Saudi, Arabic) → download-app popup' },
]

/** 获客落地页后续交互：越南只有两项留资，马来只有四项留资，沙特是下载弹窗或四项留资（阿语），其余业务线只有下载弹窗。 */
export function followUpOptions(pageType: LandingPageKind, line?: string) {
  if (pageType === 'pay') return AFTER_REGISTER_ACTION_OPTIONS.filter((x) => x.value === 'sku_promo_pay')
  return AFTER_REGISTER_ACTION_OPTIONS.filter((x) => {
    if (x.value === 'onelink') return line === '日本' || line === '香港'
    if (x.value === 'download_app') return line !== '越南' && line !== '马来' && line !== '香港' && line !== '日本'
    if (x.value === 'lead_my') return line === '马来'
    if (x.value === 'lead_vn') return line === '越南'
    if (x.value === 'lead_sa') return line === '沙特'
    return false
  })
}

export function followUpLabel(action: AfterRegisterAction, en = false) {
  const hit = AFTER_REGISTER_ACTION_OPTIONS.find((x) => x.value === action)
  return en ? hit?.en ?? action : hit?.zh ?? action
}

export const THIRD_PARTY_OPTIONS: { value: ThirdPartyLogin; zh: string }[] = [
  { value: 'line', zh: 'LINE' },
  { value: 'google', zh: 'Google' },
  { value: 'apple', zh: 'Apple' },
  { value: 'facebook', zh: 'Facebook' },
  { value: 'kakao', zh: 'Kakao' },
]

const JP_THIRD_PARTY_ORDER: ThirdPartyLogin[] = ['line', 'apple', 'google', 'facebook']

/** LINE 只给日本，Kakao 只给韩国。列表顺序也是老皮肤回填 loginOrder 时的默认顺序。 */
export function thirdPartyOptionsForLine(line?: string) {
  if (line === '日本') {
    return JP_THIRD_PARTY_ORDER.map((id) => THIRD_PARTY_OPTIONS.find((x) => x.value === id)!)
  }
  return THIRD_PARTY_OPTIONS.filter((x) => x.value !== 'line' && (x.value !== 'kakao' || line === '韩国'))
}

export function thirdPartyLoginsForLine(line: string | undefined, ids?: string[]): ThirdPartyLogin[] {
  const picked = new Set(normalizeThirdPartyLogins(ids))
  return thirdPartyOptionsForLine(line).map((x) => x.value).filter((id) => picked.has(id))
}

export function loginMethodLabel(method: LoginMethod, en = false) {
  if (method === 'phone') return en ? 'Phone' : '手机号'
  return THIRD_PARTY_OPTIONS.find((x) => x.value === method)?.zh ?? method
}

type LoginShape = Pick<LandingSkin,
  'line' | 'pageType' | 'afterRegisterAction' | 'registerMode' | 'verifyEnabled' | 'extraFields'
  | 'thirdPartyLogins' | 'loginLayout' | 'loginOrder' | 'secondaryLogins'>

/** 按业务线 / 落地页类型收口登录区字段：锁定项强制、不可用的三方去掉、顺序和副区只保留已开启的方式。 */
export function normalizeLoginConfig<T extends LoginShape>(skin: T): T {
  const pageType = normalizePageType(skin.pageType, skin.afterRegisterAction)
  const action = followUpActionForPageType(pageType, skin.afterRegisterAction, skin.line)
  const policy = loginPolicy(skin.line, pageType, action)
  let registerMode = normalizeRegisterMode(skin.registerMode)
  if (policy.phone === 'on') registerMode = 'full'
  if (policy.phone === 'off') registerMode = 'none'
  const thirdPartyLogins = policy.thirds === 'off' ? [] : thirdPartyLoginsForLine(skin.line, skin.thirdPartyLogins)
  const enabled: LoginMethod[] = [...(registerMode === 'full' ? ['phone' as const] : []), ...thirdPartyLogins]
  const saved = (skin.loginOrder || []).filter((m) => enabled.includes(m))
  const loginOrder = [...saved, ...enabled.filter((m) => !saved.includes(m))]
  const loginLayout: LoginLayout = skin.loginLayout === 'two_zone' && enabled.length ? 'two_zone' : 'form_first'
  const secondaryLogins = loginLayout === 'two_zone' ? (skin.secondaryLogins || []).filter((m) => enabled.includes(m)) : []
  return {
    ...skin,
    pageType,
    registerMode,
    thirdPartyLogins,
    loginLayout,
    loginOrder,
    secondaryLogins,
    verifyEnabled: verifyEnabledForPage(pageType, registerMode, skin.verifyEnabled),
    extraFields: extraFieldsForPage(pageType, skin.extraFields),
    afterRegisterAction: action,
  } as T
}

/**
 * 历史数据回填（10.7 上线前的皮肤没有 loginLayout）：
 * - registerMode 'oauth'（日本仅三方）→ 'none'，三方保留 → 落在 R3，C 端不变；
 * - registerMode 'none' → 三方清空（老逻辑本来就不展示），仍是 R0；
 * - registerMode 'full' → 不变，R1 / R2；
 * - loginLayout = form_first，loginOrder = 手机号在前 + 三方按业务线默认顺序，secondaryLogins = []。
 */
export function backfillLoginConfig<T extends Partial<LoginShape> & { registerMode?: string }>(skin: T): T {
  if (skin.loginLayout) return skin
  const legacy = skin.registerMode as string | undefined
  return {
    ...skin,
    registerMode: legacy === 'oauth' || legacy === 'none' ? 'none' : 'full',
    thirdPartyLogins: legacy === 'none' ? [] : (skin.thirdPartyLogins || []),
    loginLayout: 'form_first',
    loginOrder: undefined,
    secondaryLogins: [],
  } as T
}

export function loginRenderState(skin: Pick<LandingSkin, 'registerMode' | 'thirdPartyLogins' | 'loginLayout' | 'loginOrder'>): LoginRenderState {
  const phone = skin.registerMode === 'full'
  const thirds = skin.thirdPartyLogins || []
  const count = (phone ? 1 : 0) + thirds.length
  if (!count) return 'R0'
  if (skin.loginLayout !== 'two_zone') return phone ? (thirds.length ? 'R1' : 'R2') : 'R3'
  if (count === 1 && phone) return 'R2'
  return 'R4'
}

export const SKIN_BUSINESS_LINES = ['韩国', '越南', '马来', '泰国', '印尼', '新加坡', '沙特', '日本', '香港'] as const

const LINE_PREFIX: Record<string, string> = {
  韩国: 'KR',
  越南: 'VN',
  马来: 'MY',
  泰国: 'TH',
  印尼: 'ID',
  新加坡: 'SG',
  沙特: 'SA',
  日本: 'JP',
  香港: 'HK',
  其他: 'OT',
}

const LINE_LANGUAGE: Record<string, string> = {
  韩国: 'ko',
  越南: 'vi',
  马来: 'ms',
  泰国: 'th',
  印尼: 'id',
  新加坡: 'en',
  沙特: 'ar',
  日本: 'ja',
  香港: 'zh-Hant',
  其他: 'en',
}

export const LINE_NAME_PLACEHOLDER: Record<string, { zh: string; en: string }> = {
  韩国: { zh: '例如：韩国暑期体验课皮肤', en: 'e.g. Korea summer trial skin' },
  越南: { zh: '例如：越南免费试听课皮肤', en: 'e.g. Vietnam free trial skin' },
  马来: { zh: '例如：马来西亚新客体验课皮肤', en: 'e.g. Malaysia new-user trial skin' },
  泰国: { zh: '例如：泰国暑期体验课皮肤', en: 'e.g. Thailand summer trial skin' },
  印尼: { zh: '例如：印尼新客体验课皮肤', en: 'e.g. Indonesia new-user trial skin' },
  新加坡: { zh: '例如：新加坡试听课皮肤', en: 'e.g. Singapore trial skin' },
  沙特: { zh: '例如：沙特免费体验课皮肤', en: 'e.g. Saudi free trial skin' },
  日本: { zh: '例如：日本落地页皮肤', en: 'e.g. Japan landing skin' },
  香港: { zh: '例如：香港落地頁皮膚', en: 'e.g. Hong Kong landing skin' },
  其他: { zh: '例如：其他市场落地页皮肤', en: 'e.g. Other-market landing skin' },
}

export const LINE_PHONE: Record<string, { dial: string; flag: string }> = {
  韩国: { dial: '+82', flag: '🇰🇷' },
  越南: { dial: '+84', flag: '🇻🇳' },
  马来: { dial: '+60', flag: '🇲🇾' },
  泰国: { dial: '+66', flag: '🇹🇭' },
  印尼: { dial: '+62', flag: '🇮🇩' },
  新加坡: { dial: '+65', flag: '🇸🇬' },
  沙特: { dial: '+966', flag: '🇸🇦' },
  日本: { dial: '+81', flag: '🇯🇵' },
  香港: { dial: '+852', flag: '🇭🇰' },
  其他: { dial: '+1', flag: '🌐' },
}

export function defaultLanguageForLine(line?: string) {
  return (line && LINE_LANGUAGE[line]) || 'en'
}

export function languageLabel(lang?: string) {
  return LANGUAGE_OPTIONS.find((x) => x.value === lang)?.label ?? '英语'
}

/** SEO / alt copy should match the landing page language (from business line). */
export function seoLanguageHint(line?: string, en = false) {
  const lang = defaultLanguageForLine(line)
  const label = languageLabel(lang)
  if (en) {
    return `Write in ${label} (the page language for this business line). Prefer the local language users search in; English is only for English pages.`
  }
  return `请用${label}填写（跟业务线落地页语言一致）。优先用目标市场本地语，方便当地搜索和广告抓取；只有英语页才写英语。`
}

export function seoTitlePlaceholder(line?: string) {
  const samples: Record<string, string> = {
    ja: '例：Dino AI｜子ども向けAI英会話アプリ 7日間無料体験',
    ko: '예: Dino AI｜아이 AI 영어 7일 무료 체험',
    vi: 'VD: Dino AI｜Ứng dụng AI tiếng Anh cho trẻ – dùng thử 7 ngày',
    ms: 'cth: Dino AI｜Aplikasi AI Bahasa Inggeris kanak-kanak, 7 hari percuma',
    th: 'เช่น Dino AI｜แอป AI ฝึกภาษาอังกฤษสำหรับเด็ก ทดลองฟรี 7 วัน',
    id: 'cth: Dino AI｜Aplikasi AI Bahasa Inggris anak, gratis 7 hari',
    ar: 'مثال: Dino AI｜تطبيق الذكاء الاصطناعي لتعلم الإنجليزية للأطفال',
    'zh-Hant': '例：Dino AI｜兒童 AI 英語 App 7 天免費體驗',
    en: 'e.g. Dino AI｜Kids AI English app, 7-day free trial',
  }
  return samples[defaultLanguageForLine(line)] || samples.en
}

export function seoDescriptionPlaceholder(line?: string) {
  const samples: Record<string, string> = {
    ja: '例：3〜12歳向け。毎日15分、ゲーム感覚で発音フィードバック。今なら7日間無料。',
    ko: '예: 3–12세 대상. 하루 15분, 게임처럼 배우고 발음 피드백. 지금 7일 무료.',
    vi: 'VD: Dành cho bé 3–12 tuổi. 15 phút/ngày, học như chơi, phản hồi phát âm. Dùng thử 7 ngày miễn phí.',
    ms: 'cth: Untuk kanak-kanak 3–12 tahun. 15 minit sehari, belajar sambil bermain. Percubaan percuma 7 hari.',
    th: 'เช่น สำหรับเด็ก 3–12 ปี วันละ 15 นาที เรียนเหมือนเล่นเกม พร้อมแก้การออกเสียง ทดลองฟรี 7 วัน',
    id: 'cth: Untuk anak 3–12 tahun. 15 menit sehari, belajar sambil bermain, ada koreksi pelafalan. Coba gratis 7 hari.',
    ar: 'مثال: للأطفال من 3 إلى 12 سنة. 15 دقيقة يوميًا مع ملاحظات النطق. تجربة مجانية 7 أيام.',
    'zh-Hant': '例：適合 3–12 歲。每天 15 分鐘、遊戲化學習、發音回饋。現在 7 天免費體驗。',
    en: 'e.g. For ages 3–12. 15 minutes a day, game-like lessons with pronunciation feedback. Try 7 days free.',
  }
  return samples[defaultLanguageForLine(line)] || samples.en
}

export function imageAltPlaceholder(line?: string) {
  const samples: Record<string, string> = {
    ja: '必須。図の内容を一文で。例：恐竜のキャラクターと一緒に英語を学ぶ子ども',
    ko: '필수. 그림 내용을 한 문장으로. 예: 공룡 캐릭터와 함께 영어를 배우는 아이',
    vi: 'Bắt buộc. Một câu mô tả ảnh. VD: Bé học tiếng Anh cùng nhân vật khủng long',
    ms: 'Wajib. Satu ayat perihal gambar. cth: Kanak-kanak belajar bahasa Inggeris bersama watak dinosaur',
    th: 'จำเป็น อธิบายภาพหนึ่งประโยค เช่น เด็กเรียนภาษาอังกฤษกับตัวละครไดโนเสาร์',
    id: 'Wajib. Satu kalimat tentang gambar. cth: Anak belajar bahasa Inggris bersama karakter dinosaurus',
    ar: 'مطلوب. جملة واحدة تصف الصورة. مثال: طفل يتعلم الإنجليزية مع شخصية الديناصور',
    'zh-Hant': '必填。用一句話寫清圖裡內容。例：孩子跟恐龍角色一起練英語口語',
    en: 'Required. One sentence about the image. e.g. A child learning English with a dinosaur character',
  }
  return samples[defaultLanguageForLine(line)] || samples.en
}

export function namePlaceholderForLine(line?: string, en = false) {
  const hit = line ? LINE_NAME_PLACEHOLDER[line] : undefined
  if (!hit) return en ? 'Select a business line first' : '请先选择业务线'
  return en ? hit.en : hit.zh
}

export function normalizePageType(type?: string, action?: string): LandingPageKind {
  const follow = normalizeAfterRegisterAction(action)
  if (type === 'pay') return 'pay'
  // Former「Web to App」skins fold into 获客落地页; follow-up stays download_app.
  if (type === 'lead' || type === 'web2app') return 'lead'
  if (type === 'standard' || !type) {
    return follow === 'sku_promo_pay' ? 'pay' : 'lead'
  }
  return 'pay'
}

export function followUpActionForPageType(pageType: LandingPageKind, action?: string, line?: string): AfterRegisterAction {
  if (pageType === 'pay') return 'sku_promo_pay'
  // 日本 / 香港获客：没有登录区，后续交互锁定为直接跳 OneLink。
  if (line === '香港' || line === '日本') return 'onelink'
  const allowed = followUpOptions('lead', line).map((x) => x.value)
  const next = normalizeAfterRegisterAction(action)
  if (allowed.includes(next)) return next
  if (line === '越南') return 'lead_vn'
  if (line === '马来') return 'lead_my'
  return 'download_app'
}

/** Submit rule: before-register OR after-register — either side with an image is enough. */
export function hasRequiredSceneContent(skin: Pick<LandingSkin, 'registerBefore' | 'registerAfter'>) {
  return hasSceneSrc(skin.registerBefore) || hasSceneSrc(skin.registerAfter)
}

export function lpAsset(file: string) {
  return `${import.meta.env.BASE_URL}lp-skin/${file}`
}

export function emptyRegisterField(label = 'Name', required = true): RegisterField {
  return { id: crypto.randomUUID(), key: 'custom', label, required }
}

export function normalizeRegisterField(field: Partial<RegisterField> & { id?: string; label?: string }): RegisterField {
  return {
    id: field.id || crypto.randomUUID(),
    key: field.key || 'custom',
    label: field.label || '',
    required: field.required !== false,
  }
}

export function normalizeThirdPartyLogins(ids?: string[]): ThirdPartyLogin[] {
  const allowed = new Set(THIRD_PARTY_OPTIONS.map((x) => x.value))
  return [...new Set((ids || []).filter((id): id is ThirdPartyLogin => allowed.has(id as ThirdPartyLogin)))]
}

export function normalizeRegisterMode(mode?: string): RegisterMode {
  return mode === 'none' || mode === 'oauth' ? 'none' : 'full'
}

/** Follow-ups that collect leads: the lead must land on a phone number. */
export function isLeadCollectAction(action?: string) {
  return action === 'lead_my' || action === 'lead_vn' || action === 'lead_sa'
}

/** 手机号开关按业务线策略收口；支付页「至少一种方式」在提交校验 V1 里拦。 */
export function registerModeForPage(pageType: LandingPageKind, mode?: string, line?: string, action?: string): RegisterMode {
  const policy = loginPolicy(line, pageType, followUpActionForPageType(pageType, action, line))
  if (policy.phone === 'on') return 'full'
  if (policy.phone === 'off') return 'none'
  return normalizeRegisterMode(mode)
}

/**
 * Payment landings must collect OTP before the backend lets the user continue.
 * Acquisition pages keep the operator's choice; no-register skins have no OTP.
 */
export function verifyEnabledForPage(
  pageType: LandingPageKind,
  mode?: string,
  verifyEnabled?: boolean,
): boolean {
  if (normalizeRegisterMode(mode) !== 'full') return false
  if (pageType === 'pay') return true
  return !!verifyEnabled
}

/** Extra register fields are only for acquisition (lead) landings. Payment pages stay empty. */
export function extraFieldsForPage(pageType: LandingPageKind, fields?: RegisterField[]): RegisterField[] {
  if (pageType === 'pay') return []
  return (fields || []).map(normalizeRegisterField)
}

export const DEFAULT_REGISTER_BG_COLOR = '#ffffff'

export function normalizeRegisterBgKind(kind?: string): RegisterBgKind {
  return kind === 'image' ? 'image' : 'color'
}

export function normalizeRegisterBgColor(color?: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color || '') ? (color as string) : DEFAULT_REGISTER_BG_COLOR
}

export const DEFAULT_REGISTER_AREA_BG_COLOR = '#fff3d6'

export function normalizeRegisterAreaBgKind(kind?: string): RegisterAreaBgKind {
  return kind === 'color' || kind === 'image' ? kind : 'none'
}

export function normalizeRegisterAreaBgColor(color?: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color || '') ? (color as string) : DEFAULT_REGISTER_AREA_BG_COLOR
}

export const DEFAULT_REGISTER_TITLE_COLOR = '#1f2329'

export function normalizeTitleColor(color?: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color || '') ? (color as string) : DEFAULT_REGISTER_TITLE_COLOR
}

export type AssetBudgetKey = 'hero' | 'scene' | 'sticky' | 'background' | 'video'

/** Upload hard limits shown to operators. Oversized files are rejected on upload. */
export const ASSET_BUDGETS: Record<AssetBudgetKey, { maxKB: number; width?: number; zh: string; en: string }> = {
  hero: { maxKB: 300, width: 750, zh: '支持 JPEG / PNG / WebP，单张不超过 300 KB', en: 'JPEG / PNG / WebP, max 300 KB each' },
  scene: { maxKB: 300, width: 750, zh: '支持 JPEG / PNG / WebP，单张不超过 300 KB', en: 'JPEG / PNG / WebP, max 300 KB each' },
  sticky: { maxKB: 300, width: 750, zh: '支持 JPEG / PNG / WebP，不超过 300 KB', en: 'JPEG / PNG / WebP, max 300 KB' },
  background: { maxKB: 300, width: 750, zh: '支持 JPEG / PNG / WebP，不超过 300 KB', en: 'JPEG / PNG / WebP, max 300 KB' },
  video: { maxKB: 40 * 1024, zh: '支持 MP4 / WebM，单文件不超过 40 MB', en: 'MP4 / WebM, max 40 MB' },
}

export const PAGE_WEIGHT_BUDGET_KB = 1024
/** ~1.5 Mbps, a typical weak 3G/4G link in Southeast Asia. */
export const SLOW_NETWORK_BYTES_PER_SEC = 190_000

export type BudgetLevel = 'ok' | 'warn' | 'danger' | 'unknown'

export function budgetLevel(bytes: number | undefined, key: AssetBudgetKey): BudgetLevel {
  if (bytes == null) return 'unknown'
  const max = ASSET_BUDGETS[key].maxKB * 1024
  if (bytes <= max) return 'ok'
  return bytes <= max * 2 && bytes <= PAGE_WEIGHT_BUDGET_KB * 1024 ? 'warn' : 'danger'
}

export function knownAssetBytes(asset?: SkinAsset): number | undefined {
  if (!asset?.src) return undefined
  if (asset.bytes != null) return asset.bytes
  if (asset.src.startsWith('data:')) {
    const body = asset.src.slice(asset.src.indexOf(',') + 1)
    return asset.src.includes(';base64,') ? Math.round(body.length * 0.75) : decodeURIComponent(body).length
  }
  return undefined
}

export function formatBytes(bytes?: number) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export type SkinSlot = {
  /** DOM anchor shared by the preview block and its config-summary row. */
  id: string
  group: 'hero' | 'before' | 'register' | 'after' | 'sticky'
  zh: string
  en: string
  asset: SkinAsset
  budget: AssetBudgetKey
  /** Whether alt text applies (images only). */
  describable: boolean
}

/** Sticky image and sticky button are independent; either or both may be on. */
export function stickyShowsImage(skin: LandingSkin) {
  return !!(skin.stickyImageEnabled && skin.stickyBar?.src)
}

export function stickyShowsButton(skin: LandingSkin) {
  return !!skin.stickyButtonEnabled
}

export function hasStickyBar(skin: LandingSkin) {
  return stickyShowsImage(skin) || stickyShowsButton(skin)
}

export function stickyButtonLabel(skin: LandingSkin, fallback: string) {
  return (skin.stickyBarCta || '').trim() || (skin.ctaText || '').trim() || fallback
}

export function normalizeStickyCtaMode(_mode?: string): 'bottom' | 'custom' {
  return 'custom'
}

export function normalizeStickyFlags(skin: Pick<LandingSkin, 'stickyBar' | 'stickyBarCta' | 'stickyImageEnabled' | 'stickyButtonEnabled' | 'stickyCtaMode' | 'stickyCtaRect'>) {
  return {
    stickyImageEnabled: skin.stickyImageEnabled ?? !!skin.stickyBar?.src,
    stickyButtonEnabled: skin.stickyButtonEnabled ?? !!(skin.stickyBarCta && String(skin.stickyBarCta).trim()),
    stickyCtaMode: normalizeStickyCtaMode(skin.stickyCtaMode),
    stickyCtaRect: skin.stickyCtaRect || { ...DEFAULT_STICKY_CTA_RECT },
  }
}

/** Images that need alt text: hero, before/after scenes, sticky art. Backgrounds and videos are excluded. */
export function missingImageAlts(skin: LandingSkin) {
  return collectSkinAssets(skin).filter((slot) => slot.describable && !slot.asset.alt?.trim())
}

/** Every uploaded asset, in the order it appears on the page. */
export function collectSkinAssets(skin: LandingSkin): SkinSlot[] {
  const out: SkinSlot[] = []
  const push = (slot: Omit<SkinSlot, 'describable'>) => {
    if (slot.asset?.src) out.push({ ...slot, describable: slot.budget !== 'video' && slot.budget !== 'background' })
  }
  skin.registerBefore.forEach((item, i) => {
    push({ id: `slot-before-${i}`, group: 'before', zh: `前置配图 ${i + 1}`, en: `Before image ${i + 1}`, asset: item, budget: 'scene' })
    if (item.withVideo && item.video) push({ id: `slot-before-${i}`, group: 'before', zh: `前置配图 ${i + 1} · 循环视频`, en: `Before image ${i + 1} · loop video`, asset: item.video, budget: 'video' })
  })
  if (normalizeRegisterAreaBgKind(skin.registerAreaBgKind) === 'image' && skin.registerAreaBgImage) {
    push({ id: 'slot-register', group: 'register', zh: '注册区域背景图', en: 'Register area background', asset: skin.registerAreaBgImage, budget: 'background' })
  }
  if (normalizeRegisterBgKind(skin.registerBgKind) === 'image' && skin.registerBgImage) {
    push({ id: 'slot-register', group: 'register', zh: '注册表单背景图', en: 'Register form background', asset: skin.registerBgImage, budget: 'background' })
  }
  skin.registerAfter.forEach((item, i) => {
    push({ id: `slot-after-${i}`, group: 'after', zh: `后置配图 ${i + 1}`, en: `After image ${i + 1}`, asset: item, budget: 'scene' })
    if (item.withVideo && item.video) push({ id: `slot-after-${i}`, group: 'after', zh: `后置配图 ${i + 1} · 循环视频`, en: `After image ${i + 1} · loop video`, asset: item.video, budget: 'video' })
  })
  if (stickyShowsImage(skin)) {
    push({ id: 'slot-sticky', group: 'sticky', zh: '吸底图', en: 'Sticky bar', asset: skin.stickyBar as SkinAsset, budget: 'sticky' })
  }
  return out
}

export function normalizeAfterRegisterAction(action?: string): AfterRegisterAction {
  if (action === 'onelink' || action === 'download_app' || action === 'lead_my' || action === 'lead_vn' || action === 'lead_sa' || action === 'sku_promo_pay') return action
  return 'sku_promo_pay'
}

export function hasSceneSrc(items?: SkinAsset[]) {
  return (items || []).some((item) => !!item.src)
}

export function sceneVideoIncomplete(items?: SkinAsset[]) {
  return (items || []).some((item) => {
    if (!item.withVideo) return false
    if (!item.video?.src) return true
    // Lightbox cannot use the first frame as cover — operators must upload a poster.
    if (normalizeVideoPlayMode(item.videoPlayMode) === 'lightbox' && !item.videoCover?.src) return true
    return false
  })
}

export function normalizeVerifyEnabled(skin: {
  pageType?: string
  afterRegisterAction?: string
  registerMode?: string
  verifyEnabled?: boolean
}) {
  const pageType = normalizePageType(skin.pageType, skin.afterRegisterAction)
  if (skin.registerMode === 'oauth') return false
  if (pageType === 'pay') return true
  if (typeof skin.verifyEnabled === 'boolean') return skin.verifyEnabled
  return skin.registerMode === 'full'
}

export function normalizeCtaStyle(style?: Partial<CtaStyle> | { from?: string; to?: string; text?: string; breathe?: boolean; preset?: string }): CtaStyle {
  const raw = style?.preset === 'outline' ? 'sunset' : style?.preset
  const preset = BUTTON_PRESET_OPTIONS.some((x) => x.value === raw)
    ? (raw as ButtonPreset)
    : 'sunset'
  const colors = PRESET_COLORS[preset]
  const hex = (value: string | undefined, fallback: string) => (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value || '') ? value as string : fallback)
  return {
    preset,
    from: hex(style?.from, colors.from),
    to: hex(style?.to, colors.to),
    text: hex(style?.text, colors.text),
    breathe: style?.breathe !== false,
  }
}

export function applyButtonPreset(preset: ButtonPreset, breathe: boolean): CtaStyle {
  return { preset, ...PRESET_COLORS[preset], breathe }
}

export function buttonClassName(style?: Partial<CtaStyle>, extra = '') {
  const next = normalizeCtaStyle(style)
  return [extra, 'lp-btn', `lp-btn--${next.preset}`, next.breathe ? 'is-breathe' : ''].filter(Boolean).join(' ')
}

export function buttonPaint(style?: Partial<CtaStyle>): CSSProperties {
  const next = normalizeCtaStyle(style)
  return {
    background: `linear-gradient(180deg, ${next.from}, ${next.to})`,
    color: next.text,
    borderColor: 'transparent',
  }
}

export function contentScenes(skin: Pick<LandingSkin, 'registerBefore' | 'registerAfter'>): SkinAsset[] {
  return [...(skin.registerBefore || []), ...(skin.registerAfter || [])]
}

export type SkinTrackButton = {
  key: string
  zh: string
  en: string
  /** click event_id. Assigned by slot, never typed by the operator. */
  eventId: string
}

const SCENE_BUTTON_ON = (item: SkinAsset) => !!item.ctaMode && item.ctaMode !== 'none'

/**
 * Login-page buttons only. Follow-up pages (download popup, extra-info skip / confirm / done)
 * keep their own event ids, but they are not listed in this reference.
 * Index follows the current list (1-based). Copy, color, and position do not change the id.
 */
export function skinTrackButtons(skin: Pick<LandingSkin, 'thirdPartyLogins' | 'registerBefore' | 'registerAfter' | 'stickyButtonEnabled'> & { registerMode?: RegisterMode }): SkinTrackButton[] {
  const rows: SkinTrackButton[] = []
  if (skin.registerMode === 'full' || !(skin.thirdPartyLogins || []).length) rows.push({ key: 'form', zh: '注册按钮', en: 'Register button', eventId: 'h5_lead_submit' })
  for (const provider of skin.thirdPartyLogins || []) {
    rows.push({
      key: `oauth-${provider}`,
      zh: `三方登录 · ${provider}`,
      en: `Social login · ${provider}`,
      eventId: `h5_login_${provider}`,
    })
  }
  ;(skin.registerBefore || []).forEach((item, i) => {
    if (!SCENE_BUTTON_ON(item)) return
    const n = i + 1
    rows.push({ key: `before-${item.id}`, zh: `前置配图 ${n} · 叠按钮`, en: `Before image ${n} · overlay button`, eventId: `h5_lp_before_${n}_cta` })
  })
  ;(skin.registerAfter || []).forEach((item, i) => {
    if (!SCENE_BUTTON_ON(item)) return
    const n = i + 1
    rows.push({ key: `after-${item.id}`, zh: `后置配图 ${n} · 叠按钮`, en: `After image ${n} · overlay button`, eventId: `h5_lp_after_${n}_cta` })
  })
  if (skin.stickyButtonEnabled) {
    rows.push({ key: 'sticky', zh: '吸底按钮', en: 'Sticky button', eventId: 'h5_lp_sticky_cta' })
  }
  return rows
}

export function normalizeVideoPlayMode(mode?: string): VideoPlayMode {
  return mode === 'lightbox' ? 'lightbox' : 'loop'
}

export function normalizeSceneAsset(asset: SkinAsset, inherit?: { text?: string; style?: CtaStyle }): SkinAsset {
  // Scene buttons are always custom-positioned; legacy "bottom" maps to the default bottom rect.
  const mode: SceneCtaMode = asset.ctaMode === 'none'
    ? 'none'
    : asset.ctaMode === 'bottom' || asset.ctaMode === 'custom' || inherit?.text
      ? 'custom'
      : 'none'
  return {
    ...asset,
    withVideo: !!asset.withVideo,
    videoPlayMode: normalizeVideoPlayMode(asset.videoPlayMode),
    videoCover: asset.videoCover?.src ? { ...asset.videoCover, kind: 'image' as const } : undefined,
    videoRect: asset.videoRect || { ...DEFAULT_VIDEO_HOLE },
    ctaMode: mode,
    ctaText: asset.ctaText || inherit?.text || '',
    ctaStyle: normalizeCtaStyle(asset.ctaStyle || inherit?.style),
    ctaRect: asset.ctaRect || { ...DEFAULT_SCENE_CTA_RECT },
  }
}

export function flattenSkinScenes(skin: LandingSkin & { contentButtons?: { text?: string; style?: CtaStyle; place?: string }[] }): LandingSkin {
  const inherit = (skin.contentButtons || []).find((item) => item.place === 'afterEveryScene' || !item.place)
  const { contentButtons: _legacy, hero, ...rest } = skin
  const pageType = normalizePageType(skin.pageType, skin.afterRegisterAction)
  // The standalone header image was retired: the first before-register image now opens the page.
  const before = hero?.src
    ? [{ ...hero, ctaMode: 'none' as const }, ...(skin.registerBefore || [])]
    : (skin.registerBefore || [])
  return normalizeLoginConfig({
      ...rest,
      pageType,
      registerBgKind: normalizeRegisterBgKind(skin.registerBgKind),
      registerBgColor: normalizeRegisterBgColor(skin.registerBgColor),
      registerAreaBgKind: normalizeRegisterAreaBgKind(skin.registerAreaBgKind),
      registerAreaBgColor: normalizeRegisterAreaBgColor(skin.registerAreaBgColor),
      registerBefore: before.map((item) => normalizeSceneAsset(item, inherit)),
      registerAfter: (skin.registerAfter || []).map((item) => normalizeSceneAsset(item, inherit)),
    })
}

/** Auto-issued template_code used by 落地页管理「皮肤类型」. */
export function allocateTemplateCode(line: string, skins: LandingSkin[], existing?: string) {
  if (existing?.trim()) return existing.trim()
  const prefix = `${LINE_PREFIX[line] || 'GL'}_SKIN_`
  const used = new Set(skins.map((s) => s.code))
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  for (const letter of letters) {
    const code = prefix + letter
    if (!used.has(code)) return code
  }
  return prefix + Math.random().toString(36).slice(2, 6).toUpperCase()
}

function svgData(svg: string) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const HERO_KR = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 560" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7C5CFF"/><stop offset="1" stop-color="#2F6BFF"/></linearGradient></defs><rect width="750" height="560" fill="url(#g)"/><circle cx="560" cy="120" r="90" fill="#FFD54A" opacity=".9"/><text x="48" y="92" fill="#fff" font-size="42" font-family="Arial Black,sans-serif">Dino English</text><text x="48" y="150" fill="#E8F0FF" font-size="26" font-family="PingFang SC,sans-serif">7-day free trial for kids</text><rect x="80" y="210" width="280" height="260" rx="28" fill="#fff" opacity=".18"/><ellipse cx="220" cy="430" rx="110" ry="28" fill="#1a3a8a" opacity=".25"/><path d="M150 360c20-70 90-110 150-70 20 14 34 40 28 70-40 8-90 14-178 0z" fill="#7CFFB2"/><circle cx="210" cy="300" r="18" fill="#1f2329"/><circle cx="268" cy="298" r="18" fill="#1f2329"/><circle cx="216" cy="298" r="6" fill="#fff"/><circle cx="274" cy="296" r="6" fill="#fff"/></svg>`)

const HERO_JP = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 820" fill="none"><rect width="750" height="820" fill="#C8F0E8"/><rect y="620" width="750" height="200" fill="#8ED9A4"/><circle cx="560" cy="140" r="70" fill="#FFF3A3"/><rect x="430" y="210" width="90" height="280" rx="8" fill="#B9E4F2"/><rect x="448" y="160" width="54" height="70" fill="#9FD3E6"/><circle cx="475" cy="150" r="28" fill="#9FD3E6"/><text x="375" y="92" text-anchor="middle" fill="#2B2A6A" font-size="22" font-family="Arial Black,sans-serif">TODO ENGLISH</text><text x="375" y="128" text-anchor="middle" fill="#3B3A7A" font-size="28" font-family="Hiragino Sans,sans-serif">子どもが夢中になる！</text><rect x="90" y="180" width="570" height="320" rx="18" fill="#16324A"/><circle cx="375" cy="320" r="70" fill="#7C5CFF"/><rect x="300" y="300" width="150" height="40" rx="20" fill="#5EE0FF" opacity=".8"/><rect x="180" y="540" width="390" height="64" rx="32" fill="#FF4FA0"/><text x="375" y="580" text-anchor="middle" fill="#fff" font-size="20" font-family="Hiragino Sans,sans-serif">7日間の無料体験</text></svg>`)

const STICKY = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 120" fill="none"><defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#FF4D6A"/><stop offset="1" stop-color="#FF8A3D"/></linearGradient></defs><rect width="750" height="120" fill="url(#s)"/><text x="40" y="48" fill="#fff" font-size="22" font-family="PingFang SC,sans-serif">限时免费体验课</text><text x="40" y="82" fill="#FFE8D6" font-size="16" font-family="PingFang SC,sans-serif">留下手机号，顾问马上联系你</text><rect x="520" y="34" width="190" height="52" rx="26" fill="#fff"/><text x="615" y="67" text-anchor="middle" fill="#FF4D6A" font-size="18" font-family="PingFang SC,sans-serif">立即领取</text></svg>`)

const BEFORE = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 220" fill="none"><rect width="750" height="220" rx="16" fill="#FFF4D6"/><text x="40" y="90" fill="#7A4E00" font-size="28" font-family="PingFang SC,sans-serif">注册即送 7 天体验</text><text x="40" y="140" fill="#A56A12" font-size="18" font-family="PingFang SC,sans-serif">适合 4–12 岁，每天 15 分钟</text></svg>`)

const AFTER = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 240" fill="none"><rect width="750" height="240" rx="16" fill="#EEF4FF"/><text x="40" y="80" fill="#1F3B8A" font-size="26" font-family="PingFang SC,sans-serif">家长看得见进步</text><text x="40" y="130" fill="#526172" font-size="16" font-family="PingFang SC,sans-serif">学习报告 · 发音反馈 · 趣味关卡</text></svg>`)

function asset(id: string, src: string, name: string, kind: SkinAsset['kind'] = 'image'): SkinAsset {
  return { id, kind, src, name }
}

function withBottomCta(item: SkinAsset, text: string, style = DEFAULT_CTA_STYLE): SkinAsset {
  return {
    ...item,
    ctaMode: 'custom',
    ctaText: text,
    ctaStyle: { ...style },
    ctaRect: { ...DEFAULT_SCENE_CTA_RECT },
  }
}

function now() {
  return '2026-09-20 17:40:00'
}

export function emptySceneImage(): SkinAsset {
  return {
    id: crypto.randomUUID(),
    kind: 'image',
    src: '',
    name: '',
    withVideo: false,
    videoPlayMode: 'loop',
    videoRect: { ...DEFAULT_VIDEO_HOLE },
    ctaMode: 'none',
    ctaRect: { ...DEFAULT_SCENE_CTA_RECT },
  }
}

export function emptySkin(actor = 'admin@dinoai.ai'): LandingSkin {
  return {
    id: `SKIN_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    code: '',
    name: '',
    line: '',
    pageType: 'pay',
    language: 'en',
    registerMode: 'full',
    verifyEnabled: true,
    extraFields: [],
    thirdPartyLogins: [],
    afterRegisterAction: 'sku_promo_pay',
    ctaText: '',
    ctaStyle: { ...DEFAULT_CTA_STYLE },
    stickyCtaStyle: { ...DEFAULT_CTA_STYLE },
    stickyImageEnabled: false,
    stickyButtonEnabled: false,
    stickyCtaMode: 'custom',
    stickyCtaRect: { ...DEFAULT_STICKY_CTA_RECT },
    registerBgKind: 'color',
    registerBgColor: DEFAULT_REGISTER_BG_COLOR,
    registerAreaBgKind: 'none',
    registerAreaBgColor: DEFAULT_REGISTER_AREA_BG_COLOR,
    registerBefore: [],
    registerAfter: [],
    effects: [],
    status: 'draft',
    revision: 1,
    createdAt: now(),
    updatedAt: now(),
    updatedBy: actor,
  }
}

function seedHistory(actor: string, at: string, action: string, detail: string): SkinHistoryEntry[] {
  return [{ id: `H_seed_${Math.random().toString(36).slice(2, 8)}`, at, actor, action, detail }]
}

export function seedLandingSkins(): LandingSkinStore {
  const jpPanel: SkinAsset = {
    ...asset('before-jp', HERO_JP, 'jp-campaign-panel.png'),
  }
  const t = now()
  return {
    version: 6,
    skins: [
      {
        id: 'SKIN_1MW',
        code: 'KR_SKIN_A',
        name: '韩国暑期体验课 · 注册页皮肤',
        line: '韩国',
        pageType: 'pay',
        language: 'ko',
        registerMode: 'full',
        verifyEnabled: true,
        extraFields: [],
        thirdPartyLogins: ['google', 'apple', 'facebook', 'kakao'],
        afterRegisterAction: 'sku_promo_pay' as const,
        ctaText: '바로 시작하기',
        ctaStyle: { ...DEFAULT_CTA_STYLE },
        stickyCtaStyle: { ...DEFAULT_CTA_STYLE },
        hero: asset('hero-1mw', lpAsset('family.png'), 'family.png'),
        registerBefore: [],
        registerAfter: [asset('after-1mw', AFTER, 'after-1mw.png')],
        effects: [],
        status: 'published',
        revision: 1,
        lastPublishedRevision: 1,
        createdAt: t,
        updatedAt: t,
        updatedBy: 'admin@dinoai.ai',
        history: seedHistory('admin@dinoai.ai', t, '提交发布', '首次发布，生成模板 ID KR_SKIN_A'),
      },
      {
        id: 'SKIN_KR_B',
        code: 'KR_SKIN_B',
        name: '韩国落地页样式',
        line: '韩国',
        pageType: 'pay',
        language: 'ko',
        registerMode: 'full',
        verifyEnabled: true,
        extraFields: [],
        thirdPartyLogins: ['kakao', 'apple'],
        afterRegisterAction: 'sku_promo_pay' as const,
        ctaText: '지금 구매',
        ctaStyle: { ...DEFAULT_CTA_STYLE },
        stickyCtaStyle: applyButtonPreset('chunky', true),
        hero: asset('hero-kr-b', HERO_KR, 'hero-kr-b.png'),
        registerBefore: [asset('before-kr-b', BEFORE, 'before-kr-b.png')],
        registerAfter: [],
        stickyBar: asset('sticky-kr-b', STICKY, 'sticky-kr-b.png'),
        stickyImageEnabled: true,
        stickyBarCta: '立即报名',
        stickyButtonEnabled: true,
        stickyCtaMode: 'custom' as const,
        stickyCtaRect: { ...DEFAULT_STICKY_CTA_RECT },
        effects: [],
        status: 'published',
        revision: 1,
        lastPublishedRevision: 1,
        createdAt: t,
        updatedAt: t,
        updatedBy: 'admin@dinoai.ai',
        history: seedHistory('admin@dinoai.ai', t, '提交发布', '首次发布，生成模板 ID KR_SKIN_B'),
      },
      {
        id: 'SKIN_KR_C',
        code: 'KR_SKIN_C',
        name: '韩国支付落地页 · 主次两区（全在主区，手机号最后）',
        line: '韩国',
        pageType: 'pay',
        language: 'ko',
        registerTitle: '로그인하고 플랜 선택하기',
        seoTitle: 'Dino AI｜아이 AI 영어 앱 구독',
        seoDescription: '3–12세 아이를 위한 AI 영어 앱. 카카오로 바로 로그인하고 플랜을 선택하세요.',
        registerMode: 'full',
        verifyEnabled: true,
        extraFields: [],
        thirdPartyLogins: ['kakao', 'google', 'apple', 'facebook'],
        loginLayout: 'two_zone' as const,
        loginOrder: ['kakao', 'google', 'apple', 'facebook', 'phone'],
        secondaryLogins: [],
        afterRegisterAction: 'sku_promo_pay' as const,
        ctaText: '지금 구매',
        ctaStyle: { ...DEFAULT_CTA_STYLE },
        stickyCtaStyle: { ...DEFAULT_CTA_STYLE },
        hero: { ...asset('hero-kr-c', HERO_KR, 'hero-kr-c.png'), alt: '공룡 캐릭터와 함께 영어를 배우는 아이' },
        registerBefore: [],
        registerAfter: [asset('after-kr-c', AFTER, 'after-kr-c.png')],
        stickyImageEnabled: false,
        stickyButtonEnabled: false,
        stickyCtaMode: 'custom' as const,
        stickyCtaRect: { ...DEFAULT_STICKY_CTA_RECT },
        effects: [],
        status: 'published',
        revision: 1,
        lastPublishedRevision: 1,
        createdAt: t,
        updatedAt: t,
        updatedBy: 'admin@dinoai.ai',
        history: seedHistory('admin@dinoai.ai', t, '提交发布', '首次发布，生成模板 ID KR_SKIN_C'),
      },
      {
        id: 'SKIN_TH01',
        code: 'TH_SKIN_A',
        name: '泰国支付落地页 · 仅手机号',
        line: '泰国',
        pageType: 'pay',
        language: 'th',
        registerTitle: 'เข้าสู่ระบบเพื่อเลือกแพ็กเกจ',
        seoTitle: 'Dino AI｜แอป AI ฝึกภาษาอังกฤษสำหรับเด็ก',
        seoDescription: 'แอป AI ฝึกภาษาอังกฤษสำหรับเด็ก 3–12 ปี เข้าสู่ระบบด้วยเบอร์โทรแล้วเลือกแพ็กเกจ',
        registerMode: 'full',
        verifyEnabled: true,
        extraFields: [],
        thirdPartyLogins: [],
        loginLayout: 'form_first' as const,
        afterRegisterAction: 'sku_promo_pay' as const,
        ctaText: 'ซื้อเลย',
        ctaStyle: { ...DEFAULT_CTA_STYLE },
        stickyCtaStyle: { ...DEFAULT_CTA_STYLE },
        hero: { ...asset('hero-th', HERO_KR, 'hero-th.png'), alt: 'เด็กเรียนภาษาอังกฤษกับตัวละครไดโนเสาร์' },
        registerBefore: [],
        registerAfter: [asset('after-th', AFTER, 'after-th.png')],
        stickyImageEnabled: false,
        stickyButtonEnabled: false,
        stickyCtaMode: 'custom' as const,
        stickyCtaRect: { ...DEFAULT_STICKY_CTA_RECT },
        effects: [],
        status: 'published',
        revision: 1,
        lastPublishedRevision: 1,
        createdAt: t,
        updatedAt: t,
        updatedBy: 'admin@dinoai.ai',
        history: seedHistory('admin@dinoai.ai', t, '提交发布', '首次发布，生成模板 ID TH_SKIN_A'),
      },
      {
        id: 'SKIN_JP01',
        code: 'JP_SKIN_A',
        name: '日本支付落地页 · 仅三方登录',
        line: '日本',
        pageType: 'pay',
        registerTitle: 'ログインしてプランを選ぶ',
        registerSubtitle: 'LINE・Apple・Google・Facebookで、すぐに始められます',
        seoTitle: 'Dino AI｜子ども向けAI英会話アプリ 有料プラン',
        seoDescription: '3〜12歳の子ども向けAI英会話アプリ。LINEでログインして、PayPayでお支払い。',
        language: 'ja',
        registerMode: 'none',
        verifyEnabled: false,
        extraFields: [],
        thirdPartyLogins: ['line', 'apple', 'google', 'facebook'],
        afterRegisterAction: 'sku_promo_pay' as const,
        ctaStyle: applyButtonPreset('midnight', false),
        stickyCtaStyle: { ...DEFAULT_CTA_STYLE },
        registerAreaBgKind: 'color',
        registerAreaBgColor: '#ffe3a3',
        hero: { ...asset('hero-jp-top', lpAsset('family.png'), 'family.png'), alt: '恐竜のキャラクターと一緒に英語を学ぶ子ども' },
        registerBefore: [withBottomCta(jpPanel, 'プランを見る', applyButtonPreset('midnight', true))],
        registerAfter: [asset('after-jp', AFTER, 'after-jp.png')],
        stickyBar: asset('sticky-jp', STICKY, 'sticky-jp.png'),
        stickyImageEnabled: false,
        stickyBarCta: 'ログインしてプランを選ぶ',
        stickyButtonEnabled: true,
        stickyCtaMode: 'custom' as const,
        stickyCtaRect: { ...DEFAULT_STICKY_CTA_RECT },
        effects: [],
        status: 'published',
        revision: 1,
        lastPublishedRevision: 1,
        createdAt: t,
        updatedAt: t,
        updatedBy: 'admin@dinoai.ai',
        history: seedHistory('admin@dinoai.ai', t, '提交发布', '首次发布，生成模板 ID JP_SKIN_A'),
      },
      {
        id: 'SKIN_JP02',
        code: 'JP_SKIN_B',
        name: '日本获客落地页 · 默认（直接跳 OneLink）',
        line: '日本',
        pageType: 'lead',
        seoTitle: 'Dino AI｜子ども向けAI英会話アプリ 7日間無料体験',
        seoDescription: '3〜12歳の子ども向けAI英会話アプリ。ゲーム感覚で毎日15分、発音フィードバック付き。今なら7日間無料。',
        language: 'ja',
        registerMode: 'none',
        verifyEnabled: false,
        extraFields: [],
        thirdPartyLogins: [],
        afterRegisterAction: 'onelink' as const,
        ctaText: '無料でDinoAIを試してみる',
        ctaStyle: applyButtonPreset('midnight', false),
        stickyCtaStyle: applyButtonPreset('midnight', true),
        hero: { ...asset('hero-jp-b', lpAsset('family.png'), 'family.png'), alt: '恐竜のキャラクターと一緒に英語を学ぶ子ども' },
        registerBefore: [withBottomCta(jpPanel, 'AIの先生と話してみる →', applyButtonPreset('midnight', true))],
        registerAfter: [withBottomCta(asset('after-jp-b', AFTER, 'after-jp.png'), '無料で学習を始める →', applyButtonPreset('midnight', true))],
        stickyBar: asset('sticky-jp-b', STICKY, 'sticky-jp.png'),
        stickyImageEnabled: false,
        stickyBarCta: '無料でDinoAIを試してみる →',
        stickyButtonEnabled: true,
        stickyCtaMode: 'custom' as const,
        stickyCtaRect: { ...DEFAULT_STICKY_CTA_RECT },
        effects: [],
        status: 'published',
        revision: 1,
        lastPublishedRevision: 1,
        createdAt: t,
        updatedAt: t,
        updatedBy: 'admin@dinoai.ai',
        history: seedHistory('admin@dinoai.ai', t, '提交发布', '首次发布，生成模板 ID JP_SKIN_B'),
      },
      {
        id: 'SKIN_JP03',
        code: 'JP_SKIN_C',
        name: '日本支付落地页 · App 两区（待排期示例）',
        line: '日本',
        pageType: 'pay',
        registerTitle: 'ログインしてプランを選ぶ',
        registerSubtitle: 'LINEで、すぐに始められます',
        seoTitle: 'Dino AI｜子ども向けAI英会話アプリ 有料プラン',
        seoDescription: '3〜12歳の子ども向けAI英会話アプリ。LINEでログインして、プランを選べます。',
        language: 'ja',
        registerMode: 'none',
        verifyEnabled: false,
        extraFields: [],
        thirdPartyLogins: ['line', 'apple', 'google', 'facebook'],
        loginLayout: 'two_zone' as const,
        loginOrder: ['line', 'apple', 'google', 'facebook'],
        secondaryLogins: ['facebook'],
        afterRegisterAction: 'sku_promo_pay' as const,
        ctaStyle: applyButtonPreset('midnight', false),
        stickyCtaStyle: applyButtonPreset('midnight', true),
        registerAreaBgKind: 'color',
        registerAreaBgColor: '#e3f6ea',
        hero: { ...asset('hero-jp-c', lpAsset('family.png'), 'family.png'), alt: '恐竜のキャラクターと一緒に英語を学ぶ子ども' },
        registerBefore: [withBottomCta(jpPanel, 'プランを見る', applyButtonPreset('midnight', true))],
        registerAfter: [asset('after-jp-c', AFTER, 'after-jp.png')],
        stickyBar: asset('sticky-jp-c', STICKY, 'sticky-jp.png'),
        stickyImageEnabled: false,
        stickyBarCta: 'LINEでログインしてプランを選ぶ',
        stickyButtonEnabled: true,
        stickyCtaMode: 'custom' as const,
        stickyCtaRect: { ...DEFAULT_STICKY_CTA_RECT },
        effects: [],
        status: 'published',
        revision: 1,
        lastPublishedRevision: 1,
        createdAt: t,
        updatedAt: t,
        updatedBy: 'admin@dinoai.ai',
        history: seedHistory('admin@dinoai.ai', t, '提交发布', '首次发布，生成模板 ID JP_SKIN_C'),
      },
      {
        id: 'SKIN_HK01',
        code: 'HK_SKIN_A',
        name: '香港支付落地页 · 手机号 + 三方',
        line: '香港',
        pageType: 'pay',
        registerTitle: '登入後選擇方案',
        registerSubtitle: '手機號、Google、Apple、Facebook 都可以登入',
        seoTitle: 'Dino AI｜兒童 AI 英語 App 付費方案',
        seoDescription: '適合 3–12 歲。每天 15 分鐘、遊戲化學習。登入後用 AlipayHK 付款。',
        language: 'zh-Hant',
        registerMode: 'full',
        verifyEnabled: true,
        extraFields: [],
        thirdPartyLogins: ['google', 'apple', 'facebook'],
        afterRegisterAction: 'sku_promo_pay' as const,
        ctaText: '登入並選擇方案',
        ctaStyle: applyButtonPreset('midnight', false),
        stickyCtaStyle: { ...DEFAULT_CTA_STYLE },
        registerAreaBgKind: 'color',
        registerAreaBgColor: '#ffe3a3',
        hero: { ...asset('hero-hk-top', lpAsset('family.png'), 'family.png'), alt: '孩子跟恐龍角色一起練英語口語' },
        registerBefore: [withBottomCta(jpPanel, '查看方案', applyButtonPreset('midnight', true))],
        registerAfter: [asset('after-hk', AFTER, 'after-hk.png')],
        stickyBar: asset('sticky-hk', STICKY, 'sticky-hk.png'),
        stickyImageEnabled: false,
        stickyBarCta: '登入並選擇方案',
        stickyButtonEnabled: true,
        stickyCtaMode: 'custom' as const,
        stickyCtaRect: { ...DEFAULT_STICKY_CTA_RECT },
        effects: [],
        status: 'published',
        revision: 1,
        lastPublishedRevision: 1,
        createdAt: t,
        updatedAt: t,
        updatedBy: 'admin@dinoai.ai',
        history: seedHistory('admin@dinoai.ai', t, '提交发布', '首次发布，生成模板 ID HK_SKIN_A'),
      },
      {
        id: 'SKIN_HK02',
        code: 'HK_SKIN_B',
        name: '香港获客落地页 · 直接跳 OneLink',
        line: '香港',
        pageType: 'lead',
        seoTitle: 'Dino AI｜兒童 AI 英語 App 7 天免費體驗',
        seoDescription: '適合 3–12 歲。每天 15 分鐘、遊戲化學習、發音回饋。現在 7 天免費體驗。',
        language: 'zh-Hant',
        registerMode: 'none',
        verifyEnabled: false,
        extraFields: [],
        thirdPartyLogins: [],
        afterRegisterAction: 'onelink' as const,
        ctaText: '免費試用 Dino AI',
        ctaStyle: applyButtonPreset('midnight', false),
        stickyCtaStyle: applyButtonPreset('midnight', true),
        hero: { ...asset('hero-hk-b', lpAsset('family.png'), 'family.png'), alt: '孩子跟恐龍角色一起練英語口語' },
        registerBefore: [withBottomCta(jpPanel, '跟 AI 老師說說話 →', applyButtonPreset('midnight', true))],
        registerAfter: [withBottomCta(asset('after-hk-b', AFTER, 'after-hk.png'), '免費開始學習 →', applyButtonPreset('midnight', true))],
        stickyBar: asset('sticky-hk-b', STICKY, 'sticky-hk.png'),
        stickyImageEnabled: false,
        stickyBarCta: '免費試用 Dino AI →',
        stickyButtonEnabled: true,
        stickyCtaMode: 'custom' as const,
        stickyCtaRect: { ...DEFAULT_STICKY_CTA_RECT },
        effects: [],
        status: 'published',
        revision: 1,
        lastPublishedRevision: 1,
        createdAt: t,
        updatedAt: t,
        updatedBy: 'admin@dinoai.ai',
        history: seedHistory('admin@dinoai.ai', t, '提交发布', '首次发布，生成模板 ID HK_SKIN_B'),
      },
      {
        id: 'SKIN_VN01',
        code: 'VN_SKIN_A',
        name: '越南线索页 · 无验证注册',
        line: '越南',
        pageType: 'lead',
        language: 'vi',
        registerMode: 'full',
        verifyEnabled: false,
        extraFields: [{ id: 'name-vn', key: 'name', label: 'Name', required: true }],
        thirdPartyLogins: ['google', 'apple', 'facebook'],
        afterRegisterAction: 'lead_vn' as const,
        ctaStyle: { ...DEFAULT_CTA_STYLE },
        stickyCtaStyle: applyButtonPreset('midnight', true),
        hero: asset('hero-vn', HERO_KR, 'hero-vn.png'),
        registerBefore: [asset('before-vn', BEFORE, 'before-vn.png')],
        registerAfter: [],
        stickyBar: asset('sticky-vn', STICKY, 'sticky-vn.png'),
        stickyImageEnabled: true,
        stickyBarCta: 'Đăng ký ngay',
        stickyButtonEnabled: true,
        stickyCtaMode: 'custom' as const,
        stickyCtaRect: { ...DEFAULT_STICKY_CTA_RECT },
        effects: [],
        status: 'published',
        revision: 1,
        lastPublishedRevision: 1,
        createdAt: t,
        updatedAt: t,
        updatedBy: 'admin@dinoai.ai',
        history: seedHistory('admin@dinoai.ai', t, '提交发布', '首次发布，生成模板 ID VN_SKIN_A'),
      },
      {
        id: 'SKIN_MY01',
        code: 'MY_SKIN_A',
        name: '马来线索页 · 手机号 + Name',
        line: '马来',
        pageType: 'lead',
        language: 'ms',
        registerMode: 'full',
        verifyEnabled: false,
        extraFields: [{ id: 'name-my', key: 'name', label: 'Name', required: true }],
        thirdPartyLogins: ['google', 'apple', 'facebook'],
        afterRegisterAction: 'lead_my' as const,
        ctaText: 'Start free trial',
        ctaStyle: applyButtonPreset('chunky', true),
        stickyCtaStyle: applyButtonPreset('sunset', false),
        hero: asset('hero-my', lpAsset('family.png'), 'family.png'),
        registerBefore: [],
        registerAfter: [asset('after-my', AFTER, 'after-my.png')],
        effects: [],
        status: 'published',
        revision: 1,
        lastPublishedRevision: 1,
        createdAt: t,
        updatedAt: t,
        updatedBy: 'admin@dinoai.ai',
        history: seedHistory('admin@dinoai.ai', t, '提交发布', '首次发布，生成模板 ID MY_SKIN_A'),
      },
      {
        id: 'SKIN_SA01',
        code: 'SA_SKIN_A',
        name: '沙特线索页 · 阿语四项留资',
        line: '沙特',
        pageType: 'lead',
        language: 'ar',
        registerTitle: 'احصل على حصة إنجليزي مجانية بالذكاء الاصطناعي في 30 ثانية',
        registerSubtitle: 'لا يتطلب أي دفع.',
        registerMode: 'full',
        verifyEnabled: false,
        extraFields: [{ id: 'name-sa', key: 'name', label: 'اسم الطفل', required: true }],
        thirdPartyLogins: [],
        afterRegisterAction: 'lead_sa' as const,
        ctaText: 'ابدأ التقييم المجاني',
        ctaStyle: applyButtonPreset('chunky', true),
        stickyCtaStyle: applyButtonPreset('sunset', false),
        stickyBarCta: 'احصل على حصة مجانية',
        stickyButtonEnabled: true,
        hero: asset('hero-sa', lpAsset('family.png'), 'family.png'),
        registerBefore: [],
        registerAfter: [asset('after-sa', AFTER, 'after-sa.png')],
        effects: [],
        status: 'published',
        revision: 1,
        lastPublishedRevision: 1,
        createdAt: t,
        updatedAt: t,
        updatedBy: 'admin@dinoai.ai',
        history: seedHistory('admin@dinoai.ai', t, '提交发布', '首次发布，生成模板 ID SA_SKIN_A'),
      },
    ].map((skin) => flattenSkinScenes(skin as unknown as LandingSkin)),
  }
}

export function loadLandingSkinStore(): LandingSkinStore {
  try {
    const raw = JSON.parse(
      localStorage.getItem(LANDING_SKIN_STORAGE_KEY)
        ?? localStorage.getItem('dinoai_landing_skins_v16')
        ?? localStorage.getItem('dinoai_landing_skins_v15')
        ?? localStorage.getItem('dinoai_landing_skins_v14')
        ?? localStorage.getItem('dinoai_landing_skins_v13')
        ?? localStorage.getItem('dinoai_landing_skins_v12')
        ?? localStorage.getItem('dinoai_landing_skins_v11')
        ?? localStorage.getItem('dinoai_landing_skins_v10')
        ?? localStorage.getItem('dinoai_landing_skins_v9')
        ?? localStorage.getItem('dinoai_landing_skins_v8')
        ?? localStorage.getItem('dinoai_landing_skins_v7')
        ?? localStorage.getItem('dinoai_landing_skins_v6')
        ?? localStorage.getItem('dinoai_landing_skins_v5')
        ?? localStorage.getItem('dinoai_landing_skins_v4')
        ?? localStorage.getItem('dinoai_landing_skins_v3')
        ?? localStorage.getItem('dinoai_landing_skins_v2')
        ?? localStorage.getItem('dinoai_landing_skins_v1')
        ?? 'null',
    ) as { version?: number; skins?: LandingSkin[] } | null
    if (raw && Array.isArray(raw.skins)) {
      const skins: LandingSkin[] = []
      // 升级时补入日本 / 香港 / 沙特示例皮肤，以及 10.7 登录区示例（韩国两区、泰国仅手机号）。
      if (!localStorage.getItem(LANDING_SKIN_STORAGE_KEY)) {
        const seeds = seedLandingSkins().skins.filter((x) => x.line === '日本' || x.line === '香港' || x.line === '沙特' || x.code === 'KR_SKIN_C' || x.code === 'TH_SKIN_A')
        const seedCodes = new Set(seeds.map((x) => x.code))
        raw.skins = [...seeds, ...raw.skins.filter((x) => !seedCodes.has(x.code) && x.id !== 'SKIN_JP01' && x.code !== 'HK_SKIN_C' && !String(x.id || '').startsWith('SKIN_HK'))]
      }
      for (const stored of raw.skins) {
        const skin = backfillLoginConfig(stored)
        const line = skin.line === '其他' && (skin.language === 'ja' || (skin.code || '').startsWith('JP_'))
          ? '日本'
          : skin.line
        const codeOk = /^[A-Z]{2}_SKIN_[A-Z0-9]+$/.test(skin.code || '')
        skins.push(flattenSkinScenes({
          ...skin,
          line,
          code: codeOk ? skin.code : allocateTemplateCode(line || '', skins, ''),
          pageType: normalizePageType(skin.pageType, (skin as LandingSkin).afterRegisterAction),
          language: line ? defaultLanguageForLine(line) : (skin.language === 'zh' ? 'zh-Hant' : skin.language),
          verifyEnabled: normalizeVerifyEnabled(stored),
          extraFields: Array.isArray(skin.extraFields) ? skin.extraFields.map(normalizeRegisterField) : [],
          ctaStyle: normalizeCtaStyle(skin.ctaStyle),
          stickyCtaStyle: normalizeCtaStyle(skin.stickyCtaStyle ?? skin.ctaStyle),
          ...normalizeStickyFlags(skin),
          registerBgKind: normalizeRegisterBgKind((skin as LandingSkin).registerBgKind),
          registerBgColor: normalizeRegisterBgColor((skin as LandingSkin).registerBgColor),
          status: normalizeSkinStatus(skin.status),
          ...normalizeSkinRevision(skin),
        }))
      }
      const next = { version: 6 as const, skins }
      saveLandingSkinStore(next)
      return next
    }
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
  const aliases: Record<string, string> = {
    '1mw': 'KR_SKIN_A',
    jp01: 'JP_SKIN_A',
    vn01: 'VN_SKIN_A',
    KR_SKIN_B: 'KR_SKIN_B',
    VN_SKIN_B: 'VN_SKIN_A',
    DEFAULT: 'VN_SKIN_A',
  }
  const key = aliases[codeOrId] || codeOrId
  return store.skins.find((s) => s.code === key || s.id === key || s.code === codeOrId || s.id === codeOrId)
}

export function previewPath(code: string, extra: Record<string, string> = {}) {
  const query = new URLSearchParams({ code, preview: '1', ...extra })
  return `#/website/promotion/landingpage?${query.toString()}`
}

export function previewHref(code: string, extra: Record<string, string> = {}) {
  return `${location.origin}${import.meta.env.BASE_URL}${previewPath(code, extra)}`
}

export function writePreviewDraft(skin: LandingSkin) {
  localStorage.setItem(LANDING_SKIN_DRAFT_KEY, JSON.stringify(skin))
}

export function readPreviewDraft(): LandingSkin | null {
  try {
    const raw = JSON.parse(localStorage.getItem(LANDING_SKIN_DRAFT_KEY) ?? sessionStorage.getItem(LANDING_SKIN_DRAFT_KEY) ?? 'null')
    return raw?.id ? flattenSkinScenes(raw as LandingSkin) : null
  } catch {
    return null
  }
}

export function pageTypeLabel(type: LandingPageKind | string, en = false) {
  const hit = PAGE_TYPE_OPTIONS.find((x) => x.value === normalizePageType(type))
  return en ? hit?.en ?? type : hit?.zh ?? type
}

export function loginStateLabel(state: LoginRenderState, en = false) {
  return `${state} ${en ? LOGIN_STATE_INFO[state].en : LOGIN_STATE_INFO[state].zh}`
}

/** 列表「登录区」列：展示态 + 按顺序的方式（两区时副区用括号）。 */
export function registerSummary(skin: LandingSkin, en = false) {
  const state = loginRenderState(skin)
  if (state === 'R0') return loginStateLabel(state, en)
  const secondary = new Set(skin.secondaryLogins || [])
  const methods = (skin.loginOrder || []).map((m) => {
    let label = loginMethodLabel(m, en)
    if (m === 'phone') label += skin.verifyEnabled ? (en ? ' (OTP)' : '（有验证）') : (en ? ' (no OTP)' : '（无验证）')
    return state === 'R4' && secondary.has(m) ? `[${label}]` : label
  })
  return `${loginStateLabel(state, en)} · ${methods.join(' / ')}`
}
