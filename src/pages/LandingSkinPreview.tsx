import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Result } from 'antd'
import { SkinMedia, getSkinFile, useSkinAssetURL } from '../components/SkinAssetField'
import {
  ASSET_BUDGETS,
  BUTTON_PRESET_OPTIONS,
  DEFAULT_SCENE_CTA_RECT,
  DEFAULT_VIDEO_HOLE,
  LINE_PHONE,
  PAGE_WEIGHT_BUDGET_KB,
  SLOW_NETWORK_BYTES_PER_SEC,
  THIRD_PARTY_OPTIONS,
  budgetLevel,
  buttonClassName,
  buttonPaint,
  collectSkinAssets,
  findSkin,
  followUpActionForPageType,
  followUpLabel,
  formatBytes,
  hasStickyBar,
  knownAssetBytes,
  languageLabel,
  defaultLanguageForLine,
  loadLandingSkinStore,
  seoLanguageHint,
  lpAsset,
  normalizeCtaStyle,
  normalizePageType,
  normalizeRegisterAreaBgColor,
  normalizeRegisterAreaBgKind,
  normalizeRegisterBgColor,
  normalizeRegisterBgKind,
  normalizeRegisterMode,
  DEFAULT_STICKY_CTA_RECT,
  normalizeStickyFlags,
  normalizeTitleColor,
  normalizeVideoPlayMode,
  pageTypeLabel,
  readPreviewDraft,
  registerModeLabel,
  stickyButtonLabel,
  stickyShowsButton,
  stickyShowsImage,
  skinTrackButtons,
  type AfterRegisterAction,
  type BudgetLevel,
  type CtaStyle,
  type LandingSkin,
  type SkinAsset,
  type SkinSlot,
  type ThirdPartyLogin,
} from '../landingSkin'
import './LandingSkinPreview.css'
import '../landingButton.css'

const labels: Record<string, { kicker: string; phone: string; otp: string; getCode: string; cta: string; pay: string; terms: string; agree: string }> = {
  ko: { kicker: '우리 아이 첫 AI 영어 파트너, 다이노 AI', phone: '휴대폰 번호', otp: '인증번호', getCode: '인증', cta: '바로 시작하기', pay: '지금 구매', terms: '이용약관', agree: '이용약관 및 개인정보 처리방침에 동의합니다' },
  vi: { kicker: 'Đối tác AI tiếng Anh đầu tiên của bé, Dino AI', phone: 'Số điện thoại', otp: 'Mã xác minh', getCode: 'Gửi mã', cta: 'Bắt đầu ngay', pay: 'Mua ngay', terms: 'Điều khoản', agree: 'Bạn đồng ý với' },
  ar: { kicker: 'شريك طفلك الأول لتعلم الإنجليزية بالذكاء الاصطناعي', phone: 'رقم الجوال', otp: 'رمز التحقق', getCode: 'إرسال', cta: 'ابدأ الآن', pay: 'اشترِ الآن', terms: 'الشروط', agree: 'بالموافقة فإنك تقبل' },
  ms: { kicker: 'Rakan AI bahasa Inggeris pertama anak anda, Dino AI', phone: 'Nombor telefon', otp: 'Kod SMS', getCode: 'Hantar', cta: 'Mula sekarang', pay: 'Beli sekarang', terms: 'Terma', agree: 'Anda bersetuju dengan' },
  ja: { kicker: '子どもの最初のAI英語パートナー、Dino AI', phone: '電話番号', otp: '認証コード', getCode: '送信', cta: '今すぐ始める', pay: '購入する', terms: '利用規約', agree: 'に同意します' },
  'zh-Hant': { kicker: '孩子的第一個 AI 英語夥伴，Dino AI', phone: '手機號碼', otp: '驗證碼', getCode: '取得驗證碼', cta: '立即開始', pay: '立即購買', terms: '使用條款', agree: '即表示你同意' },
  en: { kicker: 'Your child’s first AI English partner, Dino AI', phone: 'Phone number', otp: 'SMS code', getCode: 'Get code', cta: 'Log in', pay: 'Buy now', terms: 'Terms of Use', agree: 'You agree to our' },
}

function copyFor(lang: string) {
  return labels[lang] ?? labels.en
}

function thirdLabel(id: ThirdPartyLogin) {
  return THIRD_PARTY_OPTIONS.find((x) => x.value === id)?.zh ?? id
}

function ctaProps(style?: LandingSkin['ctaStyle'], extra = 'lp-cta') {
  return { className: buttonClassName(style, extra), style: buttonPaint(style) }
}

function focusLead() {
  document.querySelector<HTMLInputElement>('.lp-field input')?.focus()
}

/** A page block that maps to one config item; `label` is the config name shown in annotate mode. */
function Slot({ id, label, className = '', children }: { id: string; label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`lp-slot ${className}`} data-slot={id} data-label={label}>
      {children}
    </div>
  )
}

