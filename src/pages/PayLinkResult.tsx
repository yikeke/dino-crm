import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { formatMoney, memberTier } from '../paymentLinkCatalog'
import { findMethods, localLangLabel, methodDisplayName, type ReviewLang } from '../paymentMethods'
import { ensurePaymentLinkData, findPaymentLink, ordersOfLink, txnsOfLink } from '../paymentLinkStore'
import './PayLinkPage.css'

const CONFIRM_MS = 1200

type ResultCopy = {
  confirming: string
  confirmingSub: string
  processing: string
  processingSub: string
  refresh: string
  success: string
  successSub: string
  failed: string
  failedSub: string
  notFound: string
  plan: string
  paid: string
  method: string
  paidAt: string
  account: string
  order: string
  appHint: string
  payAgain: string
  retry: string
  back: string
  copied: string
}

const RESULT_COPY: Record<'ko' | 'zh' | 'en', ResultCopy> = {
  ko: {
    confirming: '결제 결과를 확인하고 있습니다', confirmingSub: '잠시만 기다려 주세요',
    processing: '결제 결과를 아직 확인 중입니다', processingSub: '잠시 후 새로고침해 주세요', refresh: '새로고침',
    success: '결제가 완료되었습니다', successSub: '멤버십이 개통되었습니다',
    failed: '결제가 완료되지 않았습니다', failedSub: '결제 금액은 청구되지 않았습니다. 다시 결제하거나 다른 결제 수단을 선택해 주세요.',
    notFound: '주문을 찾을 수 없습니다',
    plan: '멤버십', paid: '결제 금액', method: '결제 수단', paidAt: '결제 시간', account: '사용자 ID', order: '주문 번호',
    appHint: '같은 계정으로 Dino AI 앱에 로그인하면 바로 학습을 시작할 수 있습니다.',
    payAgain: '다시 결제하기', retry: '다시 결제하기', back: '결제 페이지로 돌아가기', copied: '복사됨',
  },
  zh: {
    confirming: '正在确认支付结果', confirmingSub: '请稍候',
    processing: '支付结果还在确认', processingSub: '请稍后刷新', refresh: '刷新',
    success: '支付成功', successSub: '会员已开通',
    failed: '支付未完成', failedSub: '没有扣款。你可以重新支付，或换一种支付方式。',
    notFound: '找不到这笔订单',
    plan: '会员套餐', paid: '实付金额', method: '支付方式', paidAt: '支付时间', account: 'User ID', order: '订单号',
    appHint: '用同一个账号登录 Dino AI App，就可以开始学习。',
    payAgain: '再次支付', retry: '重新支付', back: '返回支付页', copied: '已复制',
  },
  en: {
    confirming: 'Confirming your payment', confirmingSub: 'Please wait a moment',
    processing: 'Your payment is still being confirmed', processingSub: 'Please refresh in a moment', refresh: 'Refresh',
    success: 'Payment successful', successSub: 'Your membership is now active',
    failed: 'Payment not completed', failedSub: 'You have not been charged. Pay again or choose another payment method.',
    notFound: 'Order not found',
    plan: 'Membership', paid: 'Amount paid', method: 'Payment method', paidAt: 'Paid at', account: 'User ID', order: 'Order number',
    appHint: 'Log in to the Dino AI app with the same account to start learning.',
    payAgain: 'Pay again', retry: 'Try again', back: 'Back to payment', copied: 'Copied',
  },
}

function resultCopy(line: string, lang: ReviewLang) {
  if (lang === 'zh') return RESULT_COPY.zh
  if (lang === 'local' && line === 'Korea') return RESULT_COPY.ko
  return RESULT_COPY.en
}

