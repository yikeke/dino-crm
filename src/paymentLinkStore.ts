import { setState } from './store'
import type { Order } from './types'

export const PAYMENT_LINK_KEY = 'dino-cc-payment-links-v3'
export const LEGACY_PAYMENT_LINK_KEYS = ['dino-cc-payment-links-v1', 'dino-cc-payment-links-v2']

export type StoredPaymentLink = {
  id: string
  received?: boolean
  orderId?: string
  paidMethod?: string
  transferDeclared?: boolean
  paidNote?: string
  paymentProofName?: string
  userId?: string
  skuName?: string
  currency?: string
  amount?: number
  payable?: number
  offers?: { skuName?: string; memberLevel?: string; payable?: number; currency?: string }[]
  phone?: string
  customerName?: string
  kind?: string
  depositPlanId?: string
  sourceLinkId?: string
  audience?: 'user' | 'open'
  eventName?: string
  validUntil?: string
  payments?: OpenLinkPayment[]
}

/** One payment on an open link. Every payment is its own order, bound to the user who logged in. */
export type OpenLinkPayment = {
  orderId: string
  userId: string
  amount: number
  currency: string
  method: string
  paidAt: string
}

export function readPaymentLinks(): StoredPaymentLink[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PAYMENT_LINK_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function writePaymentLinks(links: StoredPaymentLink[]) {
  localStorage.setItem(PAYMENT_LINK_KEY, JSON.stringify(links))
}

/**
 * One payment link is one payment, which is one sub-order (web_order) derived from the link id.
 * Sub-orders of the same package share a main order whose id is the first sub-order's id,
 * the same way App renewals are grouped under original_transaction_id.
 */
export function subOrderNoFor(linkId: string) {
  return `WEB-${linkId.replace(/^PL-/i, '')}`
}

const LEGACY_DEMO_ORDER_IDS: Record<string, string> = {
  'WEB-PL-FULL-001': 'WEB-FULL-PAID',
  'WEB-PL-DEP-PART': 'WEB-DEP-READY',
  'WEB-PL-TH': 'WEB-DEP-TH',
  'WEB-PL-DEP-DONE': 'WEB-DEP-VN',
}

export function currentOrderId(orderId?: string) {
  return orderId ? LEGACY_DEMO_ORDER_IDS[orderId] || orderId : orderId
}

export function transferReference(linkId: string) {
  const tail = linkId.replace(/^PL-?/i, '').replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || 'PAYLINK'
  return `DINO${tail}`
}

function providerRef(method: string) {
  const prefix = method.replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase() || 'PSP'
  return `${prefix}-${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
}

function upgradeLinkOrder(order: Order): Order {
  if (order.payMethod !== 'Payment Link') return order
  const partial = order.paidAmount > 0 && order.paidAmount < order.originalPrice
  const orderStatus = partial && order.orderStatus === '待支付' ? '部分付款' : order.orderStatus
  const stale = orderStatus !== order.orderStatus
    || order.transactions.some((txn) => txn.status !== '已支付' || txn.id.startsWith('PAY-'))
  if (!stale) return order
  return {
    ...order,
    orderStatus,
    transactions: order.transactions.map((txn) => ({ ...txn, id: txn.id.replace(/^PAY-/, 'WEB-'), status: '已支付' })),
  }
}

/** Put the demo orders behind the seeded payment links, replacing demo orders stored under old ids. */
export function ensurePaymentLinkOrders(orders: Order[]) {
  setState((prev) => {
    const kept = prev.orders.filter((order) => !LEGACY_DEMO_ORDER_IDS[order.orderId])
    const known = new Set(kept.map((order) => order.orderId))
    const missing = orders.filter((order) => !known.has(order.orderId))
    const upgraded = kept.map(upgradeLinkOrder)
    const changed = missing.length > 0 || kept.length !== prev.orders.length || upgraded.some((order, index) => order !== kept[index])
    if (!changed) return prev
    return { ...prev, orders: [...missing, ...upgraded] }
  })
}

function paidTime() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** Customer says they transferred. Payment stays unpaid until CC confirms with a screenshot. */
export function declareBankTransfer(id: string) {
  if (!id) return
  const links = readPaymentLinks()
  const current = links.find((item) => item.id === id)
  if (!current || current.orderId) return current
  const next = links.map((item) => item.id === id
    ? { ...item, transferDeclared: true, paidMethod: 'bank_transfer' }
    : item)
  writePaymentLinks(next)
  return next.find((item) => item.id === id)
}

/** A payment link can be paid once. That payment creates one order in the order center. */
export function settlePaymentLink(id: string, detail: {
  methodName: string
  skuName: string
  amount: number
  currency: string
  userId?: string
  note?: string
  proofName?: string
  existingOrderId?: string
  packageAmount?: number
  leg?: 'full' | 'deposit_first' | 'deposit_balance'
}) {
  const links = readPaymentLinks()
  const current = links.find((item) => item.id === id)
  if (current?.audience === 'open') return settleOpenLink(current, links, detail)
  if (current?.orderId && detail.leg !== 'deposit_balance') return current
  const when = paidTime()
  const userId = detail.userId || current?.userId || 'PAYMENT-LINK-USER'
  const orderId = detail.existingOrderId || subOrderNoFor(id)
  const next = links.map((item) => item.id === id ? {
    ...item,
    received: true,
    orderId,
    paidMethod: detail.methodName,
    userId,
    paidNote: detail.note || '',
    paymentProofName: detail.proofName || '',
  } : item)
  if (!current) {
    next.unshift({ id, received: true, orderId, paidMethod: detail.methodName, userId, skuName: detail.skuName, amount: detail.amount, currency: detail.currency })
  }
  writePaymentLinks(next)
  const packageAmount = detail.packageAmount || detail.amount
  const partial = detail.leg === 'deposit_first' && detail.amount < packageAmount
  const txn = {
    id: subOrderNoFor(id),
    time: when,
    event: detail.leg === 'deposit_balance' ? '尾款支付成功' : detail.leg === 'deposit_first' ? '定金首款支付成功' : '支付成功',
    status: '已支付' as Order['orderStatus'],
    amount: detail.amount,
    paymentMethod: detail.methodName,
    channelRef: detail.methodName === 'bank_transfer' ? transferReference(id) : providerRef(detail.methodName),
    note: [detail.note, detail.proofName ? `截图 ${detail.proofName}` : '', `Payment link ${id}`].filter(Boolean).join(' · '),
  }
  setState((prev) => {
    if (detail.existingOrderId) {
      return {
        ...prev,
        orders: prev.orders.map((order) => order.orderId === detail.existingOrderId ? {
          ...order,
          paidAmount: order.paidAmount + detail.amount,
          orderStatus: '已支付',
          paidTime: when,
          transactions: [...order.transactions, txn],
        } : order),
      }
    }
    const order: Order = {
      orderId,
      productName: detail.skuName,
      studentId: userId,
      userStatus: partial ? '未付费-体验中' : '付费',
      orderStatus: partial ? '部分付款' : '已支付',
      originalPrice: packageAmount,
      paidAmount: detail.amount,
      payMethod: 'Payment Link',
      currency: detail.currency || 'USD',
      paidTime: partial ? undefined : when,
      transactions: [txn],
    }
    return { ...prev, orders: [order, ...prev.orders] }
  })
  return next.find((item) => item.id === id) || current
}

function settleOpenLink(link: StoredPaymentLink, links: StoredPaymentLink[], detail: {
  methodName: string
  skuName: string
  amount: number
  currency: string
  userId?: string
}) {
  const when = paidTime()
  const seq = (link.payments?.length || 0) + 1
  const orderId = `${subOrderNoFor(link.id)}-${String(seq).padStart(3, '0')}`
  const userId = detail.userId || 'PAYMENT-LINK-USER'
  const payment: OpenLinkPayment = { orderId, userId, amount: detail.amount, currency: detail.currency, method: detail.methodName, paidAt: when }
  writePaymentLinks(links.map((item) => (item.id === link.id ? { ...item, payments: [...(item.payments || []), payment] } : item)))
  const order: Order = {
    orderId,
    productName: detail.skuName,
    studentId: userId,
    userStatus: '付费',
    orderStatus: '已支付',
    originalPrice: detail.amount,
    paidAmount: detail.amount,
    payMethod: 'Payment Link',
    currency: detail.currency || 'USD',
    paidTime: when,
    transactions: [{
      id: orderId,
      time: when,
      event: '支付成功',
      status: '已支付',
      amount: detail.amount,
      paymentMethod: detail.methodName,
      channelRef: providerRef(detail.methodName),
      note: `Open payment link ${link.id}${link.eventName ? ` · ${link.eventName}` : ''}`,
    }],
  }
  setState((prev) => ({ ...prev, orders: [order, ...prev.orders] }))
  return { ...link, orderId }
}
