import { setState } from './store'
import type { Order, OrderStatus, OrderTransaction } from './types'
import type { LinkOffer } from './paymentLinkCatalog'

export const PAYMENT_LINK_KEY = 'dino-cc-payment-links-v7'
export const LINK_ORDER_KEY = 'dino-cc-link-orders-v2'
export const LINK_TXN_KEY = 'dino-cc-link-txns-v1'
export const PREVIEW_LINK_KEY = 'dino-cc-payment-link-preview'
export const PREVIEW_LINK_ID = 'PL-PREVIEW'
const LEGACY_KEYS = [
  'dino-cc-payment-links-v1', 'dino-cc-payment-links-v2', 'dino-cc-payment-links-v3', 'dino-cc-payment-links-v4',
  'dino-cc-payment-links-v5', 'dino-cc-payment-links-v6', 'dino-cc-link-orders-v1',
]
export const DEFAULT_BALANCE_DUE_DAYS = 7

export type PayStage = 'FULL' | 'DEPOSIT_FIRST' | 'DEPOSIT_BALANCE'
export type TxnStatus = 'PENDING' | 'SUCCESS' | 'FAILED'
export type OrderState = 'PENDING' | 'PARTIALLY_PAID' | 'COMPLETED' | 'CANCELLED'

/** Layer 1. A payment link only holds what to charge. */
export type PaymentLink = {
  id: string
  kind: 'full' | 'deposit'
  audience: 'user' | 'open'
  userId?: string
  line: string
  channelId: string
  channelName: string
  channelCode: string
  planId: string
  offers: LinkOffer[]
  skuId: string
  skuName: string
  currency: string
  listPrice: number
  promoCode: string
  /** Package price after promo. For a deposit it is the full package the two payments add up to. */
  payable: number
  /** Deposit first payment. Unused for full payment. */
  amount: number
  methods: string[]
  /** Deposit balance methods. CC can change them until the balance is paid. */
  balanceMethods?: string[]
  /** Deposit: the balance is due this many days after the first payment lands, or the first payment is cancelled. */
  balanceDueDays?: number
  /** Deposit: a CC manager moved the balance deadline. Overrides first payment time + balanceDueDays. */
  balanceDueAt?: string
  eventName?: string
  validUntil?: string
  status: 'ACTIVE' | 'VOID'
  url: string
  createdAt: string
  updatedAt: string
  createdBy?: string
  /** CRM operations on this link, shown in the「操作记录」drawer. Oldest first. */
  history?: LinkHistoryEntry[]
}

export type LinkHistoryEntry = {
  id: string
  at: string
  actor: string
  action: string
  detail: string
}

/**
 * Layer 2. One purchase of one package. A User ID link has at most one order (full or deposit);
 * an open link gets one order per payer per payment.
 */
export type WebOrder = {
  orderNo: string
  paymentLinkId: string
  userId?: string
  /** Empty until the customer picks one, when the link offers several SKUs. */
  skuId: string
  skuName: string
  payable: number
  currency: string
  cancelled?: boolean
  /** link: created with the link because it offers bank transfer. checkout: created when the customer pressed pay. */
  origin: 'link' | 'checkout'
  createdAt: string
}

/** Layer 3. One payment attempt: created when the customer presses pay (or picks bank transfer), one method each. */
export type LinkTxn = {
  txnId: string
  orderNo: string
  paymentLinkId: string
  payStage: PayStage
  amount: number
  currency: string
  method: string
  transferReference?: string
  providerRef?: string
  declaredAt?: string
  status: TxnStatus
  failReason?: string
  createdAt: string
  paidAt?: string
}

export function historyEntry(actor: string, action: string, detail: string, at = now()): LinkHistoryEntry {
  return { id: `H_${Math.random().toString(36).slice(2, 10)}`, at, actor, action, detail }
}

export function logLinkAction(id: string, actor: string, action: string, detail: string) {
  writePaymentLinks(readPaymentLinks().map((link) => (link.id === id ? { ...link, history: [...(link.history || []), historyEntry(actor, action, detail)] } : link)))
}

