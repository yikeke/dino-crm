import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatMoney, memberTier, type LinkOffer } from '../paymentLinkCatalog'
import { findMethods, payCopy, bankCopy, localLangLabel, methodDisplayName, type PayMethod, type ReviewLang } from '../paymentMethods'
import { declareBankTransfer, readPaymentLinks, settlePaymentLink, transferReference } from '../paymentLinkStore'
import { useStore } from '../store'
import './PayLinkPage.css'

const asset = (file: string) => `${import.meta.env.BASE_URL}pay/${file}`

const RECEIVER = {
  bank: 'Vietcombank',
  name: 'CONG TY DINO AI',
  number: '10588899210',
}

const DIAL: Record<string, string> = {
  Korea: '+82', 'Hong Kong': '+852', Macau: '+853', Vietnam: '+84', Malaysia: '+60',
  'Saudi Arabia': '+966', Thailand: '+66', Indonesia: '+62', Singapore: '+65',
}

type Account = { userId: string; name: string; phone: string; isNew: boolean }

function LoginSheet({ line, copy, onClose, onConfirm }: {
  line: string
  copy: ReturnType<typeof payCopy>
  onClose: () => void
  onConfirm: (account: Account) => void
}) {
  const students = useStore((s) => s.students)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [account, setAccount] = useState<Account | null>(null)
  const dial = DIAL[line] || '+82'
  const digits = phone.replace(/\D/g, '')
  const social = line === 'Korea' ? ['Kakao', 'Google', 'Apple'] : ['Google', 'Apple']

  const resolve = (value: string): Account => {
    const match = value.length >= 4
      ? students.find((student) => (student.phone || student.account || '').replace(/\D/g, '').endsWith(value))
      : undefined
    if (match) return { userId: match.studentId, name: match.name, phone: match.phone || match.account || value, isNew: false }
    return { userId: `2060${Date.now()}`.slice(0, 19).padEnd(19, '7'), name: '', phone: value ? `${dial} ${value}` : '', isNew: true }
  }

  const socialLogin = (provider: string) => {
    const pool = students.filter((student) => student.businessLine === line)
    const match = pool[0] || students[0]
    setAccount(match
      ? { userId: match.studentId, name: `${match.name} · ${provider}`, phone: match.phone || match.account || '', isNew: false }
      : { ...resolve(''), name: provider })
  }

  return (
    <div className="pay-sheet" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="pay-sheet__panel" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="pay-sheet__close" aria-label="close" onClick={onClose}>×</button>
        {!account ? (
          <>
            <p className="pay-sheet__title">{copy.loginTitle}</p>
            <p className="pay-sheet__sub">{copy.loginSub}</p>
            <label className="pay-field">
              <span>{copy.phone}</span>
              <span className="pay-field__row">
                <span className="pay-field__dial">{dial}</span>
                <input inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="10 1234 5678" />
                <button type="button" className="pay-field__btn" disabled={digits.length < 6} onClick={() => setSent(true)}>{copy.getCode}</button>
              </span>
            </label>
            {sent && (
              <label className="pay-field">
                <span>{copy.code}</span>
                <input inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="000000" />
                <small>{copy.codeHint}</small>
              </label>
            )}
            <button type="button" className="pay-continue" disabled={!sent || code.length !== 6} onClick={() => setAccount(resolve(digits))}>{copy.login}</button>
            <p className="pay-sheet__or"><span>{copy.orWith}</span></p>
            <div className="pay-social">
              {social.map((provider) => (
                <button key={provider} type="button" className={`pay-social__btn is-${provider.toLowerCase()}`} onClick={() => socialLogin(provider)}>{provider}</button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="pay-sheet__title">{copy.confirmTitle}</p>
            <p className="pay-sheet__sub">{copy.confirmBody}</p>
            <div className="pay-account">
              <span className="pay-account__avatar">{(account.name || 'D').slice(0, 1)}</span>
              <div>
                <p className="pay-account__name">{account.name || account.phone}</p>
                <p className="pay-account__meta">ID {account.userId}</p>
                {account.name && account.phone && <p className="pay-account__meta">{account.phone}</p>}
                {account.isNew && <span className="pay-account__new">{copy.newAccount}</span>}
              </div>
            </div>
            <button type="button" className="pay-continue" onClick={() => onConfirm(account)}>{copy.confirmPay}</button>
            <button type="button" className="pay-sheet__link" onClick={() => { setAccount(null); setCode(''); setSent(false) }}>{copy.switchAccount}</button>
          </>
        )}
      </div>
    </div>
  )
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
  const line = params.get('line') || 'Korea'
  const [lang, setLang] = useState<ReviewLang>('local')
  const copy = payCopy(line, lang)
  const bank = bankCopy(lang)
  const userId = params.get('user_id') || ''
  const payLink = params.get('pay_link') || ''
  const preview = params.get('preview') === '1'
  const open = params.get('mode') === 'open'
  const eventName = params.get('event') || ''
  const validUntil = params.get('valid_until') || ''
  const expired = open && !!validUntil && validUntil < new Date().toISOString().slice(0, 10)
  const [account, setAccount] = useState<Account | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
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
  const picked = offers.find((offer) => offer.skuId === pickedId) || offers[0]
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
  const [methodCode, setMethodCode] = useState('')
  const activeMethod = methods.find((method) => method.code === methodCode) || methods[0]
  const showBank = activeMethod?.kind === 'manual'
  const [host, setHost] = useState<PayMethod | null>(null)
  const [acked, setAcked] = useState(false)
  const [copied, setCopied] = useState('')
  const [paidOrderId, setPaidOrderId] = useState(() => (open ? '' : readPaymentLinks().find((item) => item.id === payLink)?.orderId || ''))
  const bankRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (showBank) bankRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [showBank])

  const discount = Math.max(list - payable, 0)
  const chargeLabel = type === 'deposit_first' ? copy.first : type === 'deposit_balance' ? copy.balance : copy.total
  const note = transferReference(payLink)

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(''), 1600)
    } catch {
      setCopied('')
    }
  }

  const pay = (methodName: string) => {
    if (paidOrderId) return
    if (preview) {
      setHost(null)
      return
    }
    if (!picked && offers.length > 0) return
    const stored = readPaymentLinks().find((item) => item.id === payLink)
    const leg = stored?.kind === 'deposit_balance' || stored?.kind === 'deposit_first' ? stored.kind : 'full'
    const first = leg === 'deposit_balance'
      ? readPaymentLinks().find((item) => item.kind === 'deposit_first' && item.depositPlanId && item.depositPlanId === stored?.depositPlanId)
      : undefined
    const settled = settlePaymentLink(payLink || `PL-${Date.now()}`, {
      methodName,
      skuName: `${memberTier(picked?.memberLevel)} · ${skuName}`,
      amount,
      packageAmount: payable,
      currency,
      userId: (open ? account?.userId : userId) || undefined,
      leg,
      existingOrderId: first?.orderId,
    })
    setPaidOrderId(settled?.orderId || paidOrderId)
    setHost(null)
    setAcked(true)
  }

  const choose = (method: PayMethod) => {
    if (paidOrderId) return
    if (method.minAmount && amount < method.minAmount) return
    setMethodCode(method.code)
    setAcked(false)
  }

  const checkout = () => {
    if (paidOrderId || expired || !activeMethod || activeMethod.kind === 'manual') return
    if (activeMethod.minAmount && amount < activeMethod.minAmount) return
    if (open && !account) {
      setLoginOpen(true)
      return
    }
    setHost(activeMethod)
  }

  const confirmAccount = (next: Account) => {
    setAccount(next)
    setLoginOpen(false)
    if (activeMethod) setHost(activeMethod)
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
          {open && account && <p className="psp-sku">ID {account.userId}</p>}
          <button className="psp-pay" type="button" onClick={() => pay(host.name)}>{copy.pay}</button>
          <button className="psp-cancel" type="button" onClick={() => setHost(null)}>{copy.choose}</button>
        </div>
      </div>
    )
  }

  const tier = memberTier(picked?.memberLevel)
  const deposit = type !== 'full'
  const firstAmount = type === 'deposit_first' ? amount : depositPaid
  const balanceAmount = type === 'deposit_first' ? Math.max(payable - amount, 0) : amount
  const kindTag = deposit ? `${chargeLabel} · ${type === 'deposit_first' ? 1 : 2}/2` : copy.fullTag
  const blocked = !!activeMethod?.minAmount && amount < activeMethod.minAmount
  const steps = [
    { key: 'first', name: copy.first, value: firstAmount, state: type === 'deposit_balance' ? 'paid' : 'now' },
    { key: 'balance', name: copy.balance, value: balanceAmount, state: type === 'deposit_balance' ? 'now' : 'later' },
  ]
  const stateLabel = (state: string) => (state === 'paid' ? copy.paidTag : state === 'now' ? copy.dueNow : copy.laterTag)

  return (
    <div className="pay-link-page" dir={copy.dir}>
      <ReviewSwitch lang={lang} line={line} onChange={setLang} />
      {loginOpen && <LoginSheet line={line} copy={copy} onClose={() => setLoginOpen(false)} onConfirm={confirmAccount} />}
      {preview && <div className="pay-preview">预览模式，不会产生订单 · Preview only, no payment is recorded</div>}
      <div className="pay-shell">
        <header className="pay-top">
          <span className="pay-brand">
            <span className="pay-brand__mark">D</span>
            Dino AI
          </span>
          <span className="pay-secure">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 7V5a3.5 3.5 0 1 1 7 0v2h.5A1.5 1.5 0 0 1 13.5 8.5v5A1.5 1.5 0 0 1 12 15H4a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 4 7h.5Zm1.5 0h4V5a2 2 0 1 0-4 0v2Z" /></svg>
            {copy.secure}
          </span>
        </header>

        {open && eventName && <p className="pay-event">{eventName}</p>}

        <section className="pay-due">
          <span className={`pay-due__tag${deposit ? ' is-deposit' : ''}`}>{kindTag}</span>
          <p className="pay-due__label">{copy.dueNow}</p>
          <p className="pay-due__amount">{formatMoney(amount, currency)}</p>
          {skuName && (
            <p className="pay-due__sku">
              <span className={`tier-badge tier-${tier.toLowerCase()}`}>{tier}</span>
              {skuName}
            </p>
          )}
          <div className="pay-due__meta">
            <span>{copy.account}</span>
            <strong className={open && !account ? 'is-muted' : ''}>{open ? (account?.userId || copy.bindAfterLogin) : (userId || '—')}</strong>
          </div>
        </section>

        {paidOrderId && (
          <section className="pay-card pay-done">
            <span className="pay-done__icon">✓</span>
            <div>
              <p className="pay-done__title">{open ? copy.paySuccess : copy.linkPaid}</p>
              <p className="pay-done__order">Order {paidOrderId}</p>
            </div>
          </section>
        )}

        {offers.length > 1 && (
          <section className="pay-card">
            <p className="pay-card__title">{copy.chooseSku}</p>
            <div className="pay-options">
              {offers.map((offer) => {
                const level = memberTier(offer.memberLevel)
                const selected = picked?.skuId === offer.skuId
                return (
                  <button
                    key={offer.skuId}
                    type="button"
                    className={`pay-option${selected ? ' is-selected' : ''}`}
                    onClick={() => setPickedId(offer.skuId)}
                    disabled={!!paidOrderId}
                  >
                    <span className="pay-option__radio" aria-hidden="true" />
                    <span className="pay-option__main">
                      <span className={`tier-badge tier-${level.toLowerCase()}`}>{level}</span>
                      <span>{offer.skuName}</span>
                    </span>
                    <span className="pay-option__price">{formatMoney(offer.payable, offer.currency)}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {picked && (
          <section className="pay-card">
            <p className="pay-card__title">{copy.summary}</p>
            <div className="pay-rows">
              <div className="pay-row">
                <span>{skuName}</span>
                <span className={discount > 0 ? 'pay-row__list' : ''}>{formatMoney(list, currency)}</span>
              </div>
              {discount > 0 && (
                <div className="pay-row">
                  <span>{copy.discount}{promo ? ` · ${promo}` : ''}</span>
                  <span className="pay-row__discount">-{formatMoney(discount, currency)}</span>
                </div>
              )}
              {deposit && (
                <div className="pay-row">
                  <span>{copy.packageDue}</span>
                  <span>{formatMoney(payable, currency)}</span>
                </div>
              )}
            </div>
            {deposit && (
              <ol className="pay-steps">
                {steps.map((step, index) => (
                  <li key={step.key} className={`pay-step is-${step.state}`}>
                    <span className="pay-step__dot">{step.state === 'paid' ? '✓' : index + 1}</span>
                    <span className="pay-step__name">{step.name}</span>
                    <span className="pay-step__state">{stateLabel(step.state)}</span>
                    <span className="pay-step__amount">{formatMoney(step.value, currency)}</span>
                  </li>
                ))}
              </ol>
            )}
            <div className="pay-row pay-row--total">
              <span>{chargeLabel}</span>
              <span className="pay-row__total">{formatMoney(amount, currency)}</span>
            </div>
          </section>
        )}

        {expired && (
          <section className="pay-card pay-expired">{copy.expired}</section>
        )}

        {!paidOrderId && !expired && (
          <section className="pay-card">
            <p className="pay-card__title">{copy.choose}</p>
            <div className="pay-options">
              {methods.map((method) => {
                const under = !!method.minAmount && amount < method.minAmount
                const selected = method.code === activeMethod?.code
                return (
                  <button
                    key={method.code}
                    type="button"
                    className={`pay-option${selected ? ' is-selected' : ''}${under ? ' is-under-min' : ''}`}
                    onClick={() => choose(method)}
                  >
                    <span className="pay-option__radio" aria-hidden="true" />
                    <span className="pay-option__main">
                      <span className="pay-option__icon"><img src={method.icon} alt="" /></span>
                      <span>{methodDisplayName(method, lang)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            {methods.some((method) => method.minAmount && amount < (method.minAmount || 0)) && copy.installment && (
              <p className="pay-hint">{copy.installment}</p>
            )}
          </section>
        )}

        {showBank && !paidOrderId && (
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
              <button className="pay-continue" type="button" onClick={() => { if (!preview) declareBankTransfer(payLink); setAcked(true) }}>{bank.transferred}</button>
            ) : (
              <div className="bank-noted">
                <h2>{bank.notedTitle}</h2>
                <p>{bank.notedBody}</p>
              </div>
            )}
          </section>
        )}

        <p className="pay-terms">
          <span>{copy.cancel}</span>
          <button type="button">{copy.terms}</button>
          <span> · </span>
          <button type="button">{copy.privacy}</button>
        </p>
      </div>

      {!paidOrderId && !expired && activeMethod && !showBank && (
        <div className="pay-bar">
          <button className="pay-continue" type="button" disabled={blocked} onClick={checkout}>
            {copy.pay} · {formatMoney(amount, currency)}
          </button>
        </div>
      )}
    </div>
  )
}