function SceneBlock({ asset, onCta }: { asset: SkinAsset; onCta: () => void }) {
  const hole = asset.videoRect || DEFAULT_VIDEO_HOLE
  const { src: videoSrc } = useSkinAssetURL(asset.withVideo ? asset.video : undefined)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const ctaMode = asset.ctaMode
  const ctaRect = asset.ctaRect || DEFAULT_SCENE_CTA_RECT
  const playMode = normalizeVideoPlayMode(asset.videoPlayMode)
  const isLightbox = playMode === 'lightbox'
  useEffect(() => {
    const el = videoRef.current
    if (!el || isLightbox) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.play().catch(() => {})
      else el.pause()
    }, { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [videoSrc, isLightbox])
  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen])
  if (!asset.src) return null
  return (
    <div className="lp-scene">
      <SkinMedia asset={asset} />
      {asset.withVideo ? (
        isLightbox ? (
          <button
            type="button"
            className="lp-scene-video is-lightbox-hit"
            style={{ left: `${hole.left}%`, top: `${hole.top}%`, width: `${hole.width}%`, height: `${hole.height}%` }}
            onClick={() => videoSrc && setLightboxOpen(true)}
            aria-label="播放视频"
          >
            {videoSrc ? <video src={videoSrc} muted playsInline preload="metadata" /> : null}
            <span className="lp-scene-play" aria-hidden="true">▶</span>
          </button>
        ) : (
          <div className="lp-scene-video" style={{ left: `${hole.left}%`, top: `${hole.top}%`, width: `${hole.width}%`, height: `${hole.height}%` }}>
            {videoSrc ? <video ref={videoRef} src={videoSrc} autoPlay muted loop playsInline /> : null}
          </div>
        )
      ) : null}
      {ctaMode === 'bottom' || ctaMode === 'custom' ? (
        <button
          type="button"
          {...ctaProps(asset.ctaStyle, `lp-scene-cta ${ctaMode === 'bottom' ? 'is-bottom' : ''}`)}
          style={{
            ...buttonPaint(asset.ctaStyle),
            ...(ctaMode === 'custom'
              ? { left: `${ctaRect.left}%`, top: `${ctaRect.top}%`, width: `${ctaRect.width}%`, height: `${ctaRect.height}%` }
              : {}),
          }}
          onClick={onCta}
        >
          {asset.ctaText || ' '}
        </button>
      ) : null}
      {lightboxOpen && videoSrc ? (
        <div className="lp-video-lightbox" role="dialog" aria-modal="true" aria-label="视频播放">
          <button type="button" className="lp-video-lightbox-backdrop" aria-label="关闭" onClick={() => setLightboxOpen(false)} />
          <div className="lp-video-lightbox-panel">
            <button type="button" className="lp-video-lightbox-close" onClick={() => setLightboxOpen(false)}>关闭</button>
            <video src={videoSrc} controls autoPlay playsInline />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function paintBackground(color: string | undefined, src: string | undefined): CSSProperties {
  if (!src) return color ? { backgroundColor: color } : {}
  return {
    ...(color ? { backgroundColor: color } : {}),
    backgroundImage: `url("${src.replace(/"/g, '')}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
}

function RegisterBlock({ skin, children }: { skin: LandingSkin; children: ReactNode }) {
  const kind = normalizeRegisterBgKind(skin.registerBgKind)
  const { src } = useSkinAssetURL(kind === 'image' ? skin.registerBgImage : undefined)
  const areaKind = normalizeRegisterAreaBgKind(skin.registerAreaBgKind)
  const { src: areaSrc } = useSkinAssetURL(areaKind === 'image' ? skin.registerAreaBgImage : undefined)
  const areaColor = areaKind === 'color' ? normalizeRegisterAreaBgColor(skin.registerAreaBgColor) : undefined
  return (
    <Slot id="slot-register" label="注册区域" className={`lp-register-area ${areaKind === 'none' ? '' : 'has-bg'}`}>
      <div className="lp-register-area-paint" style={paintBackground(areaColor, areaKind === 'image' ? areaSrc : undefined)}>
        <section
          className="lp-register-block"
          data-slot="slot-register-card"
          style={paintBackground(normalizeRegisterBgColor(skin.registerBgColor), kind === 'image' ? src : undefined)}
        >
          {children}
        </section>
      </div>
    </Slot>
  )
}

function LeadForm({ skin, onSubmit }: { skin: LandingSkin; onSubmit: () => void }) {
  const copy = copyFor(skin.language)
  const phone = LINE_PHONE[skin.line || ''] || LINE_PHONE.其他
  const showForm = normalizeRegisterMode(skin.registerMode) !== 'none'
  const titleColor = normalizeTitleColor(skin.registerTitleColor)
  return (
    <form className="lp-lead" onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
      <img className="lp-logo" src={lpAsset('logo.svg')} alt="Dino AI" />
      {skin.registerTitle || skin.registerSubtitle ? (
        <div className="lp-form-title" data-slot="slot-register-title" style={{ color: titleColor }}>
          {skin.registerTitle ? <h2>{skin.registerTitle}</h2> : null}
          {skin.registerSubtitle ? <p>{skin.registerSubtitle}</p> : null}
        </div>
      ) : null}
      {showForm ? (
        <>
          <div data-slot="slot-register-fields">
            {(skin.extraFields ?? []).map((field) => (
              <div className="lp-field" key={field.id}>
                <input
                  placeholder={`${field.required !== false ? '* ' : ''}${field.label}`}
                  aria-label={field.label}
                  required={field.required !== false}
                />
              </div>
            ))}
            <div className="lp-field">
              <span className="lp-flag">{phone.flag}</span>
              <span className="lp-dial">{phone.dial}</span>
              <img className="lp-chevron" src={lpAsset('chevron.svg')} alt="" />
              <input inputMode="tel" placeholder={copy.phone} aria-label={copy.phone} />
            </div>
          </div>
          {skin.verifyEnabled ? (
            <div className="lp-field lp-field-otp" data-slot="slot-register-otp">
              <input placeholder={copy.otp} aria-label={copy.otp} />
              <button type="button" className="lp-get-code">{copy.getCode}</button>
            </div>
          ) : null}
        </>
      ) : null}
      <div data-slot="slot-register-cta">
        <button {...ctaProps(skin.ctaStyle)} type="submit">{skin.ctaText || copy.cta}</button>
      </div>
      <p className="lp-terms">{copy.agree}</p>
      {skin.thirdPartyLogins.length ? (
        <div className="lp-thirds" data-slot="slot-register-thirds">
          {skin.thirdPartyLogins.map((id) => (
            <button type="button" className={id} key={id} aria-label={thirdLabel(id)} />
          ))}
        </div>
      ) : null}
    </form>
  )
}

const SKUS = [
  { id: 'trial', name: '7-day trial', price: '₩29,000', was: '₩59,000' },
  { id: 'term', name: '12-week pack', price: '₩199,000', was: '₩299,000' },
  { id: 'year', name: 'Annual plan', price: '₩399,000', was: '₩599,000' },
]

type FlowStep = 'sku' | 'promo' | 'pay' | 'download' | 'lead_my' | 'lead_vn' | 'lead_done' | null

const CHILD_AGES = ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13+']
const LEARNING_GOALS = [
  { id: 'speak_with_confidence', label: 'Speak English with confidence' },
  { id: 'improve_for_school', label: 'Improve English for school' },
  { id: 'strong_foundation', label: 'Build a strong foundation in English' },
  { id: 'everyday_situations', label: 'Use English in everyday situations' },
  { id: 'consistent_habit', label: 'Build a consistent learning habit' },
]
const CURRENTLY_LEARNING = [
  { id: 'school_only', label: 'School only' },
  { id: 'tuition', label: 'Tuition' },
  { id: 'private_tutor', label: 'Private tutor' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'learning_from_parents', label: 'Learning from parents' },
  { id: 'not_actively_learning', label: 'Not actively learning' },
  { id: 'other_learning_apps', label: 'Other learning apps' },
]

function englishLevelOptions(age: string) {
  const n = age === '13+' ? 13 : Number(age)
  if (!age) return []
  if (n <= 5) {
    return [
      { id: 'new_to_english', label: 'New to English' },
      { id: 'knows_a_little', label: 'Knows a little' },
      { id: 'can_speak_up', label: 'Can speak up' },
      { id: 'not_sure', label: "I'm not sure" },
    ]
  }
  if (n <= 8) {
    return [
      { id: 'just_starting', label: 'Just starting' },
      { id: 'knows_the_basics', label: 'Knows the basics' },
      { id: 'simple_conversations', label: 'Simple conversations' },
      { id: 'not_sure', label: "I'm not sure" },
    ]
  }
  if (n <= 12) {
    return [
      { id: 'basic_level', label: 'Basic level' },
      { id: 'can_read_talk', label: 'Can read & talk' },
      { id: 'can_read_write', label: 'Can read & write' },
      { id: 'not_sure', label: "I'm not sure" },
    ]
  }
  return [
    { id: 'basic_level', label: 'Basic level' },
    { id: 'can_communicate', label: 'Can communicate' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'not_sure', label: "I'm not sure" },
  ]
}

function LeadSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  options: { id: string; label: string }[]
  placeholder: string
  onChange: (next: string) => void
}) {
  return (
    <label className="lp-select-wrap">
      <span>{label}</span>
      <div className="lp-field">
        <select value={value} aria-label={label} onChange={(e) => onChange(e.target.value)}>
          <option value="">{placeholder}</option>
          {options.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </div>
    </label>
  )
}

function MalaysiaLeadExtra({ onContinue }: { onContinue: () => void }) {
  const [age, setAge] = useState('')
  const [level, setLevel] = useState('')
  const [goal, setGoal] = useState('')
  const [learning, setLearning] = useState('')
  const [callPref, setCallPref] = useState('')
  const levels = englishLevelOptions(age)
  return (
    <div className="lp-pay">
      <h2>Thank You!</h2>
      <p className="lp-lead-optional">Tell us about your child (optional)</p>
      <LeadSelect
        label="Your child’s age"
        value={age}
        placeholder="Select age"
        options={CHILD_AGES.map((id) => ({ id, label: id }))}
        onChange={(next) => {
          setAge(next)
          setLevel('')
        }}
      />
      {age ? <LeadSelect label="English level" value={level} placeholder="Select level" options={levels} onChange={setLevel} /> : null}
      <LeadSelect label="Learning goals" value={goal} placeholder="Select a goal" options={LEARNING_GOALS} onChange={setGoal} />
      <LeadSelect label="How is your child learning now?" value={learning} placeholder="Select one" options={CURRENTLY_LEARNING} onChange={setLearning} />
      <p className="lp-lead-optional">Choose a time for us to call (optional)</p>
      <LeadSelect
        label="Would you like our education consultant to call you at a specific time?"
        value={callPref}
        placeholder="No preference"
        options={[
          { id: 'yes', label: 'Yes, select a time' },
          { id: 'no', label: 'No preference' },
        ]}
        onChange={setCallPref}
      />
      <button type="button" {...ctaProps(undefined, 'lp-cta')} onClick={onContinue}>Continue</button>
    </div>
  )
}

function VietnamLeadExtra({ onContinue }: { onContinue: () => void }) {
  const [age, setAge] = useState('')
  const [goal, setGoal] = useState('')
  const [callPref, setCallPref] = useState('')
  return (
    <div className="lp-pay">
      <h2>Cảm ơn bạn!</h2>
      <p className="lp-lead-optional">Cho chúng tôi biết thêm về con bạn (không bắt buộc)</p>
      <LeadSelect label="Bé hiện bao nhiêu tuổi?" value={age} placeholder="Chọn tuổi" options={CHILD_AGES.map((id) => ({ id, label: id }))} onChange={setAge} />
      <LeadSelect label="Ba/Mẹ mong muốn bé cải thiện điều gì nhất?" value={goal} placeholder="Chọn mục tiêu" options={LEARNING_GOALS} onChange={setGoal} />
      <p className="lp-lead-optional">Chọn thời gian để chúng tôi gọi (không bắt buộc)</p>
      <LeadSelect
        label="Bạn có muốn cố vấn giáo dục gọi vào khung giờ cụ thể không?"
        value={callPref}
        placeholder="Không cần"
        options={[
          { id: 'yes', label: 'Có, chọn giờ' },
          { id: 'no', label: 'Không cần' },
        ]}
        onChange={setCallPref}
      />
      <button type="button" {...ctaProps(undefined, 'lp-cta')} onClick={onContinue}>Tiếp tục</button>
    </div>
  )
}

const STEP_NOTE: Record<Exclude<FlowStep, null>, string> = {
  sku: '后续交互 1 / 4 · SKU 列表',
  promo: '后续交互 2 / 4 · 输入 promo code',
  pay: '后续交互 3 / 4 · 支付',
  download: '后续交互 · 下载 App 弹窗',
  lead_my: '后续交互 Page 2 · 马来补充资料（四项选填 + 预约）',
  lead_vn: '后续交互 Page 2 · 越南补充资料（两项选填 + 预约）',
  lead_done: '后续交互 Page 3 · 完成 → 下一步出下载 App',
}

function AfterRegisterLayer({ step, onStep, onClose, annotate }: { step: FlowStep; onStep: (next: FlowStep) => void; onClose: () => void; annotate: boolean }) {
  if (!step) return null
  return (
    <div className="lp-overlay" role="dialog" aria-modal="true">
      <div className="lp-overlay-card">
        {annotate ? <div className="lp-overlay-note">{STEP_NOTE[step]}</div> : null}
        <button type="button" className="lp-overlay-close" onClick={onClose} aria-label="Close">×</button>
        {step === 'sku' ? (
          <div className="lp-pay">
            <h2>选择课程套餐</h2>
            {SKUS.map((sku) => (
              <button type="button" className="lp-sku" key={sku.id} onClick={() => onStep('promo')}>
                <span>
                  <b>{sku.name}</b>
                  <span className="lp-was">{sku.was}</span>
                </span>
                <strong>{sku.price}</strong>
              </button>
            ))}
          </div>
        ) : null}
        {step === 'promo' ? (
          <div className="lp-pay">
            <h2>输入 Promo</h2>
            <div className="lp-field">
              <input placeholder="Promo code" aria-label="Promo code" />
            </div>
            <button type="button" {...ctaProps(undefined, 'lp-cta')} onClick={() => onStep('pay')}>下一步 · 支付</button>
          </div>
        ) : null}
        {step === 'pay' ? (
          <div className="lp-pay">
            <h2>确认支付</h2>
            <p className="lp-overlay-copy">原型演示：支付成功后弹出下载 App。</p>
            <button type="button" {...ctaProps(undefined, 'lp-cta')} onClick={() => onStep('download')}>完成支付</button>
          </div>
        ) : null}
        {step === 'download' ? (
          <div className="lp-pay">
            <h2>下载 Dino AI App</h2>
            <p className="lp-overlay-copy">注册完成，打开 App 继续学习。</p>
            <div className="lp-download-fake">APP</div>
            <button type="button" {...ctaProps(undefined, 'lp-cta')} onClick={onClose}>前往 App Store / Google Play</button>
          </div>
        ) : null}
        {step === 'lead_my' ? <MalaysiaLeadExtra onContinue={() => onStep('lead_done')} /> : null}
        {step === 'lead_vn' ? <VietnamLeadExtra onContinue={() => onStep('lead_done')} /> : null}
        {step === 'lead_done' ? (
          <div className="lp-pay">
            <h2>All done!</h2>
            <p className="lp-overlay-copy">资料已保存，顾问会尽快联系。下一步出下载 App 弹窗。</p>
            <button type="button" {...ctaProps(undefined, 'lp-cta')} onClick={() => onStep('download')}>Download the App now</button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function startStep(action: AfterRegisterAction): FlowStep {
  if (action === 'download_app') return 'download'
  if (action === 'lead_my') return 'lead_my'
  if (action === 'lead_vn') return 'lead_vn'
  return 'sku'
}

/** Sizes we already know, plus HEAD / IndexedDB lookups for pasted URLs and older uploads. */
function useAssetWeights(slots: SkinSlot[]) {
  const [found, setFound] = useState<Record<string, number | null>>({})
  const key = slots.map((s) => s.asset.src).join('|')
  useEffect(() => {
    let alive = true
    for (const slot of slots) {
      const src = slot.asset.src
      if (knownAssetBytes(slot.asset) != null || src in found) continue
      const lookup = src.startsWith('asset:')
        ? getSkinFile(src.slice(6)).then((blob) => blob?.size ?? null)
        : fetch(src, { method: 'HEAD' }).then((r) => {
            const n = Number(r.headers.get('content-length'))
            return r.ok && n > 0 ? n : null
          })
      lookup
        .catch(() => null)
        .then((bytes) => {
          if (alive) setFound((prev) => ({ ...prev, [src]: bytes }))
        })
    }
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return (slot: SkinSlot) => knownAssetBytes(slot.asset) ?? found[slot.asset.src] ?? undefined
}

const LEVEL_TEXT: Record<BudgetLevel, string> = { ok: '合适', warn: '偏大', danger: '过大', unknown: '未知' }

function WeightTag({ bytes, level }: { bytes?: number; level: BudgetLevel }) {
  return <span className={`lpw-weight is-${level}`}>{bytes == null ? '大小未知' : `${formatBytes(bytes)} · ${LEVEL_TEXT[level]}`}</span>
}

function styleSummary(style?: CtaStyle) {
  const s = normalizeCtaStyle(style)
  const name = BUTTON_PRESET_OPTIONS.find((x) => x.value === s.preset)?.zh ?? s.preset
  return (
    <span className="lpw-style">
      <i style={{ background: `linear-gradient(180deg, ${s.from}, ${s.to})` }} />
      {name}
      {s.breathe ? ' · 呼吸' : ''}
    </span>
  )
}

function ColorDot({ color }: { color: string }) {
  return <i className="lpw-dot" style={{ background: color }} />
}

type RowProps = { label: string; slot?: string; children: ReactNode; onFocus: (slot?: string, scroll?: boolean) => void; muted?: boolean }

function Row({ label, slot, children, onFocus, muted }: RowProps) {
  return (
    <div
      className={`lpw-row ${slot ? 'is-linked' : ''} ${muted ? 'is-muted' : ''}`}
      onMouseEnter={() => onFocus(slot)}
      onMouseLeave={() => onFocus(undefined)}
      onClick={() => slot && onFocus(slot, true)}
    >
      <span className="lpw-key">{label}</span>
      <span className="lpw-val">{children}</span>
    </div>
  )
}

function sceneTags(item: SkinAsset) {
  const tags: string[] = []
  if (item.withVideo) {
    const mode = normalizeVideoPlayMode(item.videoPlayMode)
    tags.push(item.video?.src
      ? (mode === 'lightbox' ? '视频窗口·点击大屏' : '视频窗口·静音循环')
      : '视频窗口（缺视频）')
  }
  if (item.ctaMode === 'bottom') tags.push('按钮贴底')
  if (item.ctaMode === 'custom') tags.push('按钮自定义位置')
  return tags
}

function ConfigPanel({
  skin,
  onFocus,
  onDemoFlow,
}: {
  skin: LandingSkin
  onFocus: (slot?: string, scroll?: boolean) => void
  onDemoFlow: () => void
}) {
  const pageType = normalizePageType(skin.pageType, skin.afterRegisterAction)
  const action = followUpActionForPageType(pageType, skin.afterRegisterAction, skin.line)
  const mode = normalizeRegisterMode(skin.registerMode)
  const areaKind = normalizeRegisterAreaBgKind(skin.registerAreaBgKind)
  const formKind = normalizeRegisterBgKind(skin.registerBgKind)
  const slots = useMemo(() => collectSkinAssets(skin), [skin])
  const weightOf = useAssetWeights(slots)
  const weighed = slots.map((slot) => {
    const bytes = weightOf(slot)
    return { slot, bytes, level: budgetLevel(bytes, slot.budget) }
  })
  const weightFor = (asset?: SkinAsset) => weighed.find((w) => w.slot.asset === asset)
  const total = weighed.reduce((sum, w) => sum + (w.bytes ?? 0), 0)
  const unknown = weighed.filter((w) => w.bytes == null).length
  const firstScreen = weighed.filter((w) => w.slot.id === 'slot-before-0').reduce((sum, w) => sum + (w.bytes ?? 0), 0)
  const heavy = weighed.filter((w) => w.level === 'warn' || w.level === 'danger')
  const describable = slots.filter((s) => s.describable)
  const missingAlt = describable.filter((s) => !s.asset.alt?.trim())
  const seconds = (bytes: number) => Math.max(0.1, bytes / SLOW_NETWORK_BYTES_PER_SEC).toFixed(1)
  const totalLevel: BudgetLevel = total > PAGE_WEIGHT_BUDGET_KB * 1024 * 1.5 ? 'danger' : total > PAGE_WEIGHT_BUDGET_KB * 1024 ? 'warn' : 'ok'
  const sceneRows = (items: SkinAsset[], group: 'before' | 'after', name: string) =>
    items.map((item, i) => {
      if (!item.src) return null
      const w = weightFor(item)
      const tags = sceneTags(item)
      return (
        <Row key={item.id} label={`${name} ${i + 1}`} slot={`slot-${group}-${i}`} onFocus={onFocus}>
          {tags.length ? tags.join(' · ') : '纯图'}
          {w ? <WeightTag bytes={w.bytes} level={w.level} /> : null}
        </Row>
      )
    })

  return (
    <aside className="lpw-panel">
      <div className="lpw-panel-tip">与配置页同顺序。悬停一行，页面上对应区域高亮；点击滚动过去。</div>

      <section className="lpw-card">
        <h3>基本配置</h3>
        <Row label="业务线" onFocus={onFocus}>{skin.line || '—'}</Row>
        <Row label="落地页皮肤名称" onFocus={onFocus}>{skin.name || '—'}</Row>
        <Row label="模板 ID" onFocus={onFocus}><code>{skin.code || '提交后生成'}</code></Row>
        <Row label="落地页类型" onFocus={onFocus}>{pageTypeLabel(pageType)}</Row>
        <Row label="后续交互页面" onFocus={onFocus}>
          {followUpLabel(action)}
          {mode !== 'none' ? <button type="button" className="lpw-link" onClick={onDemoFlow}>演示</button> : <em className="lpw-note">无注册，不进入后续交互</em>}
        </Row>
      </section>

      <section className="lpw-card">
        <h3>注册配置</h3>
        <Row label="注册类型" slot="slot-register-fields" onFocus={onFocus}>{registerModeLabel(mode)}</Row>
        <Row label="注册表单标题" slot={skin.registerTitle || skin.registerSubtitle ? 'slot-register-title' : undefined} onFocus={onFocus} muted={!skin.registerTitle && !skin.registerSubtitle}>
          {skin.registerTitle || skin.registerSubtitle ? (
            <>
              <ColorDot color={normalizeTitleColor(skin.registerTitleColor)} />
              {[skin.registerTitle, skin.registerSubtitle].filter(Boolean).join(' / ')}
            </>
          ) : '未配置，不展示'}
        </Row>
        {mode !== 'none' ? (
          <>
            <Row label="是否验证" slot={skin.verifyEnabled ? 'slot-register-otp' : 'slot-register-fields'} onFocus={onFocus}>{skin.verifyEnabled ? '有验证' : '无验证'}</Row>
            <Row label="其他字段" slot="slot-register-fields" onFocus={onFocus} muted={!skin.extraFields.length}>
              {skin.extraFields.length
                ? `${skin.extraFields.map((f) => `${f.label || '未命名'}（${f.required ? '必选' : '非必选'}）`).join('、')} · 仅本次留资`
                : '无，仅手机号'}
            </Row>
          </>
        ) : null}
        <Row label="三方登录" slot={skin.thirdPartyLogins.length ? 'slot-register-thirds' : undefined} onFocus={onFocus} muted={!skin.thirdPartyLogins.length}>
          {skin.thirdPartyLogins.length ? skin.thirdPartyLogins.map(thirdLabel).join('、') : '未勾选'}
        </Row>
        <Row label="注册按钮文案" slot="slot-register-cta" onFocus={onFocus}>{skin.ctaText || `${copyFor(skin.language).cta}（未填，用业务线默认）`}</Row>
        <Row label="注册按钮样式" slot="slot-register-cta" onFocus={onFocus}>{styleSummary(skin.ctaStyle)}</Row>
        <Row label="注册区域背景" slot="slot-register" onFocus={onFocus} muted={areaKind === 'none'}>
          {areaKind === 'none' ? '无' : null}
          {areaKind === 'color' ? <><ColorDot color={normalizeRegisterAreaBgColor(skin.registerAreaBgColor)} />{normalizeRegisterAreaBgColor(skin.registerAreaBgColor)}</> : null}
          {areaKind === 'image' ? <>背景图{weightFor(skin.registerAreaBgImage) ? <WeightTag {...weightFor(skin.registerAreaBgImage)!} /> : ' · 未上传'}</> : null}
        </Row>
        <Row label="注册表单背景" slot="slot-register-card" onFocus={onFocus}>
          {formKind === 'color' ? <><ColorDot color={normalizeRegisterBgColor(skin.registerBgColor)} />{normalizeRegisterBgColor(skin.registerBgColor)}</> : null}
          {formKind === 'image' ? <>背景图{weightFor(skin.registerBgImage) ? <WeightTag {...weightFor(skin.registerBgImage)!} /> : ' · 未上传'}</> : null}
        </Row>
      </section>

      <section className="lpw-card">
        <h3>注册模块前置图</h3>
        {sceneRows(skin.registerBefore, 'before', '前置配图')}
        {!skin.registerBefore.some((x) => x.src) ? <Row label="前置配图" onFocus={onFocus} muted>无（前置 / 后置有一类即可）</Row> : null}
      </section>

      <section className="lpw-card">
        <h3>注册模块后置图</h3>
        {sceneRows(skin.registerAfter, 'after', '后置配图')}
        {!skin.registerAfter.some((x) => x.src) ? <Row label="后置配图" onFocus={onFocus} muted>无（前置 / 后置有一类即可）</Row> : null}
      </section>

      <section className="lpw-card">
        <h3>吸底栏</h3>
        <p className="lpw-note" style={{ margin: '0 0 8px' }}>吸底图与吸底按钮可单独或同时开启；都关则不展示。</p>
        <Row label="吸底图" slot={stickyShowsImage(skin) ? 'slot-sticky' : undefined} onFocus={onFocus} muted={!stickyShowsImage(skin)}>
          {stickyShowsImage(skin)
            ? (weightFor(skin.stickyBar) ? <WeightTag {...weightFor(skin.stickyBar)!} /> : '已开启 · 已上传')
            : (skin.stickyImageEnabled ? '已开启 · 未上传' : '未开启')}
        </Row>
        <Row label="吸底按钮" slot={stickyShowsButton(skin) ? 'slot-sticky' : undefined} onFocus={onFocus} muted={!stickyShowsButton(skin)}>
          {stickyShowsButton(skin)
            ? (skin.stickyBarCta?.trim()
              ? skin.stickyBarCta
              : `${skin.ctaText || copyFor(skin.language).cta}（沿用注册按钮）`)
            : '未开启'}
        </Row>
        {stickyShowsButton(skin) ? (
          <Row label="吸底按钮样式" slot="slot-sticky" onFocus={onFocus}>{styleSummary(skin.stickyCtaStyle)}</Row>
        ) : null}
        {stickyShowsImage(skin) && stickyShowsButton(skin) ? (
          <Row label="按钮位置" slot="slot-sticky" onFocus={onFocus}>
            {(() => {
              const rect = skin.stickyCtaRect || DEFAULT_STICKY_CTA_RECT
              return `左 ${rect.left}% · 上 ${rect.top}% · 宽 ${rect.width}% · 高 ${rect.height}%`
            })()}
          </Row>
        ) : null}
      </section>

      <section className="lpw-card">
        <h3>页面 SEO</h3>
        <p className="lpw-note" style={{ margin: '0 0 8px' }}>{seoLanguageHint(skin.line)}</p>
        <div className="lpw-serp">
          <span className="lpw-serp-url">dinoai.com › promotion › {skin.code || 'draft'}</span>
          <span className="lpw-serp-title">{skin.seoTitle || skin.name || '未填写 SEO 主标题'}</span>
          <span className={`lpw-serp-desc ${skin.seoDescription ? '' : 'is-empty'}`}>{skin.seoDescription || '未填写 SEO 副标题，搜索结果标题下会缺这一段说明。'}</span>
        </div>
        <Row label="推荐语言" onFocus={onFocus}>{languageLabel(defaultLanguageForLine(skin.line))}</Row>
        <Row label="SEO 主标题" onFocus={onFocus} muted={!skin.seoTitle}>{skin.seoTitle ? `${skin.seoTitle.length} / 60 字` : '未填（提交前必填）'}</Row>
        <Row label="SEO 副标题" onFocus={onFocus} muted={!skin.seoDescription}>{skin.seoDescription ? `${skin.seoDescription.length} / 160 字` : '未填（提交前必填）'}</Row>
      </section>

      <section className="lpw-card is-ref">
        <h3>埋点 · 参考</h3>
        <p className="lpw-note" style={{ margin: '0 0 8px' }}>仅供对照，只列登录页上的按钮。后续页面的按钮不在这里。按钮 ID 自动分配。其他字段的填写值只进落地页单独的表，不进埋点。</p>
        {skinTrackButtons(skin).map((row) => (
          <Row key={row.key} label={row.zh} onFocus={onFocus}><code>{row.eventId}</code></Row>
        ))}
        {!skinTrackButtons(skin).length ? <Row label="按钮" onFocus={onFocus} muted>当前没有会上报的按钮</Row> : null}
        {skin.registerMode === 'full' ? (
          <>
            <Row label="注册成功" onFocus={onFocus}>signup_result</Row>
            <Row label="登录成功" onFocus={onFocus}>login_success</Row>
          </>
        ) : null}
      </section>

      <section className="lpw-card">
        <h3>图片描述（alt）</h3>
        <p className="lpw-note" style={{ margin: '0 0 8px' }}>推荐语言：{languageLabel(defaultLanguageForLine(skin.line))}。{seoLanguageHint(skin.line)}</p>
        <Row label="填写进度" onFocus={onFocus}>
          <span className={`lpw-weight is-${missingAlt.length ? 'danger' : 'ok'}`}>已填 {describable.length - missingAlt.length} / {describable.length}（有图必填）</span>
        </Row>
        {missingAlt.length ? missingAlt.map((s) => (
          <Row key={`${s.id}-alt`} label="缺 alt" slot={s.id} onFocus={onFocus} muted>{s.zh}</Row>
        )) : (
          <div className="lpw-ok">前置 / 后置配图、吸底图的 alt 都已填写。</div>
        )}
      </section>

      <section className="lpw-card">
        <h3>资源体检</h3>
        <div className="lpw-meter">
          <div className="lpw-meter-head">
            <b>整页 {formatBytes(total)}</b>
            <span>建议 ≤ {formatBytes(PAGE_WEIGHT_BUDGET_KB * 1024)}</span>
          </div>
          <div className="lpw-meter-bar"><i className={`is-${totalLevel}`} style={{ width: `${Math.min(100, (total / (PAGE_WEIGHT_BUDGET_KB * 1024)) * 100)}%` }} /></div>
          <p>
            东南亚弱网（约 1.5 Mbps）下：首屏约 <b>{seconds(firstScreen)} 秒</b>，整页约 <b>{seconds(total)} 秒</b>。
            {unknown ? ` 另有 ${unknown} 个外链素材读不到大小，没算进去。` : ''}
          </p>
        </div>
        {heavy.length ? (
          heavy.map((w) => (
            <Row key={`${w.slot.id}-${w.slot.budget}`} label={w.slot.zh} slot={w.slot.id} onFocus={onFocus}>
              <WeightTag bytes={w.bytes} level={w.level} />
              <em className="lpw-note">{ASSET_BUDGETS[w.slot.budget].zh}</em>
            </Row>
          ))
        ) : (
          <div className="lpw-ok">所有已知大小的素材都在推荐范围内。</div>
        )}
      </section>
    </aside>
  )
}

export default function LandingSkinPreview() {
  const [params] = useSearchParams()
  const code = params.get('code') || ''
  const isPreview = params.get('preview') === '1'
  const store = useMemo(() => loadLandingSkinStore(), [])
  const skin = useMemo(() => {
    const raw = code === 'draft'
      ? readPreviewDraft()
      : (findSkin(code, store) || (!code ? store.skins[0] : undefined))
    return raw ? { ...raw, ...normalizeStickyFlags(raw) } : undefined
  }, [code, store])
  const [flow, setFlow] = useState<FlowStep>(null)
  const [active, setActive] = useState<string>()
  const deviceRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!skin) return
    document.title = skin.seoTitle || skin.name || 'Dino AI'
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = skin.seoDescription || ''
  }, [skin])

  useEffect(() => {
    setFlow(null)
  }, [skin?.id])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    stage.querySelectorAll('.is-focused').forEach((el) => el.classList.remove('is-focused'))
    if (active) stage.querySelectorAll(`[data-slot="${active}"]`).forEach((el) => el.classList.add('is-focused'))
  }, [active])

  if (!skin) {
    return (
      <div className="lp-skin">
        <Result status="404" title="Skin not found" subTitle={`code=${code || '—'}`} extra={<Button href="#/marketing-center-v5/skins">返回皮肤管理</Button>} />
      </div>
    )
  }

  const copy = copyFor(skin.language)
  const pageType = normalizePageType(skin.pageType, skin.afterRegisterAction)
  const action = followUpActionForPageType(pageType, skin.afterRegisterAction, skin.line)
  const openAfterRegister = () => {
    if (normalizeRegisterMode(skin.registerMode) === 'none') {
      focusLead()
      return
    }
    setFlow(startStep(action))
  }
  const focusSlot = (slot?: string, scroll = false) => {
    setActive(slot)
    if (scroll && slot) {
      const root = deviceRef.current || stageRef.current
      root?.querySelector(`[data-slot="${slot}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
  const showStickyImage = stickyShowsImage(skin)
  const showStickyButton = stickyShowsButton(skin)
  const showSticky = hasStickyBar(skin)
  const stickyCtaRect = skin.stickyCtaRect || DEFAULT_STICKY_CTA_RECT

  const page = (
    <div ref={deviceRef} className={`lp-device ${showSticky ? 'has-sticky' : ''} ${showStickyImage ? 'has-sticky-art' : ''}`}>
      <div ref={stageRef} className="lp-stage">
        {skin.registerBefore.map((asset, i) => (asset.src ? (
          <Slot key={asset.id} id={`slot-before-${i}`} label={`前置配图 ${i + 1}`}>
            <SceneBlock asset={asset} onCta={focusLead} />
          </Slot>
        ) : null))}
        <RegisterBlock skin={skin}>
          <LeadForm skin={skin} onSubmit={openAfterRegister} />
        </RegisterBlock>
        {skin.registerAfter.map((asset, i) => (asset.src ? (
          <Slot key={asset.id} id={`slot-after-${i}`} label={`后置配图 ${i + 1}`}>
            <SceneBlock asset={asset} onCta={focusLead} />
          </Slot>
        ) : null))}
      </div>
      {showSticky ? (
        <div className={`lp-sticky lp-slot ${showStickyImage ? 'has-art' : ''}`} data-slot="slot-sticky" data-label="吸底栏">
          {showStickyImage ? (
            <button type="button" className="lp-sticky-hit" onClick={focusLead}>
              <SkinMedia asset={skin.stickyBar} alt={skin.stickyBar!.alt || stickyButtonLabel(skin, copy.cta)} />
            </button>
          ) : null}
          {showStickyButton ? (
            <button
              type="button"
              {...ctaProps(
                skin.stickyCtaStyle,
                `lp-sticky-btn ${showStickyImage ? 'is-custom' : 'is-bar'}`,
              )}
              style={{
                ...buttonPaint(skin.stickyCtaStyle),
                ...(showStickyImage
                  ? {
                      left: `${stickyCtaRect.left}%`,
                      top: `${stickyCtaRect.top}%`,
                      width: `${stickyCtaRect.width}%`,
                      height: `${stickyCtaRect.height}%`,
                    }
                  : {}),
              }}
              onClick={focusLead}
            >
              {stickyButtonLabel(skin, copy.cta)}
            </button>
          ) : null}
        </div>
      ) : null}
      <AfterRegisterLayer step={flow} onStep={setFlow} onClose={() => setFlow(null)} annotate={false} />
    </div>
  )

  // Production / online: no preview chrome (URL must not carry preview=1).
  if (!isPreview) {
    return (
      <div className={`lp-skin lang-${skin.language}`} dir={skin.language === 'ar' ? 'rtl' : 'ltr'}>
        {page}
      </div>
    )
  }

  // Preview from CRM: same H5 as online, plus an obvious PREVIEW ribbon (driven by ?preview=1).
  return (
    <div className={`lp-skin is-preview-h5 lang-${skin.language}`} dir={skin.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="lp-preview-ribbon" role="status">
        <div className="lp-preview-ribbon-main">
          <strong>PREVIEW</strong>
          <span>预览环境 · 非线上正式页</span>
          <code>{skin.code || 'draft'}</code>
          <span className="lp-preview-ribbon-name">{skin.name || '未命名皮肤'}</span>
          {code === 'draft' || skin.status === 'draft' ? <em>草稿</em> : null}
        </div>
        <a className="lp-preview-ribbon-back" href="#/marketing-center-v5/skins">返回配置后台</a>
      </div>
      <div className="lp-preview-h5">{page}</div>
    </div>
  )
}
