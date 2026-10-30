import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatMoney, memberTier } from '../paymentLinkCatalog'
import { findMethods, payCopy, bankCopy, localLangLabel, methodDisplayName, type PayMethod, type ReviewLang } from '../paymentMethods'
import {
  DEFAULT_BALANCE_DUE_DAYS,
  PREVIEW_LINK_ID,
  balanceDeadline,
  balanceOverdue,
  completeTxn,
  currentStage,
  declareTransfer,
  ensurePaymentLinkData,
  failTxn,
  findPaymentLink,
  isExpired,
  paidTxn,
  parseTime,
  stageAmount,
  stageMethods,
  startCheckout,
  transferReference,
  txnsOfLink,
  type LinkTxn,
  type PayStage,
} from '../paymentLinkStore'
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
  const linkId = params.get('link') || params.get('pay_link') || ''
  return <PayLinkView key={linkId} linkId={linkId} />
}

function PayLinkView({ linkId }: { linkId: string }) {
  const [params] = useSearchParams()
  const preview = params.get('preview') === '1' || linkId === PREVIEW_LINK_ID
  const [version, setVersion] = useState(0)
  const refresh = () => setVersion((value) => value + 1)
  useEffect(() => {
    ensurePaymentLinkData()
    refresh()
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const link = useMemo(() => findPaymentLink(linkId), [linkId, version])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const txns = useMemo(() => txnsOfLink(linkId), [linkId, version])
  const line = link?.line || 'Korea'
  const [lang, setLang] = useState<ReviewLang>('local')
  const copy = payCopy(line, lang)
  const bank = bankCopy(lang)
  const open = link?.audience === 'open'
  const [account, setAccount] = useState<Account | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [doneTxn, setDoneTxn] = useState<LinkTxn | null>(null)
  const [previewAcked, setPreviewAcked] = useState(false)
  const stage = link ? currentStage(link, txns) : null
  const blockedLink = !!link && (link.status === 'VOID' || isExpired(link))
  const offers = link?.offers || []
  const [pickedId, setPickedId] = useState('')
  const picked = offers.find((offer) => offer.skuId === pickedId) || offers[0]
  const shownStage: PayStage = stage || (link?.kind === 'deposit' ? 'DEPOSIT_BALANCE' : 'FULL')
  const amount = link ? stageAmount(link, shownStage, picked, txns) : 0
  const payable = picked?.payable ?? link?.payable ?? 0
  const list = picked?.listPrice ?? payable
  const currency = picked?.currency || link?.currency || ''
  const skuName = picked?.skuName || link?.skuName || ''
  const methodKey = link ? stageMethods(link, shownStage).join(',') : ''
  const methods = useMemo(() => findMethods(line, methodKey.split(',').filter(Boolean)), [line, methodKey])
  const [methodCode, setMethodCode] = useState('')
  const activeMethod = methods.find((method) => method.code === methodCode) || methods[0]
  const showBank = activeMethod?.kind === 'manual'
  const [host, setHost] = useState<{ method: PayMethod; orderNo?: string; txn?: LinkTxn } | null>(null)
  const [copied, setCopied] = useState('')
  const [bankOrderNo, setBankOrderNo] = useState('')
  const bankRef = useRef<HTMLElement>(null)
  const payerId = open ? account?.userId : link?.userId
  const collecting = !!stage && !doneTxn
  const bankTxn = showBank && collecting && payerId
    ? txns.find((txn) => txn.status === 'PENDING' && txn.payStage === stage && txn.method === activeMethod?.code
      && (!open || txn.orderNo === bankOrderNo))
    : undefined

  useEffect(() => {
    if (showBank) bankRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [showBank])

  useEffect(() => {
    if (!showBank || !collecting || preview || bankTxn || !stage || !activeMethod || !payerId) return
    const started = startCheckout(linkId, { stage, skuId: picked?.skuId, method: activeMethod.code, userId: payerId })
    if (started) {
      setBankOrderNo(started.order.orderNo)
      refresh()
    }
  }, [showBank, collecting, preview, bankTxn, stage, activeMethod, payerId, linkId, picked?.skuId])

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(''), 1600)
    } catch {
      setCopied('')
    }
  }

  if (!link) {
    return (
      <div className="pay-link-page" dir={copy.dir}>
        <div className="pay-shell">
          <section className="pay-card pay-expired">{copy.notFound}</section>
        </div>
      </div>
    )
  }

  const begin = (payer?: Account) => {
    if (!stage || !activeMethod) return
    if (preview) {
      setHost({ method: activeMethod })
      return
    }
    const started = startCheckout(linkId, { stage, skuId: picked?.skuId, method: activeMethod.code, userId: payer?.userId })
    if (!started) return
    setHost({ method: activeMethod, orderNo: started.order.orderNo, txn: started.txn })
    refresh()
  }

  const pay = () => {
    if (!host) return
    const paid = !preview && host.txn ? completeTxn(host.txn.txnId) : undefined
    if (paid) setDoneTxn(paid)
    setHost(null)
    refresh()
  }

  const leaveHost = (reason: string) => {
    if (!preview && host?.txn) failTxn(host.txn.txnId, reason)
    setHost(null)
    refresh()
  }

  const choose = (method: PayMethod) => {
    if (!collecting) return
    if (method.minAmount && amount < method.minAmount) return
    setMethodCode(method.code)
  }

  const checkout = () => {
    if (!collecting || blockedLink || !activeMethod || activeMethod.kind === 'manual') return
    if (activeMethod.minAmount && amount < activeMethod.minAmount) return
    if (open && !account) {
      setLoginOpen(true)
      return
    }
    begin(account || undefined)
  }

  const confirmAccount = (next: Account) => {
    setAccount(next)
    setLoginOpen(false)
    begin(next)
  }

  const declare = () => {
    if (preview) {
      setPreviewAcked(true)
      return
    }
    if (!bankTxn) return
    declareTransfer(bankTxn.txnId)
    refresh()
  }

  if (host) {
    return (
      <div className="psp-page">
        <ReviewSwitch lang={lang} line={line} onChange={setLang} />
        <div className="psp-card">
          <img className="psp-logo" src={host.method.icon} alt="" />
          <p className="psp-kicker">{host.method.name}</p>
          <h1>{formatMoney(amount, currency)}</h1>
          <p className="psp-sku">{skuName}</p>
          {host.orderNo && <p className="psp-sku">Order {host.orderNo}</p>}
          {host.txn && <p className="psp-sku">Transaction {host.txn.txnId}</p>}
          {open && account && <p className="psp-sku">ID {account.userId}</p>}
          <button className="psp-pay" type="button" onClick={pay}>{copy.pay}</button>
          <button className="psp-cancel" type="button" onClick={() => leaveHost('用户返回，未完成支付')}>{copy.choose}</button>
          <button className="psp-fail" type="button" onClick={() => leaveHost('支付失败')}>模拟支付失败 · Simulate failure</button>
        </div>
      </div>
    )
  }

  const tier = memberTier(picked?.memberLevel)
  const deposit = link.kind === 'deposit'
  const discount = Math.max(list - payable, 0)
  const chargeLabel = shownStage === 'DEPOSIT_FIRST' ? copy.first : shownStage === 'DEPOSIT_BALANCE' ? copy.balance : copy.total
  const kindTag = deposit ? `${chargeLabel} · ${shownStage === 'DEPOSIT_FIRST' ? 1 : 2}/2` : copy.fullTag
  const blocked = !!activeMethod?.minAmount && amount < activeMethod.minAmount
  const firstPaid = paidTxn(txns, 'DEPOSIT_FIRST')
  const balancePaid = paidTxn(txns, 'DEPOSIT_BALANCE')
  const steps = [
    { key: 'first', name: copy.first, value: firstPaid?.amount ?? link.amount, state: firstPaid ? 'paid' : 'now' },
    { key: 'balance', name: copy.balance, value: Math.max(payable - (firstPaid?.amount ?? link.amount), 0), state: balancePaid ? 'paid' : firstPaid ? 'now' : 'later' },
  ]
  const stateLabel = (state: string) => (state === 'paid' ? copy.paidTag : state === 'now' ? copy.dueNow : copy.laterTag)
  const dueAt = deposit ? balanceDeadline(link, txns) : null
  const overdue = deposit && balanceOverdue(link, txns)
  const dueDays = link.balanceDueDays || DEFAULT_BALANCE_DUE_DAYS
  const daysText = (template: string, days: number) => template.replace('{days}', String(days)).replace(' 1 days', ' 1 day')
  const dueNote = overdue
    ? copy.overdue
    : stage === 'DEPOSIT_FIRST' && !doneTxn
      ? daysText(copy.dueRule, dueDays)
      : stage === 'DEPOSIT_BALANCE' && dueAt
        ? daysText(copy.dueLeft, Math.max(1, Math.ceil((parseTime(dueAt) - Date.now()) / 86_400_000)))
        : ''
  const settledTxn = !stage && !open && !blockedLink && !overdue
    ? txns.filter((txn) => txn.status === 'SUCCESS').sort((a, b) => (b.paidAt || '').localeCompare(a.paidAt || ''))[0]
    : undefined
  const note = bankTxn?.transferReference || transferReference(preview ? 'TXN-PREVIEW' : linkId)
  const acked = preview ? previewAcked : !!bankTxn?.declaredAt

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

        {open && link.eventName && <p className="pay-event">{link.eventName}</p>}

        <section className="pay-due">
          <span className={`pay-due__tag${deposit ? ' is-deposit' : ''}`}>{kindTag}</span>
          <p className="pay-due__label">{copy.dueNow}</p>
          <p className="pay-due__amount">{formatMoney(amount, currency)}</p>
          {dueNote && <p className="pay-due__rule">{dueNote}</p>}
          {skuName && (
            <p className="pay-due__sku">
              <span className={`tier-badge tier-${tier.toLowerCase()}`}>{tier}</span>
              {skuName}
            </p>
          )}
          <div className="pay-due__meta">
            <span>{copy.account}</span>
            <strong className={open && !account ? 'is-muted' : ''}>{open ? (account?.userId || copy.bindAfterLogin) : (link.userId || '—')}</strong>
          </div>
        </section>

        {(doneTxn || settledTxn) && (
          <section className="pay-card pay-done">
            <span className="pay-done__icon">✓</span>
            <div>
              <p className="pay-done__title">{doneTxn ? copy.paySuccess : copy.linkPaid}</p>
              <p className="pay-done__order">Order {(doneTxn || settledTxn)?.orderNo}</p>
              {doneTxn?.payStage === 'DEPOSIT_FIRST' && <p className="pay-done__order">{copy.balanceNext}</p>}
            </div>
          </section>
        )}

        {blockedLink && <section className="pay-card pay-expired">{copy.expired}</section>}

        {offers.length > 1 && shownStage === 'FULL' && (
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
                    disabled={!collecting}
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
                  <span>{copy.discount}{link.promoCode ? ` · ${link.promoCode}` : ''}</span>
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

        {collecting && (
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

        {showBank && collecting && (
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
              <button className="pay-continue" type="button" onClick={declare}>{bank.transferred}</button>
            ) : (
              <div className="bank-noted">
                <h2>{bank.notedTitle}</h2>
                <p>{bank.notedBody}</p>
              </div>
            )}
          </section>
        )}

        <p className="pay-terms">
          <button type="button">{copy.terms}</button>
          <span> · </span>
          <button type="button">{copy.privacy}</button>
        </p>
      </div>

      {collecting && !blockedLink && activeMethod && !showBank && (
        <div className="pay-bar">
          <button className="pay-continue" type="button" disabled={blocked} onClick={checkout}>
            {copy.pay} · {formatMoney(amount, currency)}
          </button>
        </div>
      )}
    </div>
  )
}
