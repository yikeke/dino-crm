import { setState } from './store'
import type { Order } from './types'

export const PAYMENT_LINK_KEY = 'dino-cc-payment-links-v1'

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
  if (current?.orderId && detail.leg !== 'deposit_balance') return current
  const when = paidTime()
  const userId = detail.userId || current?.userId || 'PAYMENT-LINK-USER'
  const orderId = detail.existingOrderId || orderIdNow()
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
  const txn = {
    id: `TXN-${orderId}-${detail.leg || 'full'}`,
    time: when,
    event: detail.leg === 'deposit_balance' ? '尾款支付成功' : detail.leg === 'deposit_first' ? '定金首款支付成功' : '支付成功',
    status: '已支付' as const,
    amount: detail.amount,
    paymentMethod: detail.methodName,
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
    const packageAmount = detail.packageAmount || detail.amount
    const partial = detail.leg === 'deposit_first' && detail.amount < packageAmount
    const order: Order = {
      orderId,
      productName: detail.skuName,
      studentId: userId,
      userStatus: partial ? '未付费-体验中' : '付费',
      orderStatus: partial ? '待支付' : '已支付',
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