function readJson<T>(key: string): T[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function readPaymentLinks(): PaymentLink[] {
  return readJson<PaymentLink>(PAYMENT_LINK_KEY)
}

export function writePaymentLinks(links: PaymentLink[]) {
  localStorage.setItem(PAYMENT_LINK_KEY, JSON.stringify(links))
}

export function readLinkOrders(): WebOrder[] {
  return readJson<WebOrder>(LINK_ORDER_KEY)
}

export function readLinkTxns(): LinkTxn[] {
  return readJson<LinkTxn>(LINK_TXN_KEY)
}

function writeAll(orders: WebOrder[], txns: LinkTxn[]) {
  localStorage.setItem(LINK_ORDER_KEY, JSON.stringify(orders))
  localStorage.setItem(LINK_TXN_KEY, JSON.stringify(txns))
  syncOrderCenter(orders, txns)
}

export function findPaymentLink(id: string): PaymentLink | undefined {
  if (id === PREVIEW_LINK_ID) {
    try {
      return JSON.parse(localStorage.getItem(PREVIEW_LINK_KEY) || 'null') || undefined
    } catch {
      return undefined
    }
  }
  return readPaymentLinks().find((item) => item.id === id)
}

export function ordersOfLink(id: string, orders = readLinkOrders()) {
  return orders.filter((order) => order.paymentLinkId === id)
}

export function txnsOfLink(id: string, txns = readLinkTxns()) {
  return txns.filter((txn) => txn.paymentLinkId === id)
}

export function payLinkUrl(id: string) {
  const root = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${root}/#/lp/pay-link?link=${encodeURIComponent(id)}`
}

export function now() {
  return stamp(new Date())
}

function dayCode() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

function newOrderNo() {
  return `WEB-${dayCode()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

function newTxnId() {
  return `TXN-${dayCode()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

export function transferReference(txnId: string) {
  return `DINO${txnId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`
}

function providerRef(method: string) {
  const prefix = method.replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase() || 'PSP'
  return `${prefix}-${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
}

export function isExpired(link: PaymentLink) {
  return !!link.validUntil && link.validUntil < now().slice(0, 10)
}

function stamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function parseTime(value: string) {
  return new Date(value.replace(' ', 'T')).getTime()
}

export function paidTxn(txns: LinkTxn[], stage: PayStage) {
  return txns.find((txn) => txn.payStage === stage && txn.status === 'SUCCESS')
}

export function declaredTxn(txns: LinkTxn[], stage: PayStage) {
  return txns.find((txn) => txn.payStage === stage && txn.status === 'PENDING' && !!txn.declaredAt)
}

/** Order status is derived from its transactions; nothing is stored on the order. */
export function orderState(order: WebOrder, txns: LinkTxn[]): { state: OrderState; paid: number; paidAt?: string } {
  const done = txns.filter((txn) => txn.orderNo === order.orderNo && txn.status === 'SUCCESS')
  const paid = done.reduce((sum, txn) => sum + txn.amount, 0)
  const paidAt = done.map((txn) => txn.paidAt || '').sort().pop()
  if (paid > 0 && order.payable > 0 && paid >= order.payable) return { state: 'COMPLETED', paid, paidAt }
  if (paid > 0) return { state: 'PARTIALLY_PAID', paid }
  return { state: order.cancelled ? 'CANCELLED' : 'PENDING', paid }
}

/** User ID links that offer bank transfer get their web order when the link is created, so a manager can confirm a transfer. */
export function needsUpfrontOrder(link: PaymentLink) {
  return link.audience === 'user' && [...link.methods, ...(link.balanceMethods || [])].includes('bank_transfer')
}

function orderFor(link: PaymentLink, origin: WebOrder['origin'], userId?: string, skuId?: string): WebOrder {
  const offer = link.offers.find((item) => item.skuId === skuId) || (link.offers.length === 1 ? link.offers[0] : undefined)
  return {
    orderNo: newOrderNo(),
    paymentLinkId: link.id,
    userId,
    skuId: offer?.skuId || '',
    skuName: offer ? `${offer.memberLevel || 'Pro'} · ${offer.skuName}` : '',
    payable: offer?.payable ?? 0,
    currency: offer?.currency || link.currency,
    origin,
    createdAt: now(),
  }
}

/** After a User ID link is saved or its methods change: create, refresh or drop the upfront order while nothing is paid on it. */
export function syncUpfrontOrder(link: PaymentLink) {
  if (link.audience !== 'user' || link.id === PREVIEW_LINK_ID) return
  const orders = readLinkOrders()
  const txns = readLinkTxns()
  const mine = orders.find((order) => order.paymentLinkId === link.id && !order.cancelled)
  const untouched = mine && !txns.some((txn) => txn.orderNo === mine.orderNo)
  if (!mine && needsUpfrontOrder(link)) {
    writeAll([orderFor(link, 'link', link.userId), ...orders], txns)
  } else if (mine && untouched && !needsUpfrontOrder(link)) {
    writeAll(orders.filter((order) => order !== mine), txns)
  } else if (mine && untouched) {
    const fresh = orderFor(link, mine.origin, link.userId)
    writeAll(orders.map((order) => (order === mine ? { ...mine, skuId: fresh.skuId, skuName: fresh.skuName, payable: fresh.payable, currency: fresh.currency, userId: link.userId } : order)), txns)
  }
}

/** When the balance must be paid by. Null until the first payment has landed, and once the balance is paid. */
export function balanceDeadline(link: PaymentLink, txns: LinkTxn[]): string | null {
  if (link.kind !== 'deposit') return null
  const first = paidTxn(txns, 'DEPOSIT_FIRST')
  if (!first?.paidAt || paidTxn(txns, 'DEPOSIT_BALANCE')) return null
  if (link.balanceDueAt) return link.balanceDueAt
  const due = new Date(parseTime(first.paidAt))
  due.setDate(due.getDate() + (link.balanceDueDays || DEFAULT_BALANCE_DUE_DAYS))
  return stamp(due)
}

export function balanceOverdue(link: PaymentLink, txns: LinkTxn[]) {
  const due = balanceDeadline(link, txns)
  return !!due && link.status === 'ACTIVE' && parseTime(due) < Date.now()
}

export function setBalanceDeadline(id: string, dueAt: string) {
  writePaymentLinks(readPaymentLinks().map((link) => (link.id === id ? { ...link, balanceDueAt: dueAt, updatedAt: now().slice(0, 16) } : link)))
}

/** Which payment the link is collecting now; null when nothing more can be paid. */
export function currentStage(link: PaymentLink, txns: LinkTxn[]): PayStage | null {
  if (link.status === 'VOID' || isExpired(link)) return null
  if (link.audience === 'open') return 'FULL'
  if (link.kind === 'full') return paidTxn(txns, 'FULL') ? null : 'FULL'
  if (!paidTxn(txns, 'DEPOSIT_FIRST')) return 'DEPOSIT_FIRST'
  if (paidTxn(txns, 'DEPOSIT_BALANCE') || balanceOverdue(link, txns)) return null
  return 'DEPOSIT_BALANCE'
}

export function stageAmount(link: PaymentLink, stage: PayStage, offer: LinkOffer | undefined, txns: LinkTxn[]) {
  if (stage === 'FULL') return offer?.payable ?? link.payable
  if (stage === 'DEPOSIT_FIRST') return link.amount
  return Math.max(link.payable - (paidTxn(txns, 'DEPOSIT_FIRST')?.amount ?? link.amount), 0)
}

export function stageMethods(link: PaymentLink, stage: PayStage) {
  return stage === 'DEPOSIT_BALANCE' ? (link.balanceMethods || link.methods) : link.methods
}

/**
 * The customer pressed pay (or picked bank transfer). Finds or creates the order, then the transaction;
 * an open attempt with the same method is reused. Amount comes from the link, not the page.
 */
export function startCheckout(linkId: string, detail: { stage: PayStage; skuId?: string; method: string; userId?: string }) {
  const link = findPaymentLink(linkId)
  if (!link || linkId === PREVIEW_LINK_ID) return undefined
  let orders = readLinkOrders()
  let txns = readLinkTxns()
  const linkTxns = txnsOfLink(linkId, txns)
  if (currentStage(link, linkTxns) !== detail.stage) return undefined
  const userId = link.audience === 'open' ? detail.userId : link.userId
  if (!userId) return undefined
  const offer = link.offers.find((item) => item.skuId === detail.skuId) || link.offers[0]
  let order = ordersOfLink(linkId, orders).find((item) => !item.cancelled && item.userId === userId
    && (link.audience === 'user' || orderState(item, txns).state === 'PENDING'))
  if (!order) {
    order = orderFor(link, link.audience === 'user' && needsUpfrontOrder(link) ? 'link' : 'checkout', userId, offer?.skuId)
    orders = [order, ...orders]
  } else if (!order.skuId && offer) {
    const picked = orderFor(link, order.origin, userId, offer.skuId)
    order = { ...order, skuId: picked.skuId, skuName: picked.skuName, payable: picked.payable, currency: picked.currency }
    const fixed = order
    orders = orders.map((item) => (item.orderNo === fixed.orderNo ? fixed : item))
  }
  const reuse = txns.find((txn) => txn.orderNo === order.orderNo && txn.status === 'PENDING' && txn.payStage === detail.stage && txn.method === detail.method)
  if (reuse) {
    writeAll(orders, txns)
    return { order, txn: reuse }
  }
  const txnId = newTxnId()
  const txn: LinkTxn = {
    txnId,
    orderNo: order.orderNo,
    paymentLinkId: linkId,
    payStage: detail.stage,
    amount: stageAmount(link, detail.stage, offer, linkTxns),
    currency: order.currency || offer?.currency || link.currency,
    method: detail.method,
    transferReference: detail.method === 'bank_transfer' ? transferReference(txnId) : undefined,
    status: 'PENDING',
    createdAt: now(),
  }
  txns = [txn, ...txns]
  writeAll(orders, txns)
  return { order, txn }
}

/** Customer says they transferred. The transaction stays PENDING until a CC manager matches it to the bank statement. */
export function declareTransfer(txnId: string) {
  writeAll(readLinkOrders(), readLinkTxns().map((txn) => (txn.txnId === txnId && txn.status === 'PENDING' ? { ...txn, declaredAt: txn.declaredAt || now() } : txn)))
}

/** Third-party callback succeeded, or a manager confirmed the transfer. Other open attempts on the same payment fail. */
export function completeTxn(txnId: string) {
  const txns = readLinkTxns()
  const target = txns.find((txn) => txn.txnId === txnId)
  if (!target || target.status !== 'PENDING') return target
  const paidAt = now()
  const next = txns.map((txn) => {
    if (txn.txnId === txnId) {
      return { ...txn, status: 'SUCCESS' as const, paidAt, providerRef: txn.method === 'bank_transfer' ? undefined : providerRef(txn.method) }
    }
    const superseded = txn.orderNo === target.orderNo && txn.payStage === target.payStage && txn.status === 'PENDING'
    return superseded ? { ...txn, status: 'FAILED' as const, failReason: '已用其他方式付款' } : txn
  })
  writeAll(readLinkOrders(), next)
  return next.find((txn) => txn.txnId === txnId)
}

/** The provider reported a failure, or the customer abandoned the provider page. */
export function failTxn(txnId: string, reason = '支付失败') {
  writeAll(readLinkOrders(), readLinkTxns().map((txn) => (txn.txnId === txnId && txn.status === 'PENDING' ? { ...txn, status: 'FAILED', failReason: reason } : txn)))
}

/**
 * CC manager confirms a bank transfer for the payment the link is collecting. Uses the customer's pending
 * bank transaction when there is one; otherwise records a bank transaction on the order directly.
 */
export function confirmBankPayment(linkId: string, skuId?: string) {
  const link = findPaymentLink(linkId)
  if (!link) return undefined
  const linkTxns = txnsOfLink(linkId)
  const stage = currentStage(link, linkTxns)
  if (!stage) return undefined
  const pending = linkTxns.filter((txn) => txn.payStage === stage && txn.status === 'PENDING' && txn.method === 'bank_transfer')
  const target = pending.find((txn) => txn.declaredAt) || pending[0]
  if (target) return completeTxn(target.txnId)
  const started = startCheckout(linkId, { stage, skuId, method: 'bank_transfer' })
  return started ? completeTxn(started.txn.txnId) : undefined
}

export function voidPaymentLink(id: string) {
  writePaymentLinks(readPaymentLinks().map((link) => (link.id === id ? { ...link, status: 'VOID', updatedAt: now().slice(0, 16) } : link)))
  const txns = readLinkTxns().map((txn) => (txn.paymentLinkId === id && txn.status === 'PENDING' ? { ...txn, status: 'FAILED' as const, failReason: '链接已作废' } : txn))
  const orders = readLinkOrders().map((order) => (order.paymentLinkId === id && orderState(order, txns).paid === 0 ? { ...order, cancelled: true } : order))
  writeAll(orders, txns)
}

const TXN_STATUS: Record<TxnStatus, OrderTransaction['status']> = { PENDING: '待支付', SUCCESS: '已支付', FAILED: '支付失败' }
const ORDER_STATUS: Record<OrderState, OrderStatus> = { PENDING: '待支付', PARTIALLY_PAID: '部分付款', COMPLETED: '已支付', CANCELLED: '已取消' }
const STAGE_EVENT: Record<PayStage, string> = { FULL: '全款', DEPOSIT_FIRST: '定金首款', DEPOSIT_BALANCE: '定金尾款' }

/** Order center: one row per web order, its transactions underneath. */
function centerOrders(orders: WebOrder[], txns: LinkTxn[]): Order[] {
  return orders.map((order) => {
    const mine = txns.filter((txn) => txn.orderNo === order.orderNo)
    const { state, paid, paidAt } = orderState(order, txns)
    const transactions: OrderTransaction[] = mine.map((txn) => ({
      id: txn.txnId,
      time: txn.paidAt || txn.createdAt,
      event: STAGE_EVENT[txn.payStage],
      payStage: txn.payStage,
      status: TXN_STATUS[txn.status],
      amount: txn.amount,
      paymentMethod: txn.method,
      channelRef: txn.providerRef || txn.transferReference,
      note: txn.status === 'PENDING' && txn.declaredAt ? `用户已声明转账 ${txn.declaredAt}` : txn.failReason,
    }))
    const sortKey = [order.createdAt, ...mine.map((txn) => txn.paidAt || txn.createdAt)].sort().pop() || ''
    return {
      sortKey,
      order: {
        orderId: order.orderNo,
        productName: order.skuName || '待用户选择 SKU',
        studentId: order.userId || '',
        userStatus: state === 'COMPLETED' ? '付费' : '未付费-体验中',
        orderStatus: ORDER_STATUS[state],
        originalPrice: order.payable,
        paidAmount: paid,
        payMethod: 'Payment Link',
        currency: order.currency,
        paidTime: paidAt,
        paymentLinkId: order.paymentLinkId,
        transactions,
      } as Order,
    }
  })
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .map((item) => item.order)
}

export function syncOrderCenter(orders = readLinkOrders(), txns = readLinkTxns()) {
  const built = centerOrders(orders, txns)
  setState((prev) => ({ ...prev, orders: [...built, ...prev.orders.filter((order) => order.payMethod !== 'Payment Link')] }))
}

function offer(skuId: string, skuName: string, memberLevel: 'Pro' | 'Max', listPrice: number, payable: number, currency: string, ruleLabel: string): LinkOffer {
  return { skuId, skuName, memberLevel, listPrice, payable, currency, ruleLabel }
}

function seedLink(row: Omit<PaymentLink, 'url' | 'status' | 'skuId' | 'skuName' | 'currency' | 'listPrice'> & { status?: PaymentLink['status'] }): PaymentLink {
  return {
    ...row,
    status: row.status || 'ACTIVE',
    skuId: row.offers.map((item) => item.skuId).join(','),
    skuName: row.offers.map((item) => item.skuName).join(' / '),
    currency: row.offers[0]?.currency || '',
    listPrice: row.offers[0]?.listPrice || 0,
    url: payLinkUrl(row.id),
  }
}

function seed(): { links: PaymentLink[]; orders: WebOrder[]; txns: LinkTxn[] } {
  const shift = (hours: number) => stamp(new Date(Date.now() + hours * 3_600_000))
  const kr = [
    offer('KR-Q-2026', 'Pro Quarterly', 'Pro', 99000, 89100, 'KRW', '10% off'),
    offer('KR-H-2026', 'Max 6 Months', 'Max', 178000, 178000, 'KRW', 'List price'),
    offer('KR-Y-2026', 'Pro Yearly', 'Pro', 298000, 248000, 'KRW', 'Amount off 50,000 KRW'),
    offer('KR-MY-2026', 'Max Yearly', 'Max', 398000, 338300, 'KRW', '15% off'),
  ]
  const vn = [offer('VN-Q-2026', 'Pro Quarterly', 'Pro', 990000, 891000, 'VND', '10% off')]
  const th = [offer('TH-Q-2026', 'Pro Quarterly', 'Pro', 9900, 9900, 'THB', 'List price')]
  const amy = { line: 'Korea', channelId: 'sales_amy_zhang', channelName: 'Amy Zhang', channelCode: 'CH-KR-0001', planId: 'CSP-AMY', promoCode: 'CSP-AMY-PROMO' }
  const linh = { line: 'Vietnam', channelId: 'sales_linh_nguyen', channelName: 'Linh Nguyen', channelCode: 'CH-VN-0005', planId: 'CSP-LINH', promoCode: 'CSP-LINH-PROMO' }
  const bkk = { line: 'Thailand', channelId: 'th_ground', channelName: 'Bangkok Ground Team', channelCode: 'CH-TH-0001', planId: 'CSP-TH', promoCode: '' }
  const links: PaymentLink[] = [
    seedLink({ id: 'PL-DEP-TH', kind: 'deposit', audience: 'user', userId: '2060199610824355848', ...bkk, offers: th, payable: 9900, amount: 990, methods: ['KPLUS'], balanceDueDays: 7, balanceDueAt: `${shift(30).slice(0, 13)}:00:00`, createdAt: '2026-10-28 11:05', updatedAt: '2026-10-28 15:40' }),
    seedLink({ id: 'PL-DEP-VN', kind: 'deposit', audience: 'user', userId: '2090031938694049793', ...linh, offers: vn, payable: 891000, amount: 500000, methods: ['vietqr', 'bank_transfer'], balanceDueDays: 7, createdAt: '2026-10-27 18:30', updatedAt: '2026-10-28 16:05' }),
    seedLink({ id: 'PL-DEP-READY', kind: 'deposit', audience: 'user', userId: '2060199610824356009', ...linh, offers: vn, payable: 891000, amount: 500000, methods: ['vietqr', 'bank_transfer'], balanceDueDays: 7, createdAt: '2026-10-28 09:15', updatedAt: '2026-10-28 09:40' }),
    seedLink({ id: 'PL-DEP-LATE', kind: 'deposit', audience: 'user', userId: '2060199610824356004', ...linh, offers: vn, payable: 891000, amount: 500000, methods: ['vietqr', 'bank_transfer'], balanceDueDays: 7, createdAt: shift(-218).slice(0, 16), updatedAt: shift(-216).slice(0, 16) }),
    seedLink({ id: 'PL-DEP-NEW', kind: 'deposit', audience: 'user', userId: '2060199610824355844', ...linh, offers: vn, payable: 891000, amount: 500000, methods: ['bank_transfer'], balanceDueDays: 3, createdAt: '2026-10-28 16:20', updatedAt: '2026-10-28 16:20' }),
    seedLink({ id: 'PL-FULL-BANK', kind: 'full', audience: 'user', userId: '2090031938694049794', ...linh, offers: vn, payable: 891000, amount: 0, methods: ['bank_transfer'], createdAt: '2026-10-28 13:05', updatedAt: '2026-10-28 13:22' }),
    seedLink({ id: 'PL-FULL-PAID', kind: 'full', audience: 'user', userId: '2060199610824355846', ...amy, offers: [kr[0]], payable: 89100, amount: 0, methods: ['card', 'kakaopay'], createdAt: '2026-10-27 16:00', updatedAt: '2026-10-27 16:20' }),
    seedLink({ id: 'PL-OPEN-KR', kind: 'full', audience: 'open', ...amy, channelId: 'kr_expo', channelName: 'Korea Offline Expo', channelCode: 'CH-KR-EXPO', offers: kr.slice(0, 2), payable: 0, amount: 0, methods: ['card', 'kakaopay'], eventName: 'Seoul Edu Expo 2026 · Booth B12', validUntil: '2026-11-30', createdAt: '2026-10-25 09:00', updatedAt: '2026-10-27 11:40' }),
    seedLink({ id: 'PL-FULL-WAIT', kind: 'full', audience: 'user', userId: '2060199610824355842', ...amy, offers: kr, payable: 0, amount: 0, methods: ['card', 'kakaopay'], createdAt: '2026-10-28 10:12', updatedAt: '2026-10-28 10:12' }),
  ]
  const lead = 'sales.lead@dinoai.ai'
  const cc = 'sales.kr@dinoai.ai'
  const ops = 'ops.vn@dinoai.ai'
  const audit: Record<string, { by: string; log: [string, string, string, string?][] }> = {
    'PL-DEP-TH': { by: cc, log: [[cc, '新建定金链接', '首款 990 THB，尾款 8,910 THB，尾款期限 7 天'], [lead, '调整尾款截止', `首款后 7 天 → ${links[0].balanceDueAt?.slice(0, 16)}`, '2026-10-28 15:40']] },
    'PL-DEP-VN': { by: cc, log: [[cc, '新建定金链接', '首款 500,000 VND，尾款 391,000 VND，尾款期限 7 天'], [ops, '确认尾款到账', 'TXN-261028-VB02 · 391,000 VND，开通会员', '2026-10-28 16:05']] },
    'PL-DEP-READY': { by: lead, log: [[lead, '新建定金链接', '首款 500,000 VND，尾款 391,000 VND，尾款期限 7 天'], [lead, '添加会员', '2060199610824356009 · 7 天体验']] },
    'PL-DEP-LATE': { by: cc, log: [[cc, '新建定金链接', '首款 500,000 VND，尾款 391,000 VND，尾款期限 7 天']] },
    'PL-DEP-NEW': { by: cc, log: [[cc, '新建定金链接', '首款 500,000 VND，尾款 391,000 VND，尾款期限 3 天']] },
    'PL-FULL-BANK': { by: cc, log: [[cc, '新建全款链接', '1 个 SKU · Bank transfer']] },
    'PL-FULL-PAID': { by: cc, log: [[cc, '新建全款链接', '1 个 SKU · Card、Kakao Pay']] },
    'PL-OPEN-KR': { by: lead, log: [[lead, '新建通用链接', 'Seoul Edu Expo 2026 · Booth B12，有效期至 2026-11-30'], [lead, '修改支付方式', '全款：Card、Kakao Pay', '2026-10-27 11:40']] },
    'PL-FULL-WAIT': { by: cc, log: [[cc, '新建全款链接', '4 个 SKU · Card、Kakao Pay']] },
  }
  links.forEach((link, index) => {
    const meta = audit[link.id]
    if (!meta) return
    links[index] = {
      ...link,
      createdBy: meta.by,
      history: meta.log.map(([actor, action, detail, at], step) => historyEntry(actor, action, detail, at || (step === 0 ? `${link.createdAt}:00` : `${link.updatedAt}:00`))),
    }
  })
  const thSku = { userId: '2060199610824355848', skuId: 'TH-Q-2026', skuName: 'Pro · Pro Quarterly', payable: 9900, currency: 'THB' }
  const vnSku = { skuId: 'VN-Q-2026', skuName: 'Pro · Pro Quarterly', payable: 891000, currency: 'VND' }
  const krQ = { skuId: 'KR-Q-2026', skuName: 'Pro · Pro Quarterly', payable: 89100, currency: 'KRW' }
  const krH = { skuId: 'KR-H-2026', skuName: 'Max · Max 6 Months', payable: 178000, currency: 'KRW' }
  const orders: WebOrder[] = [
    { orderNo: 'WEB-261028-TH01', paymentLinkId: 'PL-DEP-TH', ...thSku, origin: 'checkout', createdAt: '2026-10-28 11:18:40' },
    { orderNo: 'WEB-261027-VN01', paymentLinkId: 'PL-DEP-VN', userId: '2090031938694049793', ...vnSku, origin: 'link', createdAt: '2026-10-27 18:30:00' },
    { orderNo: 'WEB-261028-RD01', paymentLinkId: 'PL-DEP-READY', userId: '2060199610824356009', ...vnSku, origin: 'link', createdAt: '2026-10-28 09:15:00' },
    { orderNo: 'WEB-261020-LT01', paymentLinkId: 'PL-DEP-LATE', userId: '2060199610824356004', ...vnSku, origin: 'link', createdAt: `${shift(-218).slice(0, 16)}:00` },
    { orderNo: 'WEB-261028-NW01', paymentLinkId: 'PL-DEP-NEW', userId: '2060199610824355844', ...vnSku, origin: 'link', createdAt: '2026-10-28 16:20:00' },
    { orderNo: 'WEB-261028-BK01', paymentLinkId: 'PL-FULL-BANK', userId: '2090031938694049794', ...vnSku, origin: 'link', createdAt: '2026-10-28 13:05:00' },
    { orderNo: 'WEB-261027-KP01', paymentLinkId: 'PL-FULL-PAID', userId: '2060199610824355846', ...krQ, origin: 'checkout', createdAt: '2026-10-27 16:15:00' },
    { orderNo: 'WEB-261028-EX03', paymentLinkId: 'PL-OPEN-KR', userId: '2060199610824356011', ...krH, origin: 'checkout', createdAt: '2026-10-28 10:05:00' },
    { orderNo: 'WEB-261027-EX02', paymentLinkId: 'PL-OPEN-KR', userId: '2060199610824355846', ...krH, origin: 'checkout', createdAt: '2026-10-27 11:38:00' },
    { orderNo: 'WEB-261026-EX01', paymentLinkId: 'PL-OPEN-KR', userId: '2060199610824356004', ...krQ, origin: 'checkout', createdAt: '2026-10-26 14:10:00' },
  ]
  const t = (row: Omit<LinkTxn, 'status' | 'currency'> & { status?: TxnStatus }): LinkTxn => ({
    status: row.status || 'SUCCESS',
    currency: orders.find((order) => order.orderNo === row.orderNo)?.currency || 'VND',
    ...row,
  })
  const txns: LinkTxn[] = [
    t({ txnId: 'TXN-261028-TB02', orderNo: 'WEB-261028-TH01', paymentLinkId: 'PL-DEP-TH', payStage: 'DEPOSIT_BALANCE', amount: 8910, method: 'KPLUS', status: 'PENDING', createdAt: '2026-10-28 15:42:10' }),
    t({ txnId: 'TXN-261028-TF01', orderNo: 'WEB-261028-TH01', paymentLinkId: 'PL-DEP-TH', payStage: 'DEPOSIT_FIRST', amount: 990, method: 'KPLUS', providerRef: 'KPLUS-28112033TH', createdAt: '2026-10-28 11:18:40', paidAt: '2026-10-28 11:20:00' }),
    t({ txnId: 'TXN-261028-VB02', orderNo: 'WEB-261027-VN01', paymentLinkId: 'PL-DEP-VN', payStage: 'DEPOSIT_BALANCE', amount: 391000, method: 'bank_transfer', transferReference: 'DINO261028VB02', declaredAt: '2026-10-28 15:30:00', createdAt: '2026-10-28 15:21:00', paidAt: '2026-10-28 16:05:00' }),
    t({ txnId: 'TXN-261027-VF01', orderNo: 'WEB-261027-VN01', paymentLinkId: 'PL-DEP-VN', payStage: 'DEPOSIT_FIRST', amount: 500000, method: 'vietqr', providerRef: 'VIETQR-27184802VN', createdAt: '2026-10-27 18:45:00', paidAt: '2026-10-27 18:48:00' }),
    t({ txnId: 'TXN-261028-RF01', orderNo: 'WEB-261028-RD01', paymentLinkId: 'PL-DEP-READY', payStage: 'DEPOSIT_FIRST', amount: 500000, method: 'vietqr', providerRef: 'VIETQR-28094007VN', createdAt: shift(-26), paidAt: shift(-26) }),
    t({ txnId: 'TXN-261020-LF01', orderNo: 'WEB-261020-LT01', paymentLinkId: 'PL-DEP-LATE', payStage: 'DEPOSIT_FIRST', amount: 500000, method: 'vietqr', providerRef: 'VIETQR-20151102VN', createdAt: shift(-216), paidAt: shift(-216) }),
    t({ txnId: 'TXN-261028-BK01', orderNo: 'WEB-261028-BK01', paymentLinkId: 'PL-FULL-BANK', payStage: 'FULL', amount: 891000, method: 'bank_transfer', transferReference: 'DINO261028BK01', declaredAt: '2026-10-28 13:22:00', status: 'PENDING', createdAt: '2026-10-28 13:12:00' }),
    t({ txnId: 'TXN-261027-KF00', orderNo: 'WEB-261027-KP01', paymentLinkId: 'PL-FULL-PAID', payStage: 'FULL', amount: 89100, method: 'kakaopay', status: 'FAILED', failReason: '支付失败', createdAt: '2026-10-27 16:15:00' }),
    t({ txnId: 'TXN-261027-KP01', orderNo: 'WEB-261027-KP01', paymentLinkId: 'PL-FULL-PAID', payStage: 'FULL', amount: 89100, method: 'card', providerRef: 'CARD-27162011KR', createdAt: '2026-10-27 16:18:00', paidAt: '2026-10-27 16:20:00' }),
    t({ txnId: 'TXN-261028-EX03', orderNo: 'WEB-261028-EX03', paymentLinkId: 'PL-OPEN-KR', payStage: 'FULL', amount: 178000, method: 'card', status: 'PENDING', createdAt: '2026-10-28 10:05:00' }),
    t({ txnId: 'TXN-261027-EX02', orderNo: 'WEB-261027-EX02', paymentLinkId: 'PL-OPEN-KR', payStage: 'FULL', amount: 178000, method: 'card', providerRef: 'CARD-27114033KR', createdAt: '2026-10-27 11:38:00', paidAt: '2026-10-27 11:40:00' }),
    t({ txnId: 'TXN-261026-EX01', orderNo: 'WEB-261026-EX01', paymentLinkId: 'PL-OPEN-KR', payStage: 'FULL', amount: 89100, method: 'kakaopay', providerRef: 'KAKAO-26141209KR', createdAt: '2026-10-26 14:10:00', paidAt: '2026-10-26 14:12:00' }),
  ]
  return { links, orders, txns }
}

/** First run on this storage version: write demo links, orders and transactions, drop older demo data. */
export function ensurePaymentLinkData() {
  if (localStorage.getItem(PAYMENT_LINK_KEY) === null) {
    const { links, orders, txns } = seed()
    writePaymentLinks(links)
    localStorage.setItem(LINK_ORDER_KEY, JSON.stringify(orders))
    localStorage.setItem(LINK_TXN_KEY, JSON.stringify(txns))
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key))
  }
  syncOrderCenter()
}
