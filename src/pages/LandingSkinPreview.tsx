import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Input, Result } from 'antd'
import { SkinMedia } from '../components/SkinAssetField'
import {
  THIRD_PARTY_OPTIONS,
  findSkin,
  loadLandingSkinStore,
  readPreviewDraft,
  type LandingSkin,
  type ThirdPartyLogin,
} from '../landingSkin'
import './LandingSkinPreview.css'

const labels: Record<string, { phone: string; name: string; otp: string; password: string; cta: string }> = {
  zh: { phone: '手机号', name: '孩子昵称', otp: '验证码', password: '密码', cta: '立即领取' },
  ko: { phone: '휴대폰 번호', name: '아이 이름', otp: '인증번호', password: '비밀번호', cta: '무료 체험 시작' },
  ja: { phone: '電話番号', name: 'お子さまの名前', otp: '認証コード', password: 'パスワード', cta: '7日間の無料体験' },
  vi: { phone: 'Số điện thoại', name: 'Tên bé', otp: 'Mã xác minh', password: 'Mật khẩu', cta: 'Đăng ký ngay' },
  en: { phone: 'Phone number', name: 'Child name', otp: 'Verification code', password: 'Password', cta: 'Start free trial' },
}

function thirdLabel(id: ThirdPartyLogin) {
  return THIRD_PARTY_OPTIONS.find((x) => x.value === id)?.zh ?? id
}

function RegisterCard({ skin }: { skin: LandingSkin }) {
  const copy = labels[skin.language] ?? labels.en
  return (
    <form className="lp-card" onSubmit={(e) => e.preventDefault()}>
      <h2>{copy.cta}</h2>
      {skin.registerMode === 'full' ? (
        <>
          <label>{copy.name}</label>
          <Input placeholder={copy.name} />
        </>
      ) : null}
      <label>{copy.phone}</label>
      <Input placeholder={copy.phone} inputMode="tel" />
      {skin.registerMode === 'full' ? (
        <>
          <label>{copy.otp}</label>
          <Input placeholder={copy.otp} />
          <label>{copy.password}</label>
          <Input.Password placeholder={copy.password} />
        </>
      ) : null}
      {skin.registerMode === 'no_verify' ? (
        <>
          <label>{copy.password}</label>
          <Input.Password placeholder={copy.password} />
        </>
      ) : null}
      <button className="lp-cta" type="submit">{skin.stickyBarCta || copy.cta}</button>
      {skin.thirdPartyLogins.length ? (
        <div className="lp-thirds">
          {skin.thirdPartyLogins.map((id) => (
            <button type="button" className={id} key={id}>{thirdLabel(id)}</button>
          ))}
        </div>
      ) : null}
    </form>
  )
}

export default function LandingSkinPreview() {
  const [params] = useSearchParams()
  const code = params.get('code') || ''
  const isPreview = params.get('preview') === '1'
  const store = useMemo(() => loadLandingSkinStore(), [])
  const skin = useMemo(() => {
    if (code === 'draft') return readPreviewDraft()
    return findSkin(code, store) || (!code ? store.skins[0] : undefined)
  }, [code, store])
  const [curtainOn] = useState(() => !!skin?.effects.includes('curtain'))

  if (!skin) {
    return (
      <div className="lp-skin">
        <Result status="404" title="Skin not found" subTitle={`code=${code || '—'}`} extra={<Button href="#/marketing-center/skins">返回皮肤管理</Button>} />
      </div>
    )
  }

  const copy = labels[skin.language] ?? labels.en
  const showCarousel = skin.effects.includes('carousel') || skin.campaignAssets.filter((x) => x.src).length > 1
  const campaign = skin.campaignAssets.filter((x) => x.src)

  return (
    <div className={`lp-skin lang-${skin.language}`}>
      {isPreview ? (
        <div className="lp-preview-banner">
          <span>预览模式 · {skin.name} · code={skin.code}</span>
          <a href="#/marketing-center/skins">返回配置后台</a>
        </div>
      ) : null}
      <div className="lp-stage">
        {curtainOn ? <div className="lp-curtain" aria-hidden><span /><span /></div> : null}
        {skin.hero?.src ? (
          <div className="lp-hero"><SkinMedia asset={skin.hero} alt={skin.title} /></div>
        ) : null}
        <div className="lp-copy">
          <h1>{skin.title}</h1>
          {skin.subtitle ? <p>{skin.subtitle}</p> : null}
        </div>
        {skin.language === 'ja' ? (
          <div className="lp-game" aria-hidden>
            <div className="lp-ufo" />
            <span className="lp-word" style={{ left: 24, top: 120 }}>hockey</span>
            <span className="lp-word" style={{ right: 28, top: 88, background: '#ff4fa0' }}>draw</span>
            <span className="lp-word" style={{ left: 48, bottom: 28, background: '#06c755' }}>try</span>
          </div>
        ) : null}
        {skin.registerBefore.filter((x) => x.src).map((asset) => (
          <div className="lp-block" key={asset.id}><SkinMedia asset={asset} /></div>
        ))}
        <RegisterCard skin={skin} />
        {skin.registerAfter.filter((x) => x.src).map((asset) => (
          <div className="lp-block" key={asset.id}><SkinMedia asset={asset} /></div>
        ))}
        {showCarousel && campaign.length ? (
          <div className="lp-carousel">
            {campaign.map((asset) => <SkinMedia key={asset.id} asset={asset} />)}
          </div>
        ) : campaign.map((asset) => (
          <div className="lp-block" key={asset.id}><SkinMedia asset={asset} /></div>
        ))}
        {skin.stickyBar?.src || skin.stickyBarCta ? (
          <div className="lp-sticky">
            {skin.stickyBar?.src ? (
              <button type="button" style={{ display: 'block', width: '100%', border: 0, padding: 0, background: 'none' }} onClick={() => document.querySelector<HTMLInputElement>('.lp-card input')?.focus()}>
                <SkinMedia asset={skin.stickyBar} alt={skin.stickyBarCta || copy.cta} />
              </button>
            ) : (
              <div className="lp-sticky-fallback">
                <div><b>{skin.stickyBarCta || copy.cta}</b><span>{skin.subtitle}</span></div>
                <Button onClick={() => document.querySelector<HTMLInputElement>('.lp-card input')?.focus()}>{copy.cta}</Button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
