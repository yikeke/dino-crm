import { setState } from './store'
import type { Order } from './types'

export const PAYMENT_LINK_KEY = 'dino-cc-payment-links-v1'

export type StoredPaymentLink = {
  id: string
  received?: boolean
  orderId?: string
  paidMethod?: string
  userId?: string
  skuName?: string
  currency?: string
  amount?: number
  payable?: number
  offers?: { skuName?: string; memberLevel?: string; payable?: number; currency?: string }[]
  phone?: string
  customerName?: string
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

function orderIdNow() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  return `WEB${stamp}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

function paidTime() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** A payment link can be paid once. That payment creates one order in the order center. */
export function settlePaymentLink(id: string, detail: { methodName: string; skuName: string; amount: number; currency: string; userId?: string }) {
  const links = readPaymentLinks()
  const current = links.find((item) => item.id === id)
  if (current?.orderId) return current
  const orderId = orderIdNow()
  const when = paidTime()
  const userId = detail.userId || current?.userId || 'PAYMENT-LINK-USER'
  const next = links.map((item) => item.id === id ? { ...item, received: true, orderId, paidMethod: detail.methodName, userId } : item)
  if (!current) {
    next.unshift({ id, received: true, orderId, paidMethod: detail.methodName, userId, skuName: detail.skuName, amount: detail.amount, currency: detail.currency })
  }
  writePaymentLinks(next)
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
      id: `TXN-${orderId}`,
      time: when,
      event: '支付成功',
      status: '已支付',
      amount: detail.amount,
      paymentMethod: detail.methodName,
      note: `Payment link ${id}`,
    }],
  }
  setState((prev) => ({ ...prev, orders: [order, ...prev.orders] }))
  return next.find((item) => item.id === id) || current
}
