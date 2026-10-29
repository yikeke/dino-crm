import { setState } from './store'
import type { Order, OrderStatus, OrderTransaction } from './types'
import type { LinkOffer } from './paymentLinkCatalog'

export const PAYMENT_LINK_KEY = 'dino-cc-payment-links-v4'
export const LINK_ORDER_KEY = 'dino-cc-link-orders-v1'
export const PREVIEW_LINK_KEY = 'dino-cc-payment-link-preview'
export const PREVIEW_LINK_ID = 'PL-PREVIEW'
const LEGACY_PAYMENT_LINK_KEYS = ['dino-cc-payment-links-v1', 'dino-cc-payment-links-v2', 'dino-cc-payment-links-v3']

export type PayStage = 'FULL' | 'DEPOSIT_FIRST' | 'DEPOSIT_BALANCE'
export type LinkOrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'

/** A payment link only holds what to charge. Payments live in web_order rows that point back to it. */
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
  eventName?: string
  validUntil?: string
  status: 'ACTIVE' | 'VOID'
  url: string
  createdAt: string
  updatedAt: string
  createdBy?: string
}

/** One web_order. It is created when the customer picks a method and starts paying, so it always has one method. */
export type LinkOrder = {
  orderNo: string
  paymentLinkId: string
  payStage: PayStage
  parentOrderNo?: string
  userId: string
  skuId: string
  skuName: string
  originalAmount: number
  payAmount: number
  currency: string
  method: string
  transferReference?: string
  providerRef?: string
  declaredAt?: string
  status: LinkOrderStatus
  createdAt: string
  paidAt?: string
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

export function readLinkOrders(): LinkOrder[] {
  return readJson<LinkOrder>(LINK_ORDER_KEY)
}

function writeLinkOrders(orders: LinkOrder[]) {
  localStorage.setItem(LINK_ORDER_KEY, JSON.stringify(orders))
  syncOrderCenter(orders)
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

export function payLinkUrl(id: string) {
  const root = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${root}/#/lp/pay-link?link=${encodeURIComponent(id)}`
}

export function now() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function newOrderNo() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `WEB-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

export function transferReference(orderNo: string) {
  return `DINO${orderNo.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`
}

function providerRef(method: string) {
  const prefix = method.replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase() || 'PSP'
  return `${prefix}-${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
}

export function isExpired(link: PaymentLink) {
  return !!link.validUntil && link.validUntil < now().slice(0, 10)
}

/** Which payment the link is collecting now; null when nothing more can be paid. */
export function currentStage(link: PaymentLink, orders: LinkOrder[]): PayStage | null {
  if (link.status === 'VOID' || isExpired(link)) return null
  const paid = (stage: PayStage) => orders.find((order) => order.payStage === stage && order.status === 'COMPLETED')
  if (link.audience === 'open') return 'FULL'
  if (link.kind === 'full') return paid('FULL') ? null : 'FULL'
  if (!paid('DEPOSIT_FIRST')) return 'DEPOSIT_FIRST'
  return paid('DEPOSIT_BALANCE') ? null : 'DEPOSIT_BALANCE'
}

export function stageAmount(link: PaymentLink, stage: PayStage, offer: LinkOffer | undefined, orders: LinkOrder[]) {
  if (stage === 'FULL') return offer?.payable ?? link.payable
  if (stage === 'DEPOSIT_FIRST') return link.amount
  const first = orders.find((order) => order.payStage === 'DEPOSIT_FIRST' && order.status === 'COMPLETED')
  return Math.max(link.payable - (first?.payAmount ?? link.amount), 0)
}

export function stageMethods(link: PaymentLink, stage: PayStage) {
  return stage === 'DEPOSIT_BALANCE' ? (link.balanceMethods || link.methods) : link.methods
}

/**
 * The customer picked a method and pressed pay (or chose bank transfer). Creates the web_order,
 * or reuses this customer's open attempt with the same method. Amount comes from the link, not the page.
 */
export function startCheckout(linkId: string, detail: { stage: PayStage; skuId?: string; method: string; userId?: string }) {
  const link = findPaymentLink(linkId)
  if (!link || linkId === PREVIEW_LINK_ID) return undefined
  const all = readLinkOrders()
  const mine = ordersOfLink(linkId, all)
  if (currentStage(link, mine) !== detail.stage) return undefined
  const userId = link.audience === 'open' ? detail.userId : link.userId
  if (!userId) return undefined
  const reuse = mine.find((order) => order.status === 'PENDING' && order.payStage === detail.stage && order.userId === userId && order.method === detail.method)
  if (reuse) return reuse
  const offer = link.offers.find((item) => item.skuId === detail.skuId) || link.offers[0]
  const orderNo = newOrderNo()
  const order: LinkOrder = {
    orderNo,
    paymentLinkId: linkId,
    payStage: detail.stage,
    parentOrderNo: detail.stage === 'DEPOSIT_BALANCE'
      ? mine.find((item) => item.payStage === 'DEPOSIT_FIRST' && item.status === 'COMPLETED')?.orderNo
      : undefined,
    userId,
    skuId: offer?.skuId || link.skuId,
    skuName: `${offer?.memberLevel || 'Pro'} · ${offer?.skuName || link.skuName}`,
    originalAmount: offer?.payable ?? link.payable,
    payAmount: stageAmount(link, detail.stage, offer, mine),
    currency: offer?.currency || link.currency,
    method: detail.method,
    transferReference: detail.method === 'bank_transfer' ? transferReference(orderNo) : undefined,
    status: 'PENDING',
    createdAt: now(),
  }
  writeLinkOrders([order, ...all])
  return order
}

/** Customer says they transferred. The order stays PENDING until an admin matches it to the bank statement. */
export function declareTransfer(orderNo: string) {
  const all = readLinkOrders()
  writeLinkOrders(all.map((order) => (order.orderNo === orderNo && order.status === 'PENDING' ? { ...order, declaredAt: order.declaredAt || now() } : order)))
}

/** Third-party callback succeeded, or an admin confirmed the transfer. Only this order is written. */
export function completeOrder(orderNo: string) {
  const all = readLinkOrders()
  const target = all.find((order) => order.orderNo === orderNo)
  if (!target || target.status !== 'PENDING') return target
  const paidAt = now()
  const next = all.map((order) => {
    if (order.orderNo === orderNo) {
      return { ...order, status: 'COMPLETED' as const, paidAt, providerRef: order.method === 'bank_transfer' ? undefined : providerRef(order.method) }
    }
    const abandoned = order.paymentLinkId === target.paymentLinkId && order.payStage === target.payStage
      && order.userId === target.userId && order.status === 'PENDING'
    return abandoned ? { ...order, status: 'CANCELLED' as const } : order
  })
  writeLinkOrders(next)
  return next.find((order) => order.orderNo === orderNo)
}

export function voidPaymentLink(id: string) {
  writePaymentLinks(readPaymentLinks().map((link) => (link.id === id ? { ...link, status: 'VOID', updatedAt: now().slice(0, 16) } : link)))
  writeLinkOrders(readLinkOrders().map((order) => (order.paymentLinkId === id && order.status === 'PENDING' ? { ...order, status: 'CANCELLED' } : order)))
}

const TXN_STATUS: Record<LinkOrderStatus, OrderStatus> = { PENDING: '待支付', COMPLETED: '已支付', CANCELLED: '已取消' }
const STAGE_EVENT: Record<PayStage, string> = { FULL: '全款', DEPOSIT_FIRST: '定金首款', DEPOSIT_BALANCE: '定金尾款' }

/** Order center view: group web_orders by COALESCE(parent_order_no, order_no). Nothing is written back to the orders. */
function mainOrders(orders: LinkOrder[]): Order[] {
  const groups = new Map<string, LinkOrder[]>()
  orders.forEach((order) => {
    const key = order.parentOrderNo || order.orderNo
    groups.set(key, [...(groups.get(key) || []), order])
  })
  return Array.from(groups.entries()).map(([key, items]) => {
    const root = items.find((item) => item.orderNo === key) || items[0]
    const paid = items.filter((item) => item.status === 'COMPLETED')
    const paidAmount = paid.reduce((sum, item) => sum + item.payAmount, 0)
    const settled = paidAmount >= root.originalAmount && paid.length > 0
    const orderStatus: OrderStatus = settled ? '已支付' : paidAmount > 0 ? '部分付款' : items.every((item) => item.status === 'CANCELLED') ? '已取消' : '待支付'
    const transactions: OrderTransaction[] = items.map((item) => ({
      id: item.orderNo,
      time: item.paidAt || item.createdAt,
      event: STAGE_EVENT[item.payStage],
      payStage: item.payStage,
      status: TXN_STATUS[item.status],
      amount: item.payAmount,
      paymentMethod: item.method,
      channelRef: item.providerRef || item.transferReference,
      note: item.declaredAt && item.status === 'PENDING' ? `用户已声明转账 ${item.declaredAt}` : undefined,
    }))
    const order: Order & { sortKey: string } = {
      orderId: key,
      productName: root.skuName,
      studentId: root.userId,
      userStatus: settled ? '付费' : '未付费-体验中',
      orderStatus,
      originalPrice: root.originalAmount,
      paidAmount,
      payMethod: 'Payment Link',
      currency: root.currency,
      paidTime: settled ? paid.map((item) => item.paidAt || '').sort().pop() : undefined,
      paymentLinkId: root.paymentLinkId,
      transactions,
      sortKey: items.map((item) => item.paidAt || item.createdAt).sort().pop() || '',
    }
    return order
  })
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .map(({ sortKey: _sortKey, ...order }) => order)
}

export function syncOrderCenter(orders = readLinkOrders()) {
  const built = mainOrders(orders)
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

function seed(): { links: PaymentLink[]; orders: LinkOrder[] } {
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
    seedLink({ id: 'PL-DEP-TH', kind: 'deposit', audience: 'user', userId: '2060199610824355848', ...bkk, offers: th, payable: 9900, amount: 990, methods: ['KPLUS'], createdAt: '2026-10-28 11:05', updatedAt: '2026-10-28 15:40' }),
    seedLink({ id: 'PL-DEP-VN', kind: 'deposit', audience: 'user', userId: '2090031938694049793', ...linh, offers: vn, payable: 891000, amount: 500000, methods: ['vietqr', 'bank_transfer'], createdAt: '2026-10-27 18:30', updatedAt: '2026-10-28 16:05' }),
    seedLink({ id: 'PL-DEP-READY', kind: 'deposit', audience: 'user', userId: '2060199610824356009', ...linh, offers: vn, payable: 891000, amount: 500000, methods: ['vietqr', 'bank_transfer'], createdAt: '2026-10-28 09:15', updatedAt: '2026-10-28 09:40' }),
    seedLink({ id: 'PL-DEP-NEW', kind: 'deposit', audience: 'user', userId: '2060199610824355844', ...linh, offers: vn, payable: 891000, amount: 500000, methods: ['bank_transfer'], createdAt: '2026-10-28 16:20', updatedAt: '2026-10-28 16:20' }),
    seedLink({ id: 'PL-FULL-BANK', kind: 'full', audience: 'user', userId: '2090031938694049794', ...linh, offers: vn, payable: 891000, amount: 0, methods: ['bank_transfer'], createdAt: '2026-10-28 13:05', updatedAt: '2026-10-28 13:22' }),
    seedLink({ id: 'PL-FULL-PAID', kind: 'full', audience: 'user', userId: '2060199610824355846', ...amy, offers: [kr[0]], payable: 89100, amount: 0, methods: ['card', 'kakaopay'], createdAt: '2026-10-27 16:00', updatedAt: '2026-10-27 16:20' }),
    seedLink({ id: 'PL-OPEN-KR', kind: 'full', audience: 'open', ...amy, channelId: 'kr_expo', channelName: 'Korea Offline Expo', channelCode: 'CH-KR-EXPO', offers: kr.slice(0, 2), payable: 0, amount: 0, methods: ['card', 'kakaopay'], eventName: 'Seoul Edu Expo 2026 · Booth B12', validUntil: '2026-11-30', createdAt: '2026-10-25 09:00', updatedAt: '2026-10-27 11:40' }),
    seedLink({ id: 'PL-FULL-WAIT', kind: 'full', audience: 'user', userId: '2060199610824355842', ...amy, offers: kr, payable: 0, amount: 0, methods: ['card', 'kakaopay'], createdAt: '2026-10-28 10:12', updatedAt: '2026-10-28 10:12' }),
  ]
  const o = (row: Omit<LinkOrder, 'currency' | 'status'> & { status?: LinkOrderStatus; currency?: string }): LinkOrder => ({
    currency: row.currency || (row.skuId.startsWith('KR') ? 'KRW' : row.skuId.startsWith('TH') ? 'THB' : 'VND'),
    status: row.status || 'COMPLETED',
    ...row,
  })
  const orders: LinkOrder[] = [
    o({ orderNo: 'WEB-261028-TB02', paymentLinkId: 'PL-DEP-TH', payStage: 'DEPOSIT_BALANCE', parentOrderNo: 'WEB-261028-TF01', userId: '2060199610824355848', skuId: 'TH-Q-2026', skuName: 'Pro · Pro Quarterly', originalAmount: 9900, payAmount: 8910, method: 'KPLUS', status: 'PENDING', createdAt: '2026-10-28 15:42:10' }),
    o({ orderNo: 'WEB-261028-TF01', paymentLinkId: 'PL-DEP-TH', payStage: 'DEPOSIT_FIRST', userId: '2060199610824355848', skuId: 'TH-Q-2026', skuName: 'Pro · Pro Quarterly', originalAmount: 9900, payAmount: 990, method: 'KPLUS', providerRef: 'KPLUS-28112033TH', createdAt: '2026-10-28 11:18:40', paidAt: '2026-10-28 11:20:00' }),
    o({ orderNo: 'WEB-261028-VB02', paymentLinkId: 'PL-DEP-VN', payStage: 'DEPOSIT_BALANCE', parentOrderNo: 'WEB-261027-VF01', userId: '2090031938694049793', skuId: 'VN-Q-2026', skuName: 'Pro · Pro Quarterly', originalAmount: 891000, payAmount: 391000, method: 'bank_transfer', transferReference: 'DINO261028VB02', declaredAt: '2026-10-28 15:30:00', createdAt: '2026-10-28 15:21:00', paidAt: '2026-10-28 16:05:00' }),
    o({ orderNo: 'WEB-261027-VF01', paymentLinkId: 'PL-DEP-VN', payStage: 'DEPOSIT_FIRST', userId: '2090031938694049793', skuId: 'VN-Q-2026', skuName: 'Pro · Pro Quarterly', originalAmount: 891000, payAmount: 500000, method: 'vietqr', providerRef: 'VIETQR-27184802VN', createdAt: '2026-10-27 18:45:00', paidAt: '2026-10-27 18:48:00' }),
    o({ orderNo: 'WEB-261028-RF01', paymentLinkId: 'PL-DEP-READY', payStage: 'DEPOSIT_FIRST', userId: '2060199610824356009', skuId: 'VN-Q-2026', skuName: 'Pro · Pro Quarterly', originalAmount: 891000, payAmount: 500000, method: 'vietqr', providerRef: 'VIETQR-28094007VN', createdAt: '2026-10-28 09:36:00', paidAt: '2026-10-28 09:40:00' }),
    o({ orderNo: 'WEB-261028-BK01', paymentLinkId: 'PL-FULL-BANK', payStage: 'FULL', userId: '2090031938694049794', skuId: 'VN-Q-2026', skuName: 'Pro · Pro Quarterly', originalAmount: 891000, payAmount: 891000, method: 'bank_transfer', transferReference: 'DINO261028BK01', declaredAt: '2026-10-28 13:22:00', status: 'PENDING', createdAt: '2026-10-28 13:12:00' }),
    o({ orderNo: 'WEB-261027-KP01', paymentLinkId: 'PL-FULL-PAID', payStage: 'FULL', userId: '2060199610824355846', skuId: 'KR-Q-2026', skuName: 'Pro · Pro Quarterly', originalAmount: 89100, payAmount: 89100, method: 'card', providerRef: 'CARD-27162011KR', createdAt: '2026-10-27 16:18:00', paidAt: '2026-10-27 16:20:00' }),
    o({ orderNo: 'WEB-261028-EX03', paymentLinkId: 'PL-OPEN-KR', payStage: 'FULL', userId: '2060199610824356011', skuId: 'KR-H-2026', skuName: 'Max · Max 6 Months', originalAmount: 178000, payAmount: 178000, method: 'card', status: 'PENDING', createdAt: '2026-10-28 10:05:00' }),
    o({ orderNo: 'WEB-261027-EX02', paymentLinkId: 'PL-OPEN-KR', payStage: 'FULL', userId: '2060199610824355846', skuId: 'KR-H-2026', skuName: 'Max · Max 6 Months', originalAmount: 178000, payAmount: 178000, method: 'card', providerRef: 'CARD-27114033KR', createdAt: '2026-10-27 11:38:00', paidAt: '2026-10-27 11:40:00' }),
    o({ orderNo: 'WEB-261026-EX01', paymentLinkId: 'PL-OPEN-KR', payStage: 'FULL', userId: '2060199610824356004', skuId: 'KR-Q-2026', skuName: 'Pro · Pro Quarterly', originalAmount: 89100, payAmount: 89100, method: 'kakaopay', providerRef: 'KAKAO-26141209KR', createdAt: '2026-10-26 14:10:00', paidAt: '2026-10-26 14:12:00' }),
  ]
  return { links, orders }
}

/** First run on this storage version: write demo links and orders, drop the old one-link-per-payment data. */
export function ensurePaymentLinkData() {
  if (localStorage.getItem(PAYMENT_LINK_KEY) === null) {
    const { links, orders } = seed()
    writePaymentLinks(links)
    localStorage.setItem(LINK_ORDER_KEY, JSON.stringify(orders))
    LEGACY_PAYMENT_LINK_KEYS.forEach((key) => localStorage.removeItem(key))
  }
  syncOrderCenter()
}
