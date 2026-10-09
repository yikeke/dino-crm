import { useEffect, useRef, useState } from 'react'
import { Button, Input, InputNumber, Radio, Switch, Tag, Tooltip, Typography, Upload } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { AssetBudgetKey, CtaStyle, SceneCtaMode, SkinAsset, VideoHole, VideoPlayMode } from '../landingSkin'
import {
  ASSET_BUDGETS,
  DEFAULT_SCENE_CTA_RECT,
  DEFAULT_VIDEO_HOLE,
  LANDING_SKIN_ASSET_DB,
  DEFAULT_CTA_STYLE,
  budgetLevel,
  buttonClassName,
  buttonPaint,
  defaultLanguageForLine,
  formatBytes,
  imageAltPlaceholder,
  knownAssetBytes,
  languageLabel,
  normalizeCtaStyle,
  normalizeVideoPlayMode,
  seoLanguageHint,
} from '../landingSkin'
import ButtonStyleField from './ButtonStyleField'
import '../landingButton.css'

const { Text } = Typography

function assetDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(LANDING_SKIN_ASSET_DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore('files')
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

export async function putSkinFile(id: string, file: File) {
  const db = await assetDB()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite')
      tx.objectStore('files').put(file, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function getSkinFile(id: string): Promise<Blob | undefined> {
  const db = await assetDB()
  try {
    return await new Promise((resolve, reject) => {
      const r = db.transaction('files').objectStore('files').get(id)
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
  } finally {
    db.close()
  }
}

export function useSkinAssetURL(asset?: SkinAsset) {
  const [state, setState] = useState<{ src?: string; error?: string }>({})
  useEffect(() => {
    let alive = true
    let url: string | undefined
    setState({})
    if (!asset?.src) return
    if (!asset.src.startsWith('asset:')) {
      setState({ src: asset.src })
      return
    }
    getSkinFile(asset.src.slice(6))
      .then((blob) => {
        if (!blob) throw Error('本地素材不存在，请重新上传')
        url = URL.createObjectURL(blob)
        if (alive) setState({ src: url })
        else URL.revokeObjectURL(url)
      })
      .catch((e) => {
        if (alive) setState({ error: (e as Error).message })
      })
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [asset?.src])
  return state
}

export function SkinMedia({ asset, className = '', alt }: { asset?: SkinAsset; className?: string; alt?: string }) {
  const { src, error } = useSkinAssetURL(asset)
  if (!asset?.src) return null
  if (error) return <div className={`skin-media-fallback ${className}`}>{error}</div>
  if (!src) return <div className={`skin-media-fallback ${className}`}>加载中…</div>
  if (asset.kind === 'video') return <video className={className} src={src} autoPlay muted loop playsInline />
  return <img className={className} src={src} alt={alt ?? asset.alt ?? ''} />
}

async function imageSize(blob: Blob): Promise<{ width?: number; height?: number }> {
  try {
    const bmp = await createImageBitmap(blob)
    const size = { width: bmp.width, height: bmp.height }
    bmp.close()
    return size
  } catch {
    return {}
  }
}

const LEVEL_TAG = {
  ok: { color: 'green', text: '符合规格' },
  warn: { color: 'orange', text: '接近上限' },
  danger: { color: 'red', text: '超过规格' },
  unknown: { color: 'default', text: '未知大小' },
} as const

/** Known size, else IndexedDB blob size or a HEAD request; null when the host hides it (e.g. CORS). */
export function useAssetBytes(asset?: SkinAsset) {
  const known = knownAssetBytes(asset)
  const [found, setFound] = useState<{ src?: string; bytes?: number | null }>({})
  const src = asset?.src
  useEffect(() => {
    if (!src || known != null) return
    let alive = true
    const lookup = src.startsWith('asset:')
      ? getSkinFile(src.slice(6)).then((blob) => blob?.size ?? null)
      : fetch(src, { method: 'HEAD' }).then((r) => {
          const n = Number(r.headers.get('content-length'))
          return r.ok && n > 0 ? n : null
        })
    lookup.catch(() => null).then((bytes) => {
      if (alive) setFound({ src, bytes })
    })
    return () => {
      alive = false
    }
  }, [src, known])
  return known ?? (found.src === src ? found.bytes ?? undefined : undefined)
}

function AssetWeight({ value, budget }: { value: SkinAsset; budget: AssetBudgetKey }) {
  const bytes = useAssetBytes(value)
  const level = budgetLevel(bytes, budget)
  const rule = ASSET_BUDGETS[budget]
  return (
    <div className="skin-asset-weight">
      <Tag color={LEVEL_TAG[level].color}>{LEVEL_TAG[level].text}</Tag>
      <span>
        {formatBytes(bytes)}
        {value.width && value.height ? ` · ${value.width} × ${value.height}px` : ''}
        {rule.maxKB ? ` · 上限 ${formatBytes(rule.maxKB * 1024)}` : ''}
      </span>
    </div>
  )
}

export default function SkinAssetField({
  label,
  hint,
  value,
  onChange,
  acceptVideo = false,
  videoOnly = false,
  required = false,
  budget,
  describe = false,
  hideLabel = false,
  line,
}: {
  label: string
  hint?: string
  value?: SkinAsset
  onChange: (next?: SkinAsset) => void
  acceptVideo?: boolean
  videoOnly?: boolean
  required?: boolean
  budget?: AssetBudgetKey
  /** Show the image-description (alt) input used for SEO. */
  describe?: boolean
  /** Parent renders the section title. */
  hideLabel?: boolean
  /** Business line — drives the recommended alt language. */
  line?: string
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const latest = useRef({ onChange, value })
  latest.current = { onChange, value }
  const accept = videoOnly
    ? 'video/mp4,video/webm'
    : acceptVideo
      ? 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm'
      : 'image/png,image/jpeg,image/webp,image/gif'

  const upload = async (file: File) => {
    setError('')
    setBusy(true)
    try {
      const video = file.type.startsWith('video/') || /\.(mp4|webm)$/i.test(file.name)
      if (videoOnly && !video) throw Error('请选择 MP4 / WebM 视频')
      if (video && !acceptVideo && !videoOnly) throw Error('该位置仅支持图片')
      if (!video) {
        const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
        const sig = String.fromCharCode(...head)
        const png = head[0] === 137 && sig.slice(1, 4) === 'PNG'
        const jpg = head[0] === 255 && head[1] === 216
        const gif = sig.startsWith('GIF87a') || sig.startsWith('GIF89a')
        const webp = sig.startsWith('RIFF') && sig.slice(8, 12) === 'WEBP'
        if (!(png || jpg || gif || webp)) throw Error('请上传 JPEG / PNG / WebP 图片')
      }
      const ruleKey: AssetBudgetKey = budget || (video ? 'video' : 'scene')
      const maxBytes = ASSET_BUDGETS[ruleKey].maxKB * 1024
      if (file.size > maxBytes) {
        throw Error(video
          ? `视频不能超过 ${formatBytes(maxBytes)}，请缩短时长或降低码率后再上传`
          : `图片不能超过 ${formatBytes(maxBytes)}，请换一张符合规格的图片`)
      }
      const id = crypto.randomUUID()
      await putSkinFile(id, file)
      const size = video ? { width: undefined, height: undefined } : await imageSize(file)
      const prev = latest.current.value
      latest.current.onChange({
        ...prev,
        id: prev?.id || id,
        kind: video ? 'video' : 'image',
        src: `asset:${id}`,
        name: file.name,
        mime: file.type,
        bytes: file.size,
        width: size.width,
        height: size.height,
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
    return false
  }

  return (
    <div className="skin-asset-field">
      {hideLabel ? null : (
        <div className="skin-field-label">
          {required ? <em>*</em> : null}
          {label}
        </div>
      )}
      <div className="skin-upload-box">
        {value?.src ? (
          <div className="skin-upload-preview">
            <SkinMedia asset={value} />
            <div className="skin-upload-actions">
              <Upload accept={accept} showUploadList={false} disabled={busy} beforeUpload={upload}>
                <Button size="small">替换</Button>
              </Upload>
              <Button size="small" icon={<DeleteOutlined />} onClick={() => onChange(undefined)}>
                清除
              </Button>
            </div>
          </div>
        ) : (
          <Upload accept={accept} showUploadList={false} disabled={busy} beforeUpload={upload}>
            <button type="button" className="skin-upload-plus" disabled={busy}>
              <PlusOutlined />
              <span>点击上传</span>
            </button>
          </Upload>
        )}
      </div>
      {hint ? <Text type="secondary" className="skin-asset-hint">{hint}</Text> : null}
      {budget ? <Text type="secondary" className="skin-asset-hint">{ASSET_BUDGETS[budget].zh}</Text> : null}
      {value?.src && budget ? <AssetWeight value={value} budget={budget} /> : null}
      {value?.name && value.src?.startsWith('asset:') ? <Text type="secondary">{value.name}</Text> : null}
      {describe && value?.src ? (
        <div className="skin-asset-alt">
          <div className="skin-field-label"><em>*</em>图片描述（alt）</div>
          <Input.TextArea
            value={value.alt || ''}
            maxLength={125}
            showCount
            status={value.alt?.trim() ? undefined : 'error'}
            autoSize={{ minRows: 1, maxRows: 3 }}
            placeholder={imageAltPlaceholder(line)}
            onChange={(e) => onChange({ ...value, alt: e.target.value })}
          />
          <Text type="secondary" className="skin-asset-hint">
            推荐语言：{languageLabel(defaultLanguageForLine(line))}。{seoLanguageHint(line)}
          </Text>
          {!value.alt?.trim() ? <div className="skin-field-error">有图必须填写 alt，否则无法提交</div> : null}
        </div>
      ) : null}
      {error ? <div className="skin-field-error">{error}</div> : null}
    </div>
  )
}

function clampHole(h: VideoHole): VideoHole {
  const left = Math.min(96, Math.max(0, h.left))
  const top = Math.min(96, Math.max(0, h.top))
  return {
    left,
    top,
    width: Math.min(100 - left, Math.max(8, h.width)),
    height: Math.min(100 - top, Math.max(6, h.height)),
  }
}

function clampMove(h: VideoHole): VideoHole {
  const width = Math.min(100, Math.max(8, h.width))
  const height = Math.min(100, Math.max(6, h.height))
  return {
    width,
    height,
    left: Math.min(100 - width, Math.max(0, h.left)),
    top: Math.min(100 - height, Math.max(0, h.top)),
  }
}

function centerHole(h: VideoHole, axis: 'h' | 'v' | 'both'): VideoHole {
  const next = clampMove(h)
  if (axis === 'h' || axis === 'both') next.left = (100 - next.width) / 2
  if (axis === 'v' || axis === 'both') next.top = (100 - next.height) / 2
  return clampMove(next)
}

/** Excel-style align toolbar: horizontal / vertical / both center. */
function HoleAlignButtons({ rect, onChange }: { rect: VideoHole; onChange: (r: VideoHole) => void }) {
  return (
    <div className="skin-hole-align" role="group" aria-label="对齐">
      <Tooltip title="水平居中（左右居中，上下不动）">
        <button type="button" className="skin-align-btn" onClick={() => onChange(centerHole(rect, 'h'))} aria-label="水平居中">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M2 3h12M2 13h12M4 6.5h8v3H4z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M8 3v10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip title="垂直居中（上下居中，左右不动）">
        <button type="button" className="skin-align-btn" onClick={() => onChange(centerHole(rect, 'v'))} aria-label="垂直居中">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M3 2v12M13 2v12M5.5 4v8h5V4z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip title="水平+垂直居中（放到背景图正中间）">
        <button type="button" className="skin-align-btn" onClick={() => onChange(centerHole(rect, 'both'))} aria-label="水平+垂直居中">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M2 3h12M2 13h12M3 2v12M13 2v12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <rect x="5" y="5.5" width="6" height="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </Tooltip>
    </div>
  )
}

function HoleNums({
  title,
  rect,
  onChange,
}: {
  title: string
  rect: VideoHole
  onChange: (r: VideoHole) => void
}) {
  return (
    <div className="skin-hole-nums-block">
      <div className="skin-hole-nums-title">{title}</div>
      <div className="skin-hole-nums">
        {([['left', '左'], ['top', '上'], ['width', '宽'], ['height', '高']] as const).map(([k, label]) => (
          <label key={k}>
            {label}
            <InputNumber min={0} max={100} value={Math.round(rect[k])} onChange={(v) => onChange(clampMove({ ...rect, [k]: Number(v ?? 0) }))} />
            %
          </label>
        ))}
        <HoleAlignButtons rect={rect} onChange={onChange} />
      </div>
    </div>
  )
}

/** Sticky bar (or any single image) + overlay CTA on the same canvas. */
export function ImageOverlayCtaEditor({
  image,
  ctaMode,
  ctaRect,
  onCtaRect,
  ctaText,
  ctaStyle,
}: {
  image?: SkinAsset
  ctaMode: 'bottom' | 'custom'
  ctaRect: VideoHole
  onCtaRect: (r: VideoHole) => void
  ctaText: string
  ctaStyle?: CtaStyle
}) {
  return (
    <SceneLayoutEditor
      image={image}
      showVideo={false}
      videoRect={DEFAULT_VIDEO_HOLE}
      onVideoRect={() => {}}
      ctaMode={ctaMode}
      ctaRect={ctaRect}
      onCtaRect={onCtaRect}
      ctaText={ctaText}
      ctaStyle={ctaStyle}
    />
  )
}

type LayerTarget = 'video' | 'cta'

/** One canvas for video hole + overlay CTA so relative positions stay visible. */
function SceneLayoutEditor({
  image,
  showVideo,
  video,
  videoRect,
  onVideoRect,
  ctaMode,
  ctaRect,
  onCtaRect,
  ctaText,
  ctaStyle,
  active,
  compact = false,
}: {
  image?: SkinAsset
  showVideo: boolean
  video?: SkinAsset
  videoRect: VideoHole
  onVideoRect: (r: VideoHole) => void
  ctaMode: SceneCtaMode
  ctaRect: VideoHole
  onCtaRect: (r: VideoHole) => void
  ctaText: string
  ctaStyle?: CtaStyle
  /** Highlights the layer selected in the side panel. The canvas itself is not interactive. */
  active?: LayerTarget
  /** Hide the intro text and number inputs (the parent renders them). */
  compact?: boolean
}) {
  const { src } = useSkinAssetURL(image)
  const { src: videoSrc } = useSkinAssetURL(video)
  const paint = normalizeCtaStyle(ctaStyle)
  const showCta = ctaMode === 'custom'
  const showBottomCta = ctaMode === 'bottom'
  const emptyHint = src ? '左侧只预览位置' : '先上传底图'

  return (
    <div className={`skin-hole-picker ${compact ? 'is-compact' : ''}`}>
      {compact ? null : (
        <Typography.Text type="secondary" className="skin-asset-hint" style={{ display: 'block', marginBottom: 8 }}>
          左侧只预览相对位置。左、上、宽、高在下方用百分比填写，画布上不能拖动或缩放。
        </Typography.Text>
      )}
      <div className="skin-hole-canvas is-preview">
        {src ? <img src={src} alt="" draggable={false} /> : <div className="skin-hole-empty">{emptyHint}</div>}
        {showVideo ? (
          <div
            className={`skin-video-hole ${active === 'video' && showCta ? 'is-active' : ''}`}
            style={{ left: `${videoRect.left}%`, top: `${videoRect.top}%`, width: `${videoRect.width}%`, height: `${videoRect.height}%` }}
          >
            <div className="skin-video-hole-clip">
              {videoSrc ? <video src={videoSrc} muted loop playsInline autoPlay /> : <span>视频窗口</span>}
            </div>
          </div>
        ) : null}
        {showBottomCta && src ? (
          <span
            className={buttonClassName({ ...paint, breathe: false }, 'skin-cta-overlay is-docked')}
            style={buttonPaint(paint)}
          >
            {ctaText || '立即体验'}
          </span>
        ) : null}
        {showCta ? (
          <span
            className={buttonClassName({ ...paint, breathe: false }, `skin-cta-overlay ${active === 'cta' && showVideo ? 'is-active' : ''}`)}
            style={{
              ...buttonPaint(paint),
              left: `${ctaRect.left}%`,
              top: `${ctaRect.top}%`,
              width: `${ctaRect.width}%`,
              height: `${ctaRect.height}%`,
            }}
          >
            {ctaText || '立即体验'}
          </span>
        ) : null}
      </div>
      {!compact && showVideo ? <HoleNums title="视频窗口位置" rect={videoRect} onChange={onVideoRect} /> : null}
      {!compact && showCta ? <HoleNums title="叠按钮位置" rect={ctaRect} onChange={onCtaRect} /> : null}
    </div>
  )
}

export function SceneImageField({
  title,
  value,
  onChange,
  onRemove,
  defaultCtaText = '',
  line,
  en = false,
}: {
  title: string
  value: SkinAsset
  onChange: (v: SkinAsset) => void
  onRemove: () => void
  defaultCtaText?: string
  line?: string
  en?: boolean
}) {
  const ctaOn = !!value.ctaMode && value.ctaMode !== 'none'
  const ctaRect = value.ctaRect || DEFAULT_SCENE_CTA_RECT
  const videoRect = value.videoRect || DEFAULT_VIDEO_HOLE
  const playMode: VideoPlayMode = normalizeVideoPlayMode(value.videoPlayMode)
  const videoOn = !!value.withVideo
  const hasImage = !!value.src
  const [active, setActive] = useState<LayerTarget>(videoOn || !ctaOn ? 'video' : 'cta')
  const ctaLabel = value.ctaText || defaultCtaText || '立即体验'

  const toggleVideo = (on: boolean) => {
    onChange({
      ...value,
      withVideo: on,
      videoRect: value.videoRect || { ...DEFAULT_VIDEO_HOLE },
      videoPlayMode: value.videoPlayMode || 'loop',
    })
    if (on) setActive('video')
    else if (ctaOn) setActive('cta')
  }
  const toggleCta = (on: boolean) => {
    onChange({
      ...value,
      ctaMode: on ? 'custom' : 'none',
      ctaText: value.ctaText || defaultCtaText,
      ctaStyle: normalizeCtaStyle(value.ctaStyle || DEFAULT_CTA_STYLE),
      ctaRect: value.ctaRect || { ...DEFAULT_SCENE_CTA_RECT },
    })
    if (on) setActive('cta')
    else if (videoOn) setActive('video')
  }

  return (
    <div className="skin-scene-card">
      <div className="skin-scene-head">
        <b>{title}</b>
        <Button type="link" danger onClick={onRemove}>删除</Button>
      </div>
      <div className="skin-scene-cols">
        <div>
          <div className="skin-col-title">{en ? 'Full design' : '整张设计稿'}</div>
          <SkinAssetField
            hideLabel
            label={en ? 'Full design' : '整张设计稿'}
            hint={en ? 'The complete frame for this screen.' : '这一屏的完整画面。'}
            budget="scene"
            line={line}
            value={value}
            onChange={(next) => onChange(next
              ? {
                  ...value,
                  ...next,
                  kind: 'image',
                  withVideo: value.withVideo,
                  video: value.video,
                  videoRect: value.videoRect,
                  videoPlayMode: value.videoPlayMode,
                  ctaMode: value.ctaMode,
                  ctaText: value.ctaText,
                  ctaStyle: value.ctaStyle,
                  ctaRect: value.ctaRect,
                }
              : { ...value, src: '', name: '' })}
          />
        </div>
        <div>
          <div className="skin-col-title"><em>*</em>{en ? 'Image description (alt)' : '图片描述（alt）'}</div>
          {hasImage ? (
            <div className="skin-asset-alt">
              <Input.TextArea
                value={value.alt || ''}
                maxLength={125}
                showCount
                status={value.alt?.trim() ? undefined : 'error'}
                autoSize={{ minRows: 3, maxRows: 5 }}
                placeholder={imageAltPlaceholder(line)}
                onChange={(e) => onChange({ ...value, alt: e.target.value })}
              />
              <Typography.Text type="secondary" className="skin-asset-hint">
                {en ? 'Recommended language' : '推荐语言'}：{languageLabel(defaultLanguageForLine(line))}。{seoLanguageHint(line, en)}
              </Typography.Text>
              {!value.alt?.trim() ? <div className="skin-field-error">{en ? 'Required before submit' : '有图必须填写，否则无法提交'}</div> : null}
            </div>
          ) : (
            <div className="skin-alt-wait">{en ? 'Fill this in after the image is uploaded.' : '上传设计稿后，在这里填写图片描述。'}</div>
          )}
        </div>
      </div>

      <div className="skin-scene-elements">
      <div className="skin-col-title">{en ? 'On this image' : '图上元素'}</div>
      {!hasImage ? (
        <Typography.Text type="secondary" className="skin-asset-hint">
          {en ? 'Upload the design first, then add a video window or a button on it.' : '先上传设计稿，再在图上添加视频窗口或按钮。'}
        </Typography.Text>
      ) : (
        <div className="skin-scene-layout">
          <div className="skin-scene-canvas-col">
            <SceneLayoutEditor
              compact
              image={value}
              showVideo={videoOn}
              video={value.video}
              videoRect={videoRect}
              onVideoRect={(next) => onChange({ ...value, videoRect: next })}
              ctaMode={ctaOn ? 'custom' : 'none'}
              ctaRect={ctaRect}
              onCtaRect={(next) => onChange({ ...value, ctaRect: next })}
              ctaText={ctaLabel}
              ctaStyle={normalizeCtaStyle(value.ctaStyle)}
              active={active}
            />
            <Typography.Text type="secondary" className="skin-asset-hint">
              {videoOn || ctaOn
                ? '左侧只预览。位置和大小在右侧填写百分比（左、上、宽、高），不能在图上拖动或缩放。按钮始终在视频上方。'
                : '打开右侧的「视频窗口」或「叠按钮」，它们会出现在这张图上。'}
            </Typography.Text>
          </div>

          <div className="skin-layer-list">
            <div
              className={`skin-layer-panel ${videoOn && active === 'video' ? 'is-active' : ''}`}
              onClick={() => videoOn && setActive('video')}
            >
              <div className="skin-layer-head">
                <span className="skin-layer-dot is-video" />
                <div className="skin-layer-title">
                  <b>视频窗口</b>
                  <span>在图上挖一块区域播放视频</span>
                </div>
                <Switch size="small" checked={videoOn} onChange={toggleVideo} onClick={(_, e) => e.stopPropagation()} />
              </div>
              {videoOn ? (
                <div className="skin-layer-body">
                  <div className="skin-layer-row">
                    <label>播放方式</label>
                    <Radio.Group
                      value={playMode}
                      onChange={(e) => onChange({ ...value, videoPlayMode: e.target.value as VideoPlayMode })}
                      options={[
                        { value: 'loop', label: '窗口内静音循环' },
                        { value: 'lightbox', label: '点击后全屏播放' },
                      ]}
                    />
                  </div>
                  <Typography.Text type="secondary" className="skin-asset-hint" style={{ display: 'block', marginBottom: 8 }}>
                    {playMode === 'lightbox'
                      ? '窗口内先显示封面和播放键，用户点击后全屏播放，可出声。'
                      : '进入页面后在窗口内自动静音循环播放，没有播放控件。'}
                  </Typography.Text>
                  <SkinAssetField
                    videoOnly
                    label="视频文件"
                    budget="video"
                    value={value.video}
                    onChange={(video) => onChange({ ...value, video: video?.src ? { ...video, kind: 'video' } : undefined })}
                  />
                  <HoleNums title="位置与大小" rect={videoRect} onChange={(next) => onChange({ ...value, videoRect: next })} />
                </div>
              ) : null}
            </div>

            <div
              className={`skin-layer-panel ${ctaOn && active === 'cta' ? 'is-active' : ''}`}
              onClick={() => ctaOn && setActive('cta')}
            >
              <div className="skin-layer-head">
                <span className="skin-layer-dot is-cta" />
                <div className="skin-layer-title">
                  <b>叠按钮</b>
                  <span>点击效果与注册按钮相同</span>
                </div>
                <Switch size="small" checked={ctaOn} onChange={toggleCta} onClick={(_, e) => e.stopPropagation()} />
              </div>
              {ctaOn ? (
                <div className="skin-layer-body">
                  <div className="skin-layer-row">
                    <label>按钮文案</label>
                    <Input value={value.ctaText || ''} placeholder={defaultCtaText || '立即体验'} onChange={(e) => onChange({ ...value, ctaText: e.target.value })} />
                  </div>
                  <ButtonStyleField
                    sample={ctaLabel}
                    value={normalizeCtaStyle(value.ctaStyle)}
                    onChange={(ctaStyle) => onChange({ ...value, ctaStyle })}
                  />
                  <HoleNums title="位置与大小（默认在图片底部）" rect={ctaRect} onChange={(next) => onChange({ ...value, ctaRect: next })} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

/** Sticky bar uses the same card hierarchy as a before/after image: design | alt, then on-image layers. */
export function StickyBarField({
  en = false,
  line,
  imageEnabled,
  onImageEnabled,
  image,
  onImage,
  buttonEnabled,
  onButtonEnabled,
  ctaText,
  onCtaText,
  ctaStyle,
  onCtaStyle,
  ctaRect,
  onCtaRect,
  sampleText,
}: {
  en?: boolean
  line?: string
  imageEnabled: boolean
  onImageEnabled: (on: boolean) => void
  image?: SkinAsset
  onImage: (next?: SkinAsset) => void
  buttonEnabled: boolean
  onButtonEnabled: (on: boolean) => void
  ctaText: string
  onCtaText: (text: string) => void
  ctaStyle?: CtaStyle
  onCtaStyle: (style: CtaStyle) => void
  ctaRect: VideoHole
  onCtaRect: (rect: VideoHole) => void
  sampleText: string
}) {
  const hasImage = !!image?.src
  const showCanvas = imageEnabled && hasImage
  return (
    <div className="skin-scene-card">
      <div className="skin-scene-head">
        <b>{en ? 'Sticky image' : '吸底图'}</b>
        <Switch checked={imageEnabled} onChange={onImageEnabled} />
      </div>
      {imageEnabled ? (
        <div className="skin-scene-cols">
          <div>
            <div className="skin-col-title">{en ? 'Full design' : '整张设计稿'}</div>
            <SkinAssetField
              hideLabel
              label={en ? 'Sticky image' : '吸底图'}
              hint={en ? 'One image, fixed to the bottom of the page.' : '仅一张，固定在页面底部。'}
              budget="sticky"
              line={line}
              value={image}
              onChange={(next) => onImage(next?.src ? { ...image, ...next, kind: 'image' } : undefined)}
            />
          </div>
          <div>
            <div className="skin-col-title"><em>*</em>{en ? 'Image description (alt)' : '图片描述（alt）'}</div>
            {hasImage && image ? (
              <div className="skin-asset-alt">
                <Input.TextArea
                  value={image.alt || ''}
                  maxLength={125}
                  showCount
                  status={image.alt?.trim() ? undefined : 'error'}
                  autoSize={{ minRows: 3, maxRows: 5 }}
                  placeholder={imageAltPlaceholder(line)}
                  onChange={(e) => onImage({ ...image, alt: e.target.value })}
                />
                <Typography.Text type="secondary" className="skin-asset-hint">
                  {en ? 'Recommended language' : '推荐语言'}：{languageLabel(defaultLanguageForLine(line))}。{seoLanguageHint(line, en)}
                </Typography.Text>
                {!image.alt?.trim() ? <div className="skin-field-error">{en ? 'Required before submit' : '有图必须填写，否则无法提交'}</div> : null}
              </div>
            ) : (
              <div className="skin-alt-wait">{en ? 'Fill this in after the image is uploaded.' : '上传设计稿后，在这里填写图片描述。'}</div>
            )}
          </div>
        </div>
      ) : (
        <Typography.Text type="secondary" className="skin-asset-hint">
          {en ? 'Off: no sticky image. The button can still show as a full-width bar.' : '关闭后不展示吸底图。吸底按钮仍可单独成一条。'}
        </Typography.Text>
      )}

      <div className="skin-scene-elements">
        <div className="skin-col-title">{en ? 'On this image' : '图上元素'}</div>
        <div className={showCanvas ? 'skin-scene-layout' : ''}>
          {showCanvas ? (
            <div className="skin-scene-canvas-col">
              <SceneLayoutEditor
                compact
                image={image}
                showVideo={false}
                videoRect={DEFAULT_VIDEO_HOLE}
                onVideoRect={() => {}}
                ctaMode={buttonEnabled ? 'custom' : 'none'}
                ctaRect={ctaRect}
                onCtaRect={onCtaRect}
                ctaText={sampleText}
                ctaStyle={ctaStyle}
              />
              <Typography.Text type="secondary" className="skin-asset-hint">
                {buttonEnabled
                  ? (en ? 'Preview only. Set left, top, width and height on the right. Nothing on this image can be dragged.' : '左侧只预览。位置和大小在右侧填写百分比（左、上、宽、高），不能在图上拖动。')
                  : (en ? 'Turn on the sticky button to place it on this image.' : '打开右侧的「吸底按钮」，它会出现在这张图上。')}
              </Typography.Text>
            </div>
          ) : null}
          <div className="skin-layer-list">
            <div className={`skin-layer-panel ${buttonEnabled ? 'is-active' : ''}`}>
              <div className="skin-layer-head">
                <span className="skin-layer-dot is-cta" />
                <div className="skin-layer-title">
                  <b>{en ? 'Sticky button' : '吸底按钮'}</b>
                  <span>{en ? 'Same action as the register button' : '点击效果与注册按钮相同'}</span>
                </div>
                <Switch size="small" checked={buttonEnabled} onChange={onButtonEnabled} />
              </div>
              {buttonEnabled ? (
                <div className="skin-layer-body">
                  <div className="skin-layer-row">
                    <label>{en ? 'Text' : '按钮文案'}</label>
                    <Input value={ctaText} placeholder={en ? 'Defaults to the register button' : '不填则沿用注册按钮文案'} onChange={(e) => onCtaText(e.target.value)} />
                  </div>
                  <ButtonStyleField en={en} sample={sampleText} value={normalizeCtaStyle(ctaStyle)} onChange={onCtaStyle} />
                  {showCanvas ? (
                    <HoleNums title={en ? 'Position and size' : '位置与大小'} rect={ctaRect} onChange={onCtaRect} />
                  ) : (
                    <Typography.Text type="secondary" className="skin-asset-hint">
                      {imageEnabled
                        ? (en ? 'Upload the sticky image to place the button on it.' : '请先上传吸底图，再把按钮叠到图上。')
                        : (en ? 'No sticky image — the button is a full-width bottom bar.' : '未开吸底图时，按钮以全宽吸底条展示。')}
                    </Typography.Text>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
