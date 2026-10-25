import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatMoney } from '../paymentLinkCatalog'
import { findMethods, payCopy, type PayMethod } from '../paymentMethods'
import './PayLinkPage.css'

const asset = (file: string) => `${import.meta.env.BASE_URL}pay/${file}`

export default function PayLinkPage() {
  const [params] = useSearchParams()
  const line = params.get('line') || '韩国'
  const copy = payCopy(line)
  const skuName = params.get('sku_name') || params.get('sku') || ''
  const currency = params.get('currency') || ''
  const amount = Number(params.get('amount') || 0)
  const payable = Number(params.get('payable') || amount)
  const list = Number(params.get('list') || payable)
  const promo = params.get('promo') || ''
  const type = params.get('type') || 'full'
  const methodKey = params.get('methods') || ''
  const methods = useMemo(
    () => findMethods(line, methodKey.split(',').map((item) => item.trim()).filter(Boolean)),
    [line, methodKey],
  )
  const [selected, setSelected] = useState('')
  const [toast, setToast] = useState('')

  const discount = Math.max(list - payable, 0)
  const chargeLabel = type === 'deposit_first' ? copy.first : type === 'deposit_balance' ? copy.balance : copy.total
  const active = methods.find((item) => item.code === selected)
  const underMin = !!active?.minAmount && amount < active.minAmount

  const choose = (method: PayMethod) => {
    if (method.minAmount && amount < method.minAmount) return
    setSelected(method.code)
  }

  const pay = () => {
    if (!active || underMin) return
    const text = type === 'deposit_first'
      ? `${active.name} · ${copy.first}`
      : type === 'deposit_balance'
        ? `${active.name} · ${copy.balance}`
        : active.name
    setToast(text)
    window.setTimeout(() => setToast(''), 2200)
  }

  return (
    <div className="pay-link-page" dir={copy.dir}>
      <div className="pay-stage">
        <div className="pay-bg" aria-hidden="true">
          <img src={asset('bg.png')} alt="" />
        </div>
        <div className="pay-shell">
          <header className="pay-topbar">
            <button className="pay-back" type="button" aria-label="Back" onClick={() => window.history.back()}>
              <img src={asset('back.svg')} alt="" />
            </button>
          </header>
          <section className="pay-hero">
            <h1 className="pay-hero__title">{copy.title}</h1>
            <div className="pay-gem" aria-hidden="true">
              <img src={asset('gem.png')} alt="" />
            </div>
          </section>

          <section className="pay-card">
            <div className="pay-row">
              <span>{skuName}</span>
              <span>{formatMoney(list, currency)}</span>
            </div>
            {discount > 0 && (
              <div className="pay-row">
                <span>{copy.discount}{promo ? ` · ${promo}` : ''}</span>
                <span className="pay-row__discount">-{formatMoney(discount, currency)}</span>
              </div>
            )}
            {type !== 'full' && (
              <div className="pay-row">
                <span>{copy.packageDue}</span>
                <span>{formatMoney(payable, currency)}</span>
              </div>
            )}
            <div className="pay-row pay-row--total">
              <span>{chargeLabel}</span>
              <span className="pay-row__total">{formatMoney(amount, currency)}</span>
            </div>
          </section>

          <section className="pay-card">
            <p className="pay-methods__title">{copy.choose}</p>
            <div className="pay-method__list">
              {methods.map((method) => {
                const blocked = !!method.minAmount && amount < method.minAmount
                return (
                  <button
                    key={method.code}
                    type="button"
                    className={`pay-method${selected === method.code ? ' is-selected' : ''}${blocked ? ' is-under-min' : ''}`}
                    onClick={() => choose(method)}
                  >
                    <span className="pay-method__info">
                      <span className="pay-method__icon"><img src={method.icon} alt="" /></span>
                      <span>{method.name}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            {methods.some((method) => method.minAmount && amount < (method.minAmount || 0)) && copy.installment && (
              <p className="pay-hint">{copy.installment}</p>
            )}
          </section>
        </div>
        <footer className="pay-footer">
          <button className="pay-continue" type="button" disabled={!selected || underMin} onClick={pay}>
            {copy.pay}
          </button>
          <p className="pay-terms">
            <span>{copy.cancel}</span>
            <button type="button">{copy.terms}</button>
            <span> · </span>
            <button type="button">{copy.privacy}</button>
          </p>
        </footer>
      </div>
      {toast && <div className="pay-toast">{toast}</div>}
    </div>
  )
}
