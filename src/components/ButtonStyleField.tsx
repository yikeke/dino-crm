import { Input, Switch, Typography } from 'antd'
import {
  BUTTON_PRESET_OPTIONS,
  PRESET_COLORS,
  applyButtonPreset,
  buttonClassName,
  buttonPaint,
  normalizeCtaStyle,
  type CtaStyle,
} from '../landingSkin'
import '../landingButton.css'

const { Text } = Typography

function toColorInput(value: string) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const r = value[1]
    const g = value[2]
    const b = value[3]
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return '#000000'
}

function ColorChip({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (next: string) => void
}) {
  return (
    <label className="skin-color-chip">
      <span>{label}</span>
      <input type="color" value={toColorInput(value)} onChange={(e) => onChange(e.target.value)} />
      <Input size="small" value={value} maxLength={7} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

export default function ButtonStyleField({
  value,
  onChange,
  sample,
  en = false,
}: {
  value?: CtaStyle
  onChange: (next: CtaStyle) => void
  sample: string
  en?: boolean
}) {
  const style = normalizeCtaStyle(value)
  return (
    <div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 10 }}>
        {en
          ? 'Pick a recipe, then fine-tune fill and text. Midnight gold is for dark landing pages.'
          : '先选结构样式，再用调色盘改色块和文字色。夜色金适合暗色落地页。呼吸动效是通用开关。'}
      </Text>
      <div className="skin-btn-grid">
        {BUTTON_PRESET_OPTIONS.map((preset) => (
          <button
            type="button"
            key={preset.value}
            className={`skin-btn-pick ${style.preset === preset.value ? 'is-on' : ''}`}
            onClick={() => onChange(applyButtonPreset(preset.value, style.breathe))}
          >
            <span
              className={buttonClassName({ ...PRESET_COLORS[preset.value], preset: preset.value, breathe: style.preset === preset.value && style.breathe })}
              style={buttonPaint({ ...PRESET_COLORS[preset.value], preset: preset.value })}
            >
              {sample}
            </span>
            <em>{en ? preset.en : preset.zh}</em>
          </button>
        ))}
      </div>
      <div className="skin-color-row">
        <ColorChip label={en ? 'Fill from' : '色块起始'} value={style.from} onChange={(from) => onChange({ ...style, from })} />
        <ColorChip label={en ? 'Fill to' : '色块结束'} value={style.to} onChange={(to) => onChange({ ...style, to })} />
        <ColorChip label={en ? 'Text' : '文字色'} value={style.text} onChange={(text) => onChange({ ...style, text })} />
      </div>
      <div
        className={buttonClassName(style, 'skin-btn-live')}
        style={buttonPaint(style)}
      >
        {sample}
      </div>
      <div className="skin-btn-breathe">
        <Switch checked={style.breathe} onChange={(breathe) => onChange({ ...style, breathe })} />
        <span>{en ? 'Breathing pulse (applies to any style)' : '呼吸动效（通用，任意样式都可开）'}</span>
      </div>
    </div>
  )
}
