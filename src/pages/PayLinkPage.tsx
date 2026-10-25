import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatMoney, type LinkOffer } from '../paymentLinkCatalog'
import { findMethods, payCopy, bankCopy, localLangLabel, methodDisplayName, type PayMethod, type ReviewLang } from '../paymentMethods'
import './PayLinkPage.css'

const asset = (file: string) => `${import.meta.env.BASE_URL}pay/${file}`

const RECEIVER = {
  bank: 'Vietcombank',
  name: 'CONG TY DINO AI',
  number: '10588899210',
}

function transferNote(payLink: string) {
  const tail = payLink.replace(/^PL-?/i, '').replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || 'PAYLINK'
  return `DINO${tail}`
}

function ReviewSwitch({ lang, line, onChange }: { lang: ReviewLang; line: string; onChange: (next: ReviewLang) => void }) {
  const options: { id: ReviewLang; label: string }[] = [
    { id: 'en', label: 'EN' },
    { id: 'zh', label: '中文' },
    { id: 'local', label: localLangLabel(line) },
  ]
  return (
    <div className="review-lang" dir="ltr">
      <span>评审</span>
      {options.map((item) => (
        <button key={item.id} type="button" className={lang === item.id ? 'is-on' : ''} onClick={() => onChange(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default function PayLinkPage() {
  const [params] = useSearchParams()
  const line = params.get('line') || '韩国'
  const [lang, setLang] = useState<ReviewLang>('local')
  const copy = payCopy(line, lang)
  const bank = bankCopy(lang)
  const phone = params.get('phone') || ''
  const customerName = params.get('customer_name') || ''
  const payLink = params.get('pay_link') || ''
  const offerKey = params.get('offers') || ''
  const offers = useMemo(() => {
    try {
      const parsed = JSON.parse(offerKey) as LinkOffer[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [offerKey])
  const [pickedId, setPickedId] = useState('')
  const picked = offers.find((offer) => offer.skuId === pickedId) || (offers.length === 1 ? offers[0] : undefined)
  const skuName = picked?.skuName || params.get('sku_name') || params.get('sku') || ''
  const currency = picked?.currency || params.get('currency') || ''
  const payable = picked?.payable ?? Number(params.get('payable') || params.get('amount') || 0)
  const list = picked?.listPrice ?? Number(params.get('list') || payable)
  const promo = params.get('promo') || ''
  const type = params.get('type') || 'full'
  const depositPaid = Number(params.get('deposit_paid') || 0)
  const amount = type === 'deposit_first'
    ? Number(params.get('amount') || 0)
    : type === 'deposit_balance'
      ? Math.max(payable - depositPaid, 0)
      : payable
  const methodKey = params.get('methods') || ''
  const methods = useMemo(
    () => findMethods(line, methodKey.split(',').map((item) => item.trim()).filter(Boolean)),
    [line, methodKey],
  )
  const [host, setHost] = useState<PayMethod | null>(null)
  const [manual, setManual] = useState(false)
  const [acked, setAcked] = useState(false)
  const [copied, setCopied] = useState('')
  const bankRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (manual) bankRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [manual])

  const discount = Math.max(list - payable, 0)
  const chargeLabel = type === 'deposit_first' ? copy.first : type === 'deposit_balance' ? copy.balance : copy.total
  const note = transferNote(payLink)

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(''), 1600)
    } catch {
      setCopied('')
    }
  }

  const choose = (method: PayMethod) => {
    if (offers.length > 1 && !picked) return
    if (method.minAmount && amount < method.minAmount) return
    if (method.kind === 'manual') {
      setHost(null)
      setManual(true)
      setAcked(false)
      return
    }
    setManual(false)
    setHost(method)
  }

  if (host) {
    return (
      <div className="psp-page">
        <ReviewSwitch lang={lang} line={line} onChange={setLang} />
        <div className="psp-card">
          <img className="psp-logo" src={host.icon} alt="" />
          <p className="psp-kicker">{host.name}</p>
          <h1>{formatMoney(amount, currency)}</h1>
          <p className="psp-sku">{skuName}</p>
          <button className="psp-pay" type="button">{copy.pay}</button>
          <button className="psp-cancel" type="button" onClick={() => setHost(null)}>{copy.choose}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="pay-link-page" dir={copy.dir}>
      <div className="pay-stage">
        <div className="pay-bg" aria-hidden="true">
          <img src={asset('bg.png')} alt="" />
        </div>
        <ReviewSwitch lang={lang} line={line} onChange={setLang} />
        <div className="pay-shell">
          <header className="pay-user">
            <p>{copy.forLink}</p>
            <strong>{customerName || phone || '—'}</strong>
            {customerName && phone && <span>{phone}</span>}
          </header>
          <section className="pay-hero">
            <h1 className="pay-hero__title">{copy.title}</h1>
            <div className="pay-gem" aria-hidden="true">
              <img src={asset('gem.png')} alt="" />
            </div>
          </section>

          {offers.length > 1 && (
            <section className="pay-card">
              <p className="pay-methods__title">{copy.chooseSku}</p>
              <div className="pay-method__list">
                {offers.map((offer) => (
                  <button
                    key={offer.skuId}
                    type="button"
                    className={`pay-method${picked?.skuId === offer.skuId ? ' is-selected' : ''}`}
                    onClick={() => { setPickedId(offer.skuId); setManual(false); setAcked(false) }}
                  >
                    <span className="pay-method__info"><span>{offer.skuName}</span></span>
                    <span>{formatMoney(offer.payable, offer.currency)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {(offers.length <= 1 || picked) && (
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
          )}

          <section className="pay-card">
            <p className="pay-methods__title">{copy.choose}</p>
            <div className="pay-method__list">
              {methods.map((method) => {
                const blocked = (offers.length > 1 && !picked) || (!!method.minAmount && amount < method.minAmount)
                const selected = method.kind === 'manual' && manual
                return (
                  <button
                    key={method.code}
                    type="button"
                    className={`pay-method${selected ? ' is-selected' : ''}${blocked ? ' is-under-min' : ''}`}
                    onClick={() => choose(method)}
                  >
                    <span className="pay-method__info">
                      <span className="pay-method__icon"><img src={method.icon} alt="" /></span>
                      <span>{methodDisplayName(method, lang)}</span>
                    </span>
                    {method.kind === 'redirect' && !blocked && (
                      <img className="pay-method__go" src={asset('icon-arrow-down.png')} alt="" />
                    )}
                  </button>
                )
              })}
            </div>
            {methods.some((method) => method.minAmount && amount < (method.minAmount || 0)) && copy.installment && (
              <p className="pay-hint">{copy.installment}</p>
            )}
          </section>

          {manual && (
            <section className="pay-card bank-panel" ref={bankRef}>
              <p className="bank-lead">{bank.instruction}</p>
              <div className="bank-amount">
                <span>{bank.amount}</span>
                <strong>{formatMoney(amount, currency)}</strong>
              </div>
              <div className="bank-ref">
                <div>
                  <p className="bank-label">{bank.note} <em>{bank.mandatory}</em></p>
                  <p className="bank-ref__value">{note}</p>
                </div>
                <button type="button" className="bank-copy" onClick={() => copyValue('note', note)}>
                  <img src={asset('copy.svg')} alt="" />
                </button>
              </div>
              <p className="bank-warn">
                <img src={asset('warn.svg')} alt="" />
                <span>{bank.warning}</span>
              </p>
              <div className="bank-qr">
                <img src={asset('vcb-qr.jpg')} alt={bank.methodName} />
                <p>{bank.qrHint}</p>
              </div>
              <div className="bank-rows">
                {[
                  ['bank', bank.bank, RECEIVER.bank],
                  ['name', bank.accountName, RECEIVER.name],
                  ['number', bank.accountNumber, RECEIVER.number],
                ].map(([key, label, value]) => (
                  <div className="bank-row" key={key}>
                    <div>
                      <p className="bank-label">{label}</p>
                      <p className="bank-row__value">{value}</p>
                    </div>
                    <button type="button" className="bank-copy" onClick={() => copyValue(key, value)}>
                      <img src={asset('copy.svg')} alt="" />
                    </button>
                  </div>
                ))}
              </div>
              {copied && <p className="bank-copied">{bank.copied}</p>}
              {!acked ? (
                <button className="pay-continue" type="button" onClick={() => setAcked(true)}>{bank.transferred}</button>
              ) : (
                <div className="bank-noted">
                  <h2>{bank.notedTitle}</h2>
                  <p>{bank.notedBody}</p>
                </div>
              )}
            </section>
          )}

          <p className="pay-terms pay-terms--flow">
            <span>{copy.cancel}</span>
            <button type="button">{copy.terms}</button>
            <span> · </span>
            <button type="button">{copy.privacy}</button>
          </p>
        </div>
      </div>
    </div>
  )
}