export default function PayLinkResult() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const linkId = params.get('link') || ''
  const orderNo = params.get('orderNo') || ''
  const demo = params.get('demo')
  const [lang, setLang] = useState<ReviewLang>('local')
  const [confirming, setConfirming] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    ensurePaymentLinkData()
    const timer = window.setTimeout(() => setConfirming(false), CONFIRM_MS)
    return () => window.clearTimeout(timer)
  }, [orderNo])

  const link = useMemo(() => (confirming ? undefined : findPaymentLink(linkId)), [linkId, confirming])
  const order = link ? ordersOfLink(linkId).find((item) => item.orderNo === orderNo) : undefined
  const txn = order ? txnsOfLink(linkId).filter((item) => item.orderNo === orderNo).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] : undefined
  const line = link?.line || 'Korea'
  const copy = resultCopy(line, lang)
  const state = confirming ? 'confirming'
    : demo === 'processing' ? 'processing'
      : !order ? 'missing'
        : txn?.status === 'SUCCESS' ? 'success'
          : order.cancelled || txn?.status === 'FAILED' ? 'failed' : 'processing'
  const method = txn ? findMethods(line, [txn.method])[0] : undefined
  const tier = memberTier(link?.offers?.find((offer) => offer.skuId === order?.skuId)?.memberLevel)
  const backToLink = () => navigate(`/pay-link?link=${encodeURIComponent(linkId)}`)

  const copyOrder = async () => {
    try {
      await navigator.clipboard.writeText(orderNo)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const rows: [string, React.ReactNode][] = order && txn ? [
    [copy.plan, <span className="pay-result__plan"><span className={`tier-badge tier-${tier.toLowerCase()}`}>{tier}</span>{order.skuName}</span>],
    [copy.paid, formatMoney(txn.amount, txn.currency)],
    [copy.method, method ? methodDisplayName(method, lang) : txn.method],
    [copy.paidAt, txn.paidAt?.slice(0, 16) || '—'],
    [copy.account, order.userId || '—'],
    [copy.order, <button type="button" className="pay-result__copy" onClick={copyOrder}>{orderNo}<span>{copied ? copy.copied : '⧉'}</span></button>],
  ] : []

  return (
    <div className="pay-link-page" dir="ltr">
      <div className="review-lang" dir="ltr">
        <span>评审</span>
        {([['en', 'EN'], ['zh', '中文'], ['local', localLangLabel(line)]] as [ReviewLang, string][]).map(([id, label]) => (
          <button key={id} type="button" className={lang === id ? 'is-on' : ''} onClick={() => setLang(id)}>{label}</button>
        ))}
      </div>
      <div className="pay-shell">
        <header className="pay-top">
          <span className="pay-brand">
            <span className="pay-brand__mark">D</span>
            Dino AI
          </span>
        </header>
        {link?.eventName && <p className="pay-event">{link.eventName}</p>}

        <section className={`pay-card pay-result is-${state}`}>
          <span className="pay-result__icon">
            {state === 'confirming' || state === 'processing' ? <span className="pay-result__spin" /> : state === 'success' ? '✓' : '!'}
          </span>
          <h1 className="pay-result__title">
            {state === 'confirming' ? copy.confirming
              : state === 'processing' ? copy.processing
                : state === 'success' ? copy.success
                  : state === 'failed' ? copy.failed : copy.notFound}
          </h1>
          {state === 'confirming' && <p className="pay-result__sub">{copy.confirmingSub}</p>}
          {state === 'processing' && <p className="pay-result__sub">{copy.processingSub}</p>}
          {state === 'success' && <p className="pay-result__sub">{copy.successSub}</p>}
          {state === 'failed' && <p className="pay-result__sub">{copy.failedSub}</p>}
        </section>

        {state === 'success' && (
          <>
            <section className="pay-card">
              <div className="pay-rows">
                {rows.map(([label, value]) => (
                  <div className="pay-row" key={label}>
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </section>
            <p className="pay-result__hint">{copy.appHint}</p>
          </>
        )}
      </div>

      {state !== 'confirming' && (
        <div className="pay-bar">
          {state === 'processing' ? (
            <button className="pay-continue" type="button" onClick={() => window.location.reload()}>{copy.refresh}</button>
          ) : (
            <button className="pay-continue" type="button" onClick={backToLink}>
              {state === 'success' ? copy.payAgain : state === 'failed' ? copy.retry : copy.back}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
