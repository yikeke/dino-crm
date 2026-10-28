import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Input,
  InputNumber,
  Checkbox,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { ArrowLeftOutlined, CopyOutlined, DownOutlined, EditOutlined, EyeOutlined, LinkOutlined, QrcodeOutlined, RightOutlined } from '@ant-design/icons'
import QRCode from 'qrcode'
import { useI18n } from '../i18n'
import {
  channelsOnLine,
  formatMoney,
  linesInCatalog,
  loadMarketingCatalog,
  offersOnPlan,
  type LinkOffer,
} from '../paymentLinkCatalog'
import { useStore } from '../store'
import { useCurrentAccount } from '../perm'
import { useSession } from '../auth'
import { LEGACY_PAYMENT_LINK_KEYS, PAYMENT_LINK_KEY, currentOrderId, ensurePaymentLinkOrders, subOrderNoFor, settlePaymentLink } from '../paymentLinkStore'
import { enValue } from '../channel'
import { methodDisplayName, methodsForLine } from '../paymentMethods'
import './CreatePaymentLink.css'

const STORE_KEY = PAYMENT_LINK_KEY

type LinkKind = 'full' | 'deposit_first' | 'deposit_balance'

type PaymentLink = {
  id: string
  kind: LinkKind
  depositPlanId: string
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
  promoLabel: string
  payable: number
  amount: number
  depositPaid?: number
  phone: string
  customerName: string
  note: string
  methods: string[]
  userId?: string
  orderId?: string
  paidMethod?: string
  transferDeclared?: boolean
  paidNote?: string
  paymentProofName?: string
  url: string
  received: boolean
  createdAt: string
  updatedAt: string
  sourceLinkId?: string
  createdBy?: string
}

type Scene = 'all' | 'confirm' | 'first' | 'balance' | 'full_wait' | 'done'

function offer(skuId: string, skuName: string, memberLevel: 'Pro' | 'Max', listPrice: number, payable: number, currency: string, ruleLabel: string): LinkOffer {
  return { skuId, skuName, memberLevel, listPrice, payable, currency, ruleLabel }
}

function buildSeedLinks(): PaymentLink[] {
  const koreaOffers = [
    offer('KR-Q-2026', 'Pro Quarterly', 'Pro', 99000, 89100, 'KRW', '10% off'),
    offer('KR-H-2026', 'Max 6 Months', 'Max', 178000, 178000, 'KRW', 'List price'),
    offer('KR-Y-2026', 'Pro Yearly', 'Pro', 298000, 248000, 'KRW', 'Amount off 50,000 KRW'),
    offer('KR-MY-2026', 'Max Yearly', 'Max', 398000, 338300, 'KRW', '15% off'),
  ]
  const vnQuarterly = [offer('VN-Q-2026', 'Pro Quarterly', 'Pro', 990000, 891000, 'VND', '10% off')]
  const thQuarterly = [offer('TH-Q-2026', 'Pro Quarterly', 'Pro', 9900, 9900, 'THB', 'List price')]
  const blank = (row: PaymentLink): PaymentLink => ({ ...row, url: buildUrl(row) })
  return [
    blank({
      id: 'PL-BAL-TH', kind: 'deposit_balance', depositPlanId: 'DP-TH', sourceLinkId: 'PL-DEP-TH',
      line: 'Thailand', channelId: 'th_ground', channelName: 'Bangkok Ground Team', channelCode: 'CH-TH-0001',
      planId: 'CSP-TH', offers: thQuarterly, skuId: 'TH-Q-2026', skuName: 'Pro Quarterly', currency: 'THB',
      listPrice: 9900, promoCode: '', promoLabel: '', payable: 9900, amount: 8910, depositPaid: 990,
      phone: '', customerName: '', note: '', methods: ['KPLUS'], userId: '2060199610824355848',
      url: '', received: false, createdAt: '2026-10-28 15:40', updatedAt: '2026-10-28 15:40',
    }),
    blank({
      id: 'PL-DEP-TH', kind: 'deposit_first', depositPlanId: 'DP-TH',
      line: 'Thailand', channelId: 'th_ground', channelName: 'Bangkok Ground Team', channelCode: 'CH-TH-0001',
      planId: 'CSP-TH', offers: thQuarterly, skuId: 'TH-Q-2026', skuName: 'Pro Quarterly', currency: 'THB',
      listPrice: 9900, promoCode: '', promoLabel: '', payable: 9900, amount: 990,
      phone: '', customerName: '', note: '', methods: ['KPLUS'], userId: '2060199610824355848',
      orderId: 'WEB-DEP-TH', paidMethod: 'KPLUS',
      url: '', received: true, createdAt: '2026-10-28 11:05', updatedAt: '2026-10-28 11:20',
    }),
    blank({
      id: 'PL-BAL-VN', kind: 'deposit_balance', depositPlanId: 'DP-VN-DONE', sourceLinkId: 'PL-DEP-VN',
      line: 'Vietnam', channelId: 'sales_linh_nguyen', channelName: 'Linh Nguyen', channelCode: 'CH-VN-0005',
      planId: 'CSP-LINH', offers: vnQuarterly, skuId: 'VN-Q-2026', skuName: 'Pro Quarterly', currency: 'VND',
      listPrice: 990000, promoCode: 'CSP-LINH-PROMO', promoLabel: 'CSP-LINH-PROMO', payable: 891000, amount: 391000, depositPaid: 500000,
      phone: '', customerName: '', note: '', methods: ['vietqr', 'bank_transfer'], userId: '2090031938694049793',
      orderId: 'WEB-DEP-VN', paidMethod: 'bank_transfer',
      url: '', received: true, createdAt: '2026-10-28 14:10', updatedAt: '2026-10-28 16:05',
    }),
    blank({
      id: 'PL-DEP-VN', kind: 'deposit_first', depositPlanId: 'DP-VN-DONE',
      line: 'Vietnam', channelId: 'sales_linh_nguyen', channelName: 'Linh Nguyen', channelCode: 'CH-VN-0005',
      planId: 'CSP-LINH', offers: vnQuarterly, skuId: 'VN-Q-2026', skuName: 'Pro Quarterly', currency: 'VND',
      listPrice: 990000, promoCode: 'CSP-LINH-PROMO', promoLabel: 'CSP-LINH-PROMO', payable: 891000, amount: 500000,
      phone: '', customerName: '', note: '', methods: ['vietqr', 'bank_transfer'], userId: '2090031938694049793',
      orderId: 'WEB-DEP-VN', paidMethod: 'vietqr',
      url: '', received: true, createdAt: '2026-10-27 18:30', updatedAt: '2026-10-28 16:05',
    }),
    blank({
      id: 'PL-BAL-READY', kind: 'deposit_balance', depositPlanId: 'DP-VN-READY', sourceLinkId: 'PL-DEP-READY',
      line: 'Vietnam', channelId: 'sales_linh_nguyen', channelName: 'Linh Nguyen', channelCode: 'CH-VN-0005',
      planId: 'CSP-LINH', offers: vnQuarterly, skuId: 'VN-Q-2026', skuName: 'Pro Quarterly', currency: 'VND',
      listPrice: 990000, promoCode: 'CSP-LINH-PROMO', promoLabel: 'CSP-LINH-PROMO', payable: 891000, amount: 391000, depositPaid: 500000,
      phone: '', customerName: '', note: '', methods: ['vietqr', 'bank_transfer'], userId: '2060199610824356009',
      url: '', received: false, createdAt: '2026-10-28 09:15', updatedAt: '2026-10-28 09:15',
    }),
    blank({
      id: 'PL-DEP-READY', kind: 'deposit_first', depositPlanId: 'DP-VN-READY',
      line: 'Vietnam', channelId: 'sales_linh_nguyen', channelName: 'Linh Nguyen', channelCode: 'CH-VN-0005',
      planId: 'CSP-LINH', offers: vnQuarterly, skuId: 'VN-Q-2026', skuName: 'Pro Quarterly', currency: 'VND',
      listPrice: 990000, promoCode: 'CSP-LINH-PROMO', promoLabel: 'CSP-LINH-PROMO', payable: 891000, amount: 500000,
      phone: '', customerName: '', note: '', methods: ['vietqr', 'bank_transfer'], userId: '2060199610824356009',
      orderId: 'WEB-DEP-READY', paidMethod: 'vietqr',
      url: '', received: true, createdAt: '2026-10-28 09:15', updatedAt: '2026-10-28 09:40',
    }),
    blank({
      id: 'PL-BAL-NEW', kind: 'deposit_balance', depositPlanId: 'DP-VN-NEW', sourceLinkId: 'PL-DEP-NEW',
      line: 'Vietnam', channelId: 'sales_linh_nguyen', channelName: 'Linh Nguyen', channelCode: 'CH-VN-0005',
      planId: 'CSP-LINH', offers: vnQuarterly, skuId: 'VN-Q-2026', skuName: 'Pro Quarterly', currency: 'VND',
      listPrice: 990000, promoCode: 'CSP-LINH-PROMO', promoLabel: 'CSP-LINH-PROMO', payable: 891000, amount: 391000, depositPaid: 500000,
      phone: '', customerName: '', note: '', methods: ['bank_transfer'], userId: '2060199610824355844',
      url: '', received: false, createdAt: '2026-10-28 16:20', updatedAt: '2026-10-28 16:20',
    }),
    blank({
      id: 'PL-DEP-NEW', kind: 'deposit_first', depositPlanId: 'DP-VN-NEW',
      line: 'Vietnam', channelId: 'sales_linh_nguyen', channelName: 'Linh Nguyen', channelCode: 'CH-VN-0005',
      planId: 'CSP-LINH', offers: vnQuarterly, skuId: 'VN-Q-2026', skuName: 'Pro Quarterly', currency: 'VND',
      listPrice: 990000, promoCode: 'CSP-LINH-PROMO', promoLabel: 'CSP-LINH-PROMO', payable: 891000, amount: 500000,
      phone: '', customerName: '', note: '', methods: ['bank_transfer'], userId: '2060199610824355844',
      url: '', received: false, createdAt: '2026-10-28 16:20', updatedAt: '2026-10-28 16:20',
    }),
    blank({
      id: 'PL-FULL-BANK', kind: 'full', depositPlanId: '',
      line: 'Vietnam', channelId: 'sales_linh_nguyen', channelName: 'Linh Nguyen', channelCode: 'CH-VN-0005',
      planId: 'CSP-LINH', offers: vnQuarterly, skuId: 'VN-Q-2026', skuName: 'Pro Quarterly', currency: 'VND',
      listPrice: 990000, promoCode: 'CSP-LINH-PROMO', promoLabel: 'CSP-LINH-PROMO', payable: 891000, amount: 891000,
      phone: '', customerName: '', note: '', methods: ['bank_transfer'], userId: '2090031938694049794',
      transferDeclared: true, paidMethod: 'bank_transfer',
      url: '', received: false, createdAt: '2026-10-28 13:05', updatedAt: '2026-10-28 13:22',
    }),
    blank({
      id: 'PL-FULL-PAID', kind: 'full', depositPlanId: '',
      line: 'Korea', channelId: 'sales_amy_zhang', channelName: 'Amy Zhang', channelCode: 'CH-KR-0001',
      planId: 'CSP-AMY', offers: [koreaOffers[0]], skuId: 'KR-Q-2026', skuName: 'Pro Quarterly', currency: 'KRW',
      listPrice: 99000, promoCode: 'CSP-AMY-PROMO', promoLabel: 'CSP-AMY-PROMO', payable: 89100, amount: 89100,
      phone: '', customerName: '', note: '', methods: ['card', 'kakaopay'], userId: '2060199610824355846',
      orderId: 'WEB-FULL-PAID', paidMethod: 'card',
      url: '', received: true, createdAt: '2026-10-27 16:00', updatedAt: '2026-10-27 16:20',
    }),
    blank({
      id: 'PL-FULL-WAIT', kind: 'full', depositPlanId: '',
      line: 'Korea', channelId: 'sales_amy_zhang', channelName: 'Amy Zhang', channelCode: 'CH-KR-0001',
      planId: 'CSP-AMY', offers: koreaOffers, skuId: koreaOffers.map((item) => item.skuId).join(','), skuName: koreaOffers.map((item) => item.skuName).join(' / '), currency: 'KRW',
      listPrice: 99000, promoCode: 'CSP-AMY-PROMO', promoLabel: 'CSP-AMY-PROMO', payable: 0, amount: 0,
      phone: '', customerName: '', note: '', methods: ['card', 'kakaopay'], userId: '2060199610824355842',
      url: '', received: false, createdAt: '2026-10-28 10:12', updatedAt: '2026-10-28 10:12',
    }),
  ]
}

export const PAYMENT_LINK_DEMO_ORDERS = [
  {
    orderId: 'WEB-FULL-PAID', productName: 'Pro · Pro Quarterly', studentId: '2060199610824355846', userStatus: '付费' as const,
    orderStatus: '已支付' as const, originalPrice: 89100, paidAmount: 89100, payMethod: 'Payment Link' as const, currency: 'KRW',
    paidTime: '2026-10-27 16:20:00',
    transactions: [
      { id: 'WEB-FULL-PAID', time: '2026-10-27 16:20:00', event: '支付成功', status: '已支付' as const, amount: 89100, paymentMethod: 'card', channelRef: 'CARD-27162011KR', note: 'Payment link PL-FULL-PAID' },
    ],
  },
  {
    orderId: 'WEB-DEP-READY', productName: 'Pro · Pro Quarterly', studentId: '2060199610824356009', userStatus: '未付费-体验中' as const,
    orderStatus: '部分付款' as const, originalPrice: 891000, paidAmount: 500000, payMethod: 'Payment Link' as const, currency: 'VND',
    transactions: [
      { id: 'WEB-DEP-READY', time: '2026-10-28 09:40:00', event: '定金首款支付成功', status: '已支付' as const, amount: 500000, paymentMethod: 'vietqr', channelRef: 'VIETQR-28094007VN', note: 'Payment link PL-DEP-READY' },
    ],
  },
  {
    orderId: 'WEB-DEP-TH', productName: 'Pro · Pro Quarterly', studentId: '2060199610824355848', userStatus: '未付费-体验中' as const,
    orderStatus: '部分付款' as const, originalPrice: 9900, paidAmount: 990, payMethod: 'Payment Link' as const, currency: 'THB',
    transactions: [
      { id: 'WEB-DEP-TH', time: '2026-10-28 11:20:00', event: '定金首款支付成功', status: '已支付' as const, amount: 990, paymentMethod: 'KPLUS', channelRef: 'KPLUS-28112033TH', note: 'Payment link PL-DEP-TH' },
    ],
  },
  {
    orderId: 'WEB-DEP-VN', productName: 'Pro · Pro Quarterly', studentId: '2090031938694049793', userStatus: '付费' as const,
    orderStatus: '已支付' as const, originalPrice: 891000, paidAmount: 891000, payMethod: 'Payment Link' as const, currency: 'VND',
    paidTime: '2026-10-28 16:05:00',
    transactions: [
      { id: 'WEB-DEP-VN', time: '2026-10-27 18:48:00', event: '定金首款支付成功', status: '已支付' as const, amount: 500000, paymentMethod: 'vietqr', channelRef: 'VIETQR-27184802VN', note: 'Payment link PL-DEP-VN' },
      { id: 'WEB-BAL-VN', time: '2026-10-28 16:05:00', event: '尾款支付成功', status: '已支付' as const, amount: 391000, paymentMethod: 'bank_transfer', channelRef: 'DINOBALVN', note: 'Payment link PL-BAL-VN' },
    ],
  },
]

function depositMethods(line: string) {
  return methodsForLine(line).filter((method) => !method.code.includes('installment'))
}

function readArray(key: string): PaymentLink[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const SEED_ID = /^PL-(DEP|BAL|FULL)-/

function legacyLinks(): PaymentLink[] {
  return LEGACY_PAYMENT_LINK_KEYS.flatMap(readArray)
    .filter((row) => row?.id && !SEED_ID.test(row.id))
    .map((row) => ({
      ...row,
      kind: row.kind || 'full',
      line: enValue(row.line),
      channelName: enValue(row.channelName),
      skuName: enValue(row.skuName),
      offers: (row.offers || []).map((item) => ({ ...item, skuName: enValue(item.skuName) })),
      methods: row.methods || [],
    }))
}

function pairDeposits(input: PaymentLink[]): { links: PaymentLink[]; changed: boolean } {
  let changed = false
  const links = input.map((row) => ({ ...row }))
  const out: PaymentLink[] = []
  links.forEach((row) => {
    if (row.kind === 'deposit_balance') {
      const first = links.find((item) => item.id === row.sourceLinkId || (!!row.depositPlanId && item.kind === 'deposit_first' && item.depositPlanId === row.depositPlanId))
      if (first && !row.depositPlanId) {
        row.depositPlanId = first.depositPlanId || `DP-${first.id}`
        changed = true
      }
      out.push(row)
      return
    }
    if (row.kind !== 'deposit_first') {
      out.push(row)
      return
    }
    if (!row.depositPlanId) {
      row.depositPlanId = `DP-${row.id}`
      changed = true
    }
    const hasBalance = links.some((item) => item.kind === 'deposit_balance'
      && (item.sourceLinkId === row.id || item.depositPlanId === row.depositPlanId))
    if (!hasBalance) {
      const payable = row.payable || row.offers?.[0]?.payable || 0
      const balance: PaymentLink = {
        ...row,
        id: `${row.id}-B`,
        kind: 'deposit_balance',
        sourceLinkId: row.id,
        depositPaid: row.amount,
        amount: Math.max(payable - row.amount, 0),
        orderId: undefined,
        paidMethod: undefined,
        transferDeclared: false,
        received: false,
        url: '',
      }
      balance.url = buildUrl(balance)
      out.push(balance)
      changed = true
    }
    out.push(row)
  })
  return { links: out, changed }
}

function loadLinks(): PaymentLink[] {
  const stored = readArray(STORE_KEY)
  const renamed = stored.some((row) => currentOrderId(row.orderId) !== row.orderId)
  const current = renamed ? stored.map((row) => ({ ...row, orderId: currentOrderId(row.orderId) })) : stored
  const base = current.length ? current : buildSeedLinks()
  const known = new Set(base.map((row) => row.id))
  const recovered = legacyLinks().filter((row) => {
    if (known.has(row.id)) return false
    known.add(row.id)
    return true
  })
  const { links: next, changed } = pairDeposits([...recovered, ...base])
  if (!current.length || recovered.length || changed || renamed) saveLinks(next)
  LEGACY_PAYMENT_LINK_KEYS.forEach((key) => localStorage.removeItem(key))
  return next
}

function saveLinks(links: PaymentLink[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(links))
}

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

function hasBankTransfer(row: PaymentLink) {
  return (row.methods || []).includes('bank_transfer') || row.paidMethod === 'bank_transfer' || row.transferDeclared
}

function canMarkBankPaid(row: PaymentLink, all: PaymentLink[] = []) {
  if (row.orderId) return false
  if (!hasBankTransfer(row)) return false
  if (row.kind === 'deposit_balance') {
    const first = all.find((item) => item.kind === 'deposit_first' && item.depositPlanId === row.depositPlanId)
    if (!first?.orderId) return false
  }
  return true
}

function depositFloor(line: string, payable: number) {
  if (line === 'Vietnam' || line === '越南') {
    return { min: 500_000, label: '越南首款不低于 500,000 VND' }
  }
  if (line === 'Thailand' || line === '泰国') {
    return { min: Math.max(1, Math.ceil(payable * 0.1)), label: '泰国首款不低于套餐应付的 10%' }
  }
  return { min: 1, label: '' }
}

function nowText() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function buildUrl(link: PaymentLink) {
  const type = link.kind === 'full' ? 'full' : link.kind === 'deposit_first' ? 'deposit_first' : 'deposit_balance'
  const query = new URLSearchParams({
    pay_link: link.id,
    type,
    line: link.line,
    sku: link.skuId,
    sku_name: link.skuName,
    amount: String(link.amount),
    payable: String(link.payable),
    list: String(link.listPrice),
    currency: link.currency,
    methods: (link.methods || []).join(','),
    phone: link.phone,
    customer_name: link.customerName,
    channel_name: link.channelName || '',
    channel_code: link.channelCode || '',
    offers: JSON.stringify(link.offers || []),
  })
  if (link.userId) query.set('user_id', link.userId)
  if (link.promoCode) query.set('promo', link.promoCode)
  if (link.depositPlanId) query.set('deposit_plan', link.depositPlanId)
  if (link.kind === 'deposit_balance') query.set('deposit_paid', String(link.depositPaid || 0))
  const root = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${root}/#/lp/pay-link?${query.toString()}`
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    message.success('链接已复制')
  } catch {
    message.info(value)
  }
}

export default function CreatePaymentLink() {
  const { lang } = useI18n()
  const en = lang === 'en'
  const [searchParams, setSearchParams] = useSearchParams()
  const presetUserId = searchParams.get('user_id') || ''
  const [catalog, setCatalog] = useState(() => loadMarketingCatalog())
  const [links, setLinks] = useState<PaymentLink[]>(() => loadLinks())
  const [line, setLine] = useState('')
  const [channelId, setChannelId] = useState('')
  const [usePromo, setUsePromo] = useState(true)
  const [userQuery, setUserQuery] = useState(presetUserId)
  const [depositSkuId, setDepositSkuId] = useState('')
  const [firstAmount, setFirstAmount] = useState<number | null>(null)
  const [payMethods, setPayMethods] = useState<string[]>([])
  const [tab, setTab] = useState<'full' | 'deposit'>('full')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [screen, setScreen] = useState<'list' | 'form'>(presetUserId ? 'form' : 'list')
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [scene, setScene] = useState<Scene>('all')
  const [lineFilter, setLineFilter] = useState<string | undefined>()
  const [channelFilter, setChannelFilter] = useState<string | undefined>()
  const [onlyMine, setOnlyMine] = useState(false)
  const [qrTarget, setQrTarget] = useState<PaymentLink | null>(null)
  const [qrImage, setQrImage] = useState('')
  const [methodTarget, setMethodTarget] = useState<PaymentLink | null>(null)
  const [methodDraft, setMethodDraft] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string[]>([])
  const holdLineReset = useRef(false)
  const navigate = useNavigate()
  const { account, role } = useCurrentAccount()
  const session = useSession()
  const myEmail = account?.email || session?.email || ''
  const canConfirmBank = !role || role.id === 'role_admin' || role.id === 'role_ops' || role.id === 'role_sales_leader'
  const students = useStore((s) => s.students)
  const orders = useStore((s) => s.orders)
  const userMatches = useMemo(() => {
    const query = userQuery.trim().toLowerCase()
    if (query.length < 2) return []
    const digits = query.replace(/\D/g, '')
    return students.filter((student) => {
      if (student.studentId.toLowerCase().includes(query)) return true
      if (digits.length >= 4) {
        const phone = (student.phone || student.account || '').replace(/\D/g, '')
        return phone.includes(digits)
      }
      return false
    }).slice(0, 8)
  }, [students, userQuery])
  const linkedUserId = students.find((student) => student.studentId === userQuery.trim())?.studentId || ''

  const reloadCatalog = () => setCatalog(loadMarketingCatalog())

  useEffect(() => {
    ensurePaymentLinkOrders(PAYMENT_LINK_DEMO_ORDERS)
  }, [])

  useEffect(() => {
    const onFocus = () => {
      reloadCatalog()
      setLinks(loadLinks())
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const lines = useMemo(() => linesInCatalog(catalog.skus, catalog.channels), [catalog.skus, catalog.channels])
  const activeLine = line || lines[0] || ''
  const lineChannels = useMemo(
    () => channelsOnLine(activeLine, catalog.channels, catalog.plans),
    [activeLine, catalog.channels, catalog.plans],
  )
  const activeChannel = lineChannels.find((item) => item.channel.id === channelId) || lineChannels.find((item) => item.plan) || lineChannels[0]
  const planOffers = offersOnPlan(activeChannel?.plan, catalog.skus)
  const hasDiscount = !!activeChannel?.plan?.promoCode && planOffers.some((offer) => offer.ruleLabel !== 'List price')
  const shown = planOffers.map((offer) => (
    usePromo && hasDiscount ? offer : { ...offer, payable: offer.listPrice, ruleLabel: 'List price' }
  ))
  const chosenDeposit = shown.find((offer) => offer.skuId === depositSkuId) || shown[0]
  const planKey = shown.map((offer) => offer.skuId).join(',')

  useEffect(() => {
    if (!presetUserId) return
    setSearchParams({}, { replace: true })
  }, [presetUserId, setSearchParams])

  useEffect(() => {
    if (!qrTarget?.url) {
      setQrImage('')
      return
    }
    let cancelled = false
    QRCode.toDataURL(qrTarget.url, { width: 320, margin: 1 }).then((image) => {
      if (!cancelled) setQrImage(image)
    })
    return () => { cancelled = true }
  }, [qrTarget])

  useEffect(() => {
    if (!planKey) return
    if (!planKey.split(',').includes(depositSkuId)) setDepositSkuId(planKey.split(',')[0])
  }, [planKey, depositSkuId])

  useEffect(() => {
    if (holdLineReset.current) {
      holdLineReset.current = false
      return
    }
    const next = lineChannels.find((item) => item.plan && (item.channel.type === 'Sales' || item.channel.type === '销售')) || lineChannels.find((item) => item.plan)
    const offers = offersOnPlan(next?.plan, catalog.skus)
    setChannelId(next?.channel.id || '')
    setUsePromo(!!next?.plan?.promoCode && offers.some((offer) => offer.ruleLabel !== 'List price'))
    setFirstAmount(null)
  }, [activeLine, catalog.skus, lineChannels])

  useEffect(() => {
    setPayMethods(methodsForLine(activeLine).map((item) => item.code))
  }, [activeLine])

  const persist = (next: PaymentLink[]) => {
    setLinks(next)
    saveLinks(next)
  }

  const resetCustomer = () => {
    setUserQuery('')
    setFirstAmount(null)
  }

  const onLine = (value: string) => {
    setLine(value)
  }

  const onChannel = (value: string) => {
    setChannelId(value)
    const next = lineChannels.find((item) => item.channel.id === value)
    const offers = offersOnPlan(next?.plan, catalog.skus)
    setUsePromo(!!next?.plan?.promoCode && offers.some((offer) => offer.ruleLabel !== 'List price'))
    setFirstAmount(null)
  }

  const requireCustomer = () => {
    if (!activeChannel?.plan || !shown.length) {
      message.warning(en ? 'This channel has no active price plan' : '这个渠道还没有生效中的价格方案')
      return false
    }
    if (!linkedUserId) {
      message.warning(en ? 'Pick a User ID from the matches' : '请从匹配结果里选中一个 User ID')
      return false
    }
    if (!payMethods.length) {
      message.warning(en ? 'Select at least one payment method' : '请至少选择一种支付方式')
      return false
    }
    return true
  }

  const baseFields = (kind: LinkKind, amount: number, depositPlanId: string, id: string): PaymentLink => {
    const picked = kind === 'full' ? shown : shown.filter((offer) => offer.skuId === depositSkuId).slice(0, 1)
    const offer = picked[0]
    const promo = usePromo && hasDiscount ? (activeChannel?.plan?.promoCode || '') : ''
    return {
      id,
      kind,
      depositPlanId,
      line: activeLine,
      channelId: activeChannel?.channel.id || '',
      channelName: activeChannel?.channel.name || '',
      channelCode: activeChannel?.channel.channelCode || '',
      planId: activeChannel?.plan?.id || '',
      offers: picked,
      skuId: picked.map((item) => item.skuId).join(','),
      skuName: picked.map((item) => item.skuName).join(' / '),
      currency: offer?.currency || '',
      listPrice: offer?.listPrice || 0,
      promoCode: promo,
      promoLabel: promo,
      payable: offer?.payable || 0,
      amount,
      phone: '',
      customerName: '',
      note: '',
      methods: kind === 'full' ? payMethods : payMethods.filter((code) => !code.includes('installment')),
      userId: linkedUserId,
      orderId: editingId ? links.find((item) => item.id === editingId)?.orderId : undefined,
      url: '',
      received: false,
      createdAt: editingId ? (links.find((item) => item.id === editingId)?.createdAt || nowText()) : nowText(),
      updatedAt: nowText(),
      sourceLinkId: editingId ? links.find((item) => item.id === editingId)?.sourceLinkId : undefined,
      createdBy: editingId ? links.find((item) => item.id === editingId)?.createdBy : myEmail,
    }
  }

  const createFull = () => {
    if (!requireCustomer()) return
    if (editingId && links.some((item) => item.id === editingId && item.orderId)) {
      message.warning(en ? 'This link is already paid' : '这条链接已经支付，不能再改')
      return
    }
    const id = editingId || newId('PL')
    const amount = shown.length === 1 ? shown[0].payable : 0
    const row = baseFields('full', amount, editingId ? (links.find((item) => item.id === editingId)?.depositPlanId || '') : '', id)
    if (editingId) {
      const previous = links.find((item) => item.id === editingId)
      row.createdAt = previous?.createdAt || row.createdAt
      row.received = false
    }
    row.url = buildUrl(row)
    persist(editingId ? links.map((item) => item.id === editingId ? row : item) : [row, ...links])
    setEditingId(null)
    setScreen('list')
    message.success(editingId ? (en ? 'Payment link updated' : '支付链接已更新') : (en ? 'Full payment link created' : '全款链接已生成'))
    resetCustomer()
  }

  const createDepositFirst = () => {
    if (!requireCustomer()) return
    const payable = chosenDeposit?.payable || 0
    const floor = depositFloor(activeLine, payable)
    const amount = Math.round(Number(firstAmount) || 0)
    if (!chosenDeposit) {
      message.warning(en ? 'Select one SKU' : '请选择一个 SKU')
      return
    }
    if (floor.min >= payable || amount < floor.min || amount >= payable) {
      message.warning(floor.label
        ? `${floor.label}，且必须小于套餐应付 ${formatMoney(payable, chosenDeposit.currency)}`
        : (en ? 'First payment must be greater than 0 and less than the package price' : '首款必须大于 0，且小于这个套餐的应付金额'))
      return
    }
    if (!payMethods.some((code) => !code.includes('installment'))) {
      message.warning(en ? 'Select at least one payment method that is not an instalment' : '请至少选择一种非分期的支付方式')
      return
    }
    const id = editingId || newId('PL')
    const planId = editingId ? (links.find((item) => item.id === editingId)?.depositPlanId || newId('DP')) : newId('DP')
    const first = baseFields('deposit_first', amount, planId, id)
    if (editingId) first.createdAt = links.find((item) => item.id === editingId)?.createdAt || first.createdAt
    first.url = buildUrl(first)
    const existingBalance = links.find((item) => item.kind === 'deposit_balance' && item.depositPlanId === planId)
    const balanceId = existingBalance?.id || newId('PL')
    const balance: PaymentLink = {
      ...first,
      id: balanceId,
      kind: 'deposit_balance',
      orderId: existingBalance?.orderId,
      received: !!existingBalance?.orderId,
      paidMethod: existingBalance?.paidMethod,
      transferDeclared: false,
      sourceLinkId: first.id,
      depositPaid: amount,
      amount: Math.max(payable - amount, 0),
      createdAt: existingBalance?.createdAt || first.createdAt,
      url: '',
    }
    balance.url = buildUrl(balance)
    const withoutPair = links.filter((item) => item.id !== first.id && item.id !== balance.id)
    persist([balance, first, ...withoutPair])
    setEditingId(null)
    setScreen('list')
    message.success(editingId
      ? (en ? 'Deposit links updated' : '定金链接已更新')
      : (en ? 'First and balance links created together' : '已同时生成首款链接和尾款链接'))
    resetCustomer()
  }

  const startEdit = (row: PaymentLink) => {
    if (row.orderId) {
      message.warning(en ? 'Paid links cannot be edited' : '已经支付的链接不能再编辑')
      return
    }
    if (row.line !== activeLine) holdLineReset.current = true
    setEditingId(row.id)
    setLine(row.line)
    setChannelId(row.channelId)
    setUsePromo(!!row.promoCode)
    setUserQuery(row.userId || '')
    setDepositSkuId(row.offers?.[0]?.skuId || row.skuId.split(',')[0] || '')
    setPayMethods(row.methods || [])
    setFirstAmount(row.kind === 'deposit_first' ? row.amount : null)
    setTab(row.kind === 'full' ? 'full' : 'deposit')
    setScreen('form')
  }

  const markBankPaid = (row: PaymentLink) => {
    const first = row.kind === 'deposit_balance'
      ? links.find((item) => item.kind === 'deposit_first' && item.depositPlanId === row.depositPlanId)
      : undefined
    const offer = row.offers?.[0]
    settlePaymentLink(row.id, {
      methodName: 'bank_transfer',
      skuName: offer ? `${offer.memberLevel} · ${offer.skuName}` : row.skuName,
      amount: row.amount || offer?.payable || row.payable,
      packageAmount: offer?.payable || row.payable,
      currency: row.currency,
      userId: row.userId,
      leg: row.kind,
      existingOrderId: first?.orderId,
    })
    setLinks(loadLinks())
    message.success(row.kind === 'deposit_first'
      ? (en ? 'First transfer confirmed. Membership stays closed until the balance is paid.' : '首款已确认。会员等尾款到账后再开通。')
      : (en ? 'Marked paid and membership opened' : '已确认转账并开通会员'))
  }

  const linkedStudent = students.find((student) => student.studentId === linkedUserId)
  const lineMethods = (mode: 'full' | 'deposit') => (mode === 'deposit' ? depositMethods(activeLine) : methodsForLine(activeLine))
  const firstValue = Math.round(Number(firstAmount) || 0)
  const depositPayable = chosenDeposit?.payable || 0
  const floor = depositFloor(activeLine, depositPayable)
  const firstValid = !!chosenDeposit && firstValue >= floor.min && firstValue < depositPayable
  const roundFor = (value: number, currency: string) => (['VND', 'KRW', 'IDR'].includes(currency) ? Math.round(value / 1000) * 1000 : Math.round(value))
  const quickFirst = chosenDeposit
    ? [
      ...(floor.min > 1 ? [{ label: en ? 'Minimum' : '最低', value: floor.min }] : []),
      { label: '30%', value: Math.max(floor.min, roundFor(depositPayable * 0.3, chosenDeposit.currency)) },
      { label: '50%', value: Math.max(floor.min, roundFor(depositPayable * 0.5, chosenDeposit.currency)) },
    ].filter((item, index, all) => item.value < depositPayable && all.findIndex((other) => other.value === item.value) === index)
    : []

  const previewDraft = (mode: 'full' | 'deposit') => {
    const kind: LinkKind = mode === 'full' ? 'full' : 'deposit_first'
    const amount = mode === 'full' ? (shown.length === 1 ? shown[0].payable : 0) : firstValue
    const draft = baseFields(kind, amount, mode === 'full' ? '' : 'DP-PREVIEW', 'PL-PREVIEW')
    window.open(`${buildUrl(draft)}&preview=1`, '_blank')
  }

  const offerPrice = (item: LinkOffer) => (
    <span className="pl-offer__price">
      {item.payable !== item.listPrice && <s>{formatMoney(item.listPrice, item.currency)}</s>}
      <b>{formatMoney(item.payable, item.currency)}</b>
    </span>
  )

  const offerCard = (item: LinkOffer, mode: 'full' | 'deposit') => {
    const selected = mode === 'full' || item.skuId === chosenDeposit?.skuId
    const body = (
      <>
        <span className="pl-offer__head">
          <Tag color={item.memberLevel === 'Max' ? 'gold' : 'purple'} bordered={false}>{item.memberLevel}</Tag>
          <b>{item.skuName}</b>
        </span>
        {offerPrice(item)}
        <span className="pl-offer__rule">{item.ruleLabel === 'List price' ? (en ? 'List price' : '原价') : item.ruleLabel}</span>
      </>
    )
    if (mode === 'full') return <div key={item.skuId} className="pl-offer is-included">{body}</div>
    return (
      <button
        key={item.skuId}
        type="button"
        className={`pl-offer${selected ? ' is-selected' : ''}`}
        disabled={!!editingId && !selected}
        onClick={() => { setDepositSkuId(item.skuId); setFirstAmount(null) }}
      >
        {body}
      </button>
    )
  }

  const step = (no: number, title: string, hint?: string) => (
    <span className="pl-step-title">
      <span className="pl-step-title__no">{no}</span>
      <span>
        {title}
        {hint && <Typography.Text type="secondary" className="pl-step-title__hint">{hint}</Typography.Text>}
      </span>
    </span>
  )

  const formCard = (mode: 'full' | 'deposit') => {
    const methodList = lineMethods(mode)
    const pickedMethods = methodList.filter((method) => payMethods.includes(method.code))
    const promo = usePromo && hasDiscount ? activeChannel?.plan?.promoCode : ''
    const balanceValue = Math.max(depositPayable - firstValue, 0)
    const firstShare = depositPayable ? Math.min(100, Math.max(0, (firstValue / depositPayable) * 100)) : 0
    const ready = !!linkedUserId && !!activeChannel?.plan && pickedMethods.length > 0 && (mode === 'full' ? shown.length > 0 : firstValid)
    let stepNo = 0
    return (
      <div className="pl-form">
        <div className="pl-form__main">
          <Card size="small" title={step(++stepNo, en ? 'Customer' : '客户', en ? 'Phone number or User ID' : '手机号或 User ID')}>
            <AutoComplete
              value={userQuery}
              options={userMatches.map((student) => ({
                value: student.studentId,
                label: (
                  <span className="pl-user-option">
                    <b>{student.studentId}</b>
                    <Typography.Text type="secondary">{student.name} · {student.phone || student.account}</Typography.Text>
                  </span>
                ),
              }))}
              onChange={setUserQuery}
              onSelect={setUserQuery}
              placeholder={en ? 'Type at least 2 characters' : '至少输入 2 个字符'}
              style={{ width: '100%' }}
              status={userQuery.trim().length >= 2 && !linkedUserId ? 'warning' : undefined}
            />
            {linkedStudent ? (
              <div className="pl-user">
                <span className="pl-user__avatar">{(linkedStudent.name || '?').slice(0, 1)}</span>
                <span className="pl-user__info">
                  <b>{linkedStudent.name}</b>
                  <Typography.Text type="secondary">{linkedStudent.studentId} · {linkedStudent.phone || linkedStudent.account} · {enValue(linkedStudent.businessLine)}</Typography.Text>
                </span>
                <Tag color="success" bordered={false}>{en ? 'Matched' : '已匹配'}</Tag>
              </div>
            ) : (
              <Typography.Text type="secondary" className="pl-field-hint">
                {userQuery.trim().length >= 2
                  ? (en ? 'Pick a user from the matches. The link saves the User ID.' : '请从下拉结果里选中一个用户，链接保存的是 User ID。')
                  : (en ? 'The link is tied to one user. Only that user can pay with it.' : '链接绑定一个用户，只给这个用户付款。')}
              </Typography.Text>
            )}
          </Card>

          <Card size="small" title={step(++stepNo, en ? 'Channel and price plan' : '渠道与价格方案')}>
            <div className="pl-grid-2">
              <div>
                <div className="pl-label">{en ? 'Business line' : '业务线'}</div>
                <Select
                  style={{ width: '100%' }}
                  value={activeLine || undefined}
                  placeholder={en ? 'Select a line' : '选择业务线'}
                  options={lines.map((item) => ({ value: item, label: item }))}
                  onChange={onLine}
                />
              </div>
              <div>
                <div className="pl-label">{en ? 'Channel' : '渠道'}</div>
                <Select
                  style={{ width: '100%' }}
                  value={activeChannel?.channel.id}
                  options={lineChannels.map((item) => ({
                    value: item.channel.id,
                    disabled: !item.plan,
                    label: `${item.channel.name} · ${item.channel.channelCode || '—'}${item.plan ? '' : (en ? ' · no price plan' : ' · 无价格方案')}`,
                  }))}
                  onChange={onChannel}
                />
              </div>
            </div>
            {activeChannel?.plan ? (
              <>
                <div className="pl-plan-bar">
                  <span className="pl-label">{en ? 'Promo' : '优惠'}</span>
                  {hasDiscount ? (
                    <Segmented
                      size="small"
                      value={usePromo ? 'yes' : 'no'}
                      onChange={(value) => { setUsePromo(value === 'yes'); setFirstAmount(null) }}
                      options={[
                        { value: 'yes', label: `${en ? 'Use' : '使用'} ${activeChannel.plan.promoCode}` },
                        { value: 'no', label: en ? 'List price' : '全部原价' },
                      ]}
                    />
                  ) : (
                    <Typography.Text type="secondary">{en ? 'This plan has no promo. Every SKU is at list price.' : '当前方案无优惠，全部按原价'}</Typography.Text>
                  )}
                </div>
                <div className="pl-label">
                  {mode === 'full'
                    ? (en ? `SKUs on this plan (${shown.length}) · all shown to the customer` : `方案内 SKU（${shown.length} 个）· 全部展示给用户选择`)
                    : (en ? 'Pick one SKU for this deposit' : '选择这笔定金对应的 1 个 SKU')}
                </div>
                <div className="pl-offers">{shown.map((item) => offerCard(item, mode))}</div>
                {mode === 'deposit' && editingId && (
                  <Typography.Text type="secondary" className="pl-field-hint">{en ? 'The SKU of a saved deposit cannot change. Create a new link instead.' : '已保存的定金不能换 SKU，要换套餐请新建链接。'}</Typography.Text>
                )}
              </>
            ) : (
              <Alert type="warning" showIcon message={en ? 'This channel has no active price plan. Pick another channel.' : '这个渠道还没有生效中的价格方案，请换一个渠道。'} />
            )}
          </Card>

          {mode === 'deposit' && chosenDeposit && (
            <Card size="small" title={step(++stepNo, en ? 'First payment' : '首款金额', floor.label || (en ? 'Greater than 0 and below the package price' : '大于 0，且小于套餐应付'))}>
              <div className="pl-first">
                <InputNumber
                  size="large"
                  min={floor.min}
                  max={Math.max(depositPayable - 1, 1)}
                  value={firstAmount}
                  onChange={(value) => setFirstAmount(typeof value === 'number' ? value : null)}
                  formatter={(value) => (value === undefined || value === null || String(value) === '' ? '' : Number(value).toLocaleString('en-US'))}
                  parser={(value) => Number((value || '').replace(/[^\d.]/g, ''))}
                  addonAfter={chosenDeposit.currency}
                  status={firstAmount !== null && !firstValid ? 'error' : undefined}
                  style={{ width: 260 }}
                />
                <Space size={6}>
                  {quickFirst.map((item) => (
                    <Button key={item.label} size="small" onClick={() => setFirstAmount(item.value)}>{item.label}</Button>
                  ))}
                </Space>
              </div>
              <div className="pl-split">
                <div className="pl-split__bar">
                  <span className="pl-split__first" style={{ width: `${firstShare}%` }} />
                </div>
                <div className="pl-split__legend">
                  <span><i className="is-first" />{en ? 'First' : '首款'} <b>{formatMoney(firstValue, chosenDeposit.currency)}</b></span>
                  <span><i className="is-balance" />{en ? 'Balance' : '尾款'} <b>{formatMoney(balanceValue, chosenDeposit.currency)}</b></span>
                  <span className="pl-split__total">{en ? 'Package' : '套餐应付'} {formatMoney(depositPayable, chosenDeposit.currency)}</span>
                </div>
              </div>
            </Card>
          )}

          <Card
            size="small"
            title={step(++stepNo, en ? 'Payment methods' : '支付方式', mode === 'deposit'
              ? (en ? 'Offered on both links; chosen per payment; no instalments' : '首款、尾款都提供，用户每笔单独选；不含分期')
              : (en ? 'The customer only sees the methods checked here' : '用户只会看到这里勾选的方式'))}
          >
            <div className="pl-method-tiles">
              {methodList.map((method) => {
                const on = payMethods.includes(method.code)
                return (
                  <button
                    key={method.code}
                    type="button"
                    className={`pl-method-tile${on ? ' is-on' : ''}`}
                    onClick={() => setPayMethods(on ? payMethods.filter((code) => code !== method.code) : [...payMethods, method.code])}
                  >
                    <Checkbox checked={on} tabIndex={-1} />
                    <img src={method.icon} alt="" />
                    <span>{methodDisplayName(method, en ? 'en' : 'zh')}</span>
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        <div className="pl-form__side">
          <Card size="small" title={en ? 'Summary' : '链接摘要'} className="pl-summary">
            <div className="pl-summary__type">
              <Tag color={mode === 'full' ? 'green' : 'blue'} bordered={false}>
                {mode === 'full' ? (en ? 'Full payment' : '全款') : (en ? 'Deposit · 2 links' : '定金 · 2 条链接')}
              </Tag>
              {editingId && <Tag bordered={false}>{en ? 'Editing' : '编辑中'} {editingId}</Tag>}
            </div>
            <dl className="pl-summary__list">
              <dt>{en ? 'Customer' : '客户'}</dt>
              <dd>{linkedStudent ? <>{linkedStudent.name}<br /><Typography.Text type="secondary">{linkedStudent.studentId}</Typography.Text></> : <Typography.Text type="secondary">{en ? 'Not selected' : '未选择'}</Typography.Text>}</dd>
              <dt>{en ? 'Channel' : '渠道'}</dt>
              <dd>{activeChannel ? `${activeChannel.channel.name} · ${activeLine}` : '—'}</dd>
              <dt>{en ? 'Promo' : '优惠'}</dt>
              <dd>{promo || (en ? 'None' : '无')}</dd>
              <dt>SKU</dt>
              <dd>
                {mode === 'full'
                  ? shown.map((item) => <div key={item.skuId} className="pl-summary__sku"><span>{item.skuName}</span><b>{formatMoney(item.payable, item.currency)}</b></div>)
                  : chosenDeposit && <div className="pl-summary__sku"><span>{chosenDeposit.skuName}</span><b>{formatMoney(chosenDeposit.payable, chosenDeposit.currency)}</b></div>}
              </dd>
              {mode === 'deposit' && chosenDeposit && (
                <>
                  <dt>{en ? 'Links' : '生成链接'}</dt>
                  <dd>
                    <div className="pl-summary__sku"><span>① {en ? 'First' : '首款'}</span><b>{firstValid ? formatMoney(firstValue, chosenDeposit.currency) : '—'}</b></div>
                    <div className="pl-summary__sku"><span>② {en ? 'Balance' : '尾款'}</span><b>{firstValid ? formatMoney(balanceValue, chosenDeposit.currency) : '—'}</b></div>
                  </dd>
                </>
              )}
              <dt>{en ? 'Methods' : '支付方式'}</dt>
              <dd>
                {pickedMethods.length
                  ? <span className="pl-summary__methods">{pickedMethods.map((method) => <img key={method.code} src={method.icon} alt={method.name} title={method.name} />)}</span>
                  : <Typography.Text type="danger">{en ? 'None selected' : '未选择'}</Typography.Text>}
              </dd>
            </dl>
            <Typography.Paragraph type="secondary" className="pl-summary__note">
              {mode === 'full'
                ? (en ? 'One link, one payment. When it lands, one order is created and membership opens.' : '1 条链接对应 1 笔付款。到账后生成 1 张订单并开通会员。')
                : (en ? 'Saving creates the first and balance links together. Both payments sit under one main order; membership opens after the balance.' : '保存后同时生成首款和尾款链接，两笔都挂在同一张主订单下；尾款到账后开通会员。')}
            </Typography.Paragraph>
            <Button type="primary" block size="large" icon={<LinkOutlined />} disabled={!ready} onClick={mode === 'full' ? createFull : createDepositFirst}>
              {editingId
                ? (en ? 'Save changes' : '保存修改')
                : mode === 'full' ? (en ? 'Create full payment link' : '生成全款链接') : (en ? 'Create first and balance links' : '生成首款和尾款链接')}
            </Button>
            <Button block icon={<EyeOutlined />} style={{ marginTop: 8 }} disabled={!activeChannel?.plan || !shown.length} onClick={() => previewDraft(mode)}>
              {en ? 'Preview customer page' : '预览用户页面'}
            </Button>
            {!ready && (
              <Typography.Text type="secondary" className="pl-summary__todo">
                {!linkedUserId
                  ? (en ? 'Select a customer to continue.' : '选中客户后才能生成。')
                  : !pickedMethods.length
                    ? (en ? 'Select at least one payment method.' : '至少选择一种支付方式。')
                    : mode === 'deposit' && !firstValid
                      ? (en ? 'Enter a valid first payment.' : '请填写有效的首款金额。')
                      : ''}
              </Typography.Text>
            )}
          </Card>
        </div>
      </div>
    )
  }

  type ListRow = PaymentLink & { balance?: PaymentLink }

  const legStatus = (row: PaymentLink) => {
    if (row.orderId) return <Tag color="success" bordered={false}>{en ? 'Paid' : '已支付'}</Tag>
    if (hasBankTransfer(row)) return <Tag color="warning" bordered={false}>{en ? 'Awaiting manager' : '待管理员确认'}</Tag>
    return <Tag color="processing" bordered={false}>{en ? 'Waiting for callback' : '等待支付回调'}</Tag>
  }

  const paidVia = (row: PaymentLink) => {
    if (!row.paidMethod) return ''
    const method = methodsForLine(row.line).find((item) => item.code === row.paidMethod)
    return method ? methodDisplayName(method, en ? 'en' : 'zh') : row.paidMethod
  }

  const methodNames = (row: PaymentLink) => {
    const all = methodsForLine(row.line)
    return (row.methods || [])
      .map((code) => all.find((item) => item.code === code))
      .filter((item): item is NonNullable<typeof item> => !!item)
      .map((item) => methodDisplayName(item, en ? 'en' : 'zh'))
      .join(' / ')
  }

  const legRef = (row: PaymentLink) => orders
    .find((order) => order.orderId === row.orderId)?.transactions
    .find((txn) => txn.id === subOrderNoFor(row.id))?.channelRef || ''

  const saveLegMethods = () => {
    if (!methodTarget) return
    if (!methodDraft.length) {
      message.warning(en ? 'Select at least one payment method' : '请至少选择一种支付方式')
      return
    }
    persist(links.map((item) => {
      if (item.id !== methodTarget.id) return item
      const next = { ...item, methods: methodDraft, updatedAt: nowText() }
      return { ...next, url: buildUrl(next) }
    }))
    setMethodTarget(null)
    message.success(en ? 'Payment methods updated. The link stays the same.' : '支付方式已更新，链接地址不变。')
  }

  const methodsCell = (row: PaymentLink) => {
    const all = methodsForLine(row.line)
    const picked = (row.methods || []).map((code) => all.find((item) => item.code === code)).filter((item): item is NonNullable<typeof item> => !!item)
    if (!picked.length) return '—'
    return (
      <div className="pl-methods">
        {picked.map((method) => (
          <span key={method.code} className="pl-method">
            <img src={method.icon} alt="" />
            {methodDisplayName(method, en ? 'en' : 'zh')}
          </span>
        ))}
      </div>
    )
  }

  const confirmButton = (row: PaymentLink) => (canConfirmBank && canMarkBankPaid(row, links) ? (
    <Button size="small" type="primary" onClick={() => markBankPaid(row)}>
      {row.kind === 'deposit_first'
        ? (en ? 'Confirm first transfer' : '确认首款已转账')
        : (en ? 'Confirm transfer & open membership' : '确认已转账并开通会员')}
    </Button>
  ) : null)

  const linkActions = (row: PaymentLink, copyLabel: string) => (
    <Space size={4} wrap>
      <Button size="small" type="link" icon={<CopyOutlined />} onClick={() => copyText(row.url)}>{copyLabel}</Button>
      <Button size="small" type="link" icon={<QrcodeOutlined />} onClick={() => setQrTarget(row)}>{en ? 'QR' : '二维码'}</Button>
      <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => window.open(row.url, '_blank')}>{en ? 'Preview' : '预览'}</Button>
    </Space>
  )

  const depositProgress = (row: ListRow) => {
    const legs = [row, row.balance].filter((item): item is PaymentLink => !!item)
    const paid = legs.filter((item) => item.orderId).length
    const label = paid === legs.length
      ? (en ? 'Fully paid' : '已付清')
      : paid === 0
        ? (en ? 'First payment pending' : '待付首款')
        : (en ? 'Balance pending' : '待付尾款')
    return (
      <div className="pl-progress">
        <div className="pl-progress__bar">
          {legs.map((item) => <span key={item.id} className={item.orderId ? 'is-done' : ''} />)}
        </div>
        <span className="pl-progress__text">{label} · {paid}/{legs.length}</span>
      </div>
    )
  }

  const columns = [
    {
      title: en ? 'Type' : '类型',
      key: 'kind',
      width: 96,
      render: (_: unknown, row: ListRow) => (row.kind === 'full'
        ? <Tag color="green">{en ? 'Full' : '全款'}</Tag>
        : <Tag color="orange">{en ? 'Deposit' : '定金'}</Tag>),
    },
    {
      title: 'User ID',
      dataIndex: 'userId',
      width: 220,
      render: (userId: string | undefined) => <Typography.Text copyable={!!userId}>{userId || '—'}</Typography.Text>,
    },
    {
      title: en ? 'Channel / SKU' : '渠道 / SKU',
      width: 230,
      render: (_: unknown, row: ListRow) => (
        <div className="pl-two-line">
          <span>{row.channelName || '—'}</span>
          <Typography.Text type="secondary">{(row.offers || []).map((item) => item.skuName).join(' / ') || row.skuName}</Typography.Text>
        </div>
      ),
    },
    {
      title: en ? 'Amount' : '金额',
      width: 210,
      render: (_: unknown, row: ListRow) => {
        if (row.kind === 'deposit_first') {
          return (
            <div className="pl-two-line">
              <b>{formatMoney(row.payable, row.currency)}</b>
              <Typography.Text type="secondary">
                {en ? 'First' : '首款'} {formatMoney(row.amount, '')} + {en ? 'balance' : '尾款'} {formatMoney(row.balance?.amount || 0, '')}
              </Typography.Text>
            </div>
          )
        }
        const prices = (row.offers || []).map((item) => item.payable).filter((value) => value > 0)
        if (prices.length > 1) {
          return (
            <div className="pl-two-line">
              <b>{formatMoney(Math.min(...prices), '')} – {formatMoney(Math.max(...prices), row.currency)}</b>
              <Typography.Text type="secondary">{en ? `${prices.length} SKUs, customer picks one` : `${prices.length} 个 SKU，用户选一个`}</Typography.Text>
            </div>
          )
        }
        return <b>{formatMoney(prices[0] || row.amount || row.payable, row.currency)}</b>
      },
    },
    {
      title: en ? 'Payment methods' : '支付方式',
      width: 200,
      render: (_: unknown, row: ListRow) => methodsCell(row),
    },
    {
      title: en ? 'Status' : '状态',
      width: 170,
      render: (_: unknown, row: ListRow) => {
        if (row.kind === 'deposit_first') return depositProgress(row)
        return (
          <div className="pl-two-line">
            {legStatus(row)}
            {row.orderId && <Typography.Text type="secondary">{paidVia(row)}</Typography.Text>}
            {row.orderId && legRef(row) && <Typography.Text type="secondary" className="pl-leg__id">{legRef(row)}</Typography.Text>}
          </div>
        )
      },
    },
    {
      title: en ? 'Order' : '订单',
      width: 190,
      render: (_: unknown, row: ListRow) => (row.orderId
        ? <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/orders/${row.orderId}`)}>{row.orderId}</Button>
        : <Typography.Text type="secondary">{en ? 'Created on first payment' : '首笔到账后生成'}</Typography.Text>),
    },
    {
      title: en ? 'Created / Updated' : '创建 / 更新',
      width: 150,
      render: (_: unknown, row: ListRow) => {
        const updated = [row.updatedAt, row.balance?.updatedAt].filter(Boolean).sort().pop() || row.createdAt
        return (
          <div className="pl-two-line">
            <span>{row.createdAt}</span>
            <Typography.Text type="secondary">{updated}</Typography.Text>
          </div>
        )
      },
    },
    {
      title: en ? 'Actions' : '操作',
      key: 'actions',
      width: 230,
      fixed: 'right' as const,
      render: (_: unknown, row: ListRow) => {
        if (row.kind === 'deposit_first') {
          return !row.orderId
            ? <Button size="small" type="link" icon={<EditOutlined />} onClick={() => startEdit(row)}>{en ? 'Edit deposit' : '编辑定金'}</Button>
            : <Typography.Text type="secondary">{en ? 'Expand for each payment' : '展开查看两笔收款'}</Typography.Text>
        }
        return (
          <Space direction="vertical" size={4}>
            {linkActions(row, en ? 'Copy link' : '复制链接')}
            <Space size={4}>
              {!row.orderId && <Button size="small" type="link" icon={<EditOutlined />} onClick={() => startEdit(row)}>{en ? 'Edit' : '编辑'}</Button>}
              {confirmButton(row)}
            </Space>
          </Space>
        )
      },
    },
  ]

  const depositLegs = (row: ListRow) => {
    const legs: { leg: PaymentLink; name: string; copy: string }[] = [
      { leg: row, name: en ? 'First payment' : '首款', copy: en ? 'Copy first-payment link' : '复制定金收款链接' },
      ...(row.balance ? [{ leg: row.balance, name: en ? 'Balance' : '尾款', copy: en ? 'Copy balance link' : '复制尾款链接' }] : []),
    ]
    return (
      <div className="pl-legs">
        {legs.map(({ leg, name, copy }, index) => (
          <div key={leg.id} className={`pl-leg${leg.orderId ? ' is-paid' : ''}`}>
            <div className="pl-leg__step">
              <span className="pl-leg__dot">{leg.orderId ? '✓' : index + 1}</span>
            </div>
            <div className="pl-leg__name">
              <b>{name}</b>
              <Typography.Text type="secondary" className="pl-leg__id">{subOrderNoFor(leg.id)}</Typography.Text>
            </div>
            <div className="pl-leg__amount">{formatMoney(leg.amount, leg.currency)}</div>
            <div className="pl-leg__status">
              <div className="pl-leg__status-line">
                {legStatus(leg)}
                {leg.orderId
                  ? <Typography.Text type="secondary">{paidVia(leg)}</Typography.Text>
                  : <Typography.Text type="secondary">{methodNames(leg)}</Typography.Text>}
              </div>
              {leg.orderId && legRef(leg) && <Typography.Text type="secondary" className="pl-leg__id">{legRef(leg)}</Typography.Text>}
            </div>
            <div className="pl-leg__actions">
              {linkActions(leg, copy)}
              {!leg.orderId && (
                <Button size="small" type="link" icon={<EditOutlined />} onClick={() => { setMethodTarget(leg); setMethodDraft(leg.methods || []) }}>
                  {en ? 'Methods' : '改支付方式'}
                </Button>
              )}
              {confirmButton(leg)}
            </div>
          </div>
        ))}
        <div className="pl-legs__note">
          {row.orderId
            ? (en ? `Each payment is its own sub-order. Both sit under main order ${row.orderId}, like App renewals under one subscription.` : `每笔收款是一张子订单，都挂在主订单 ${row.orderId} 下，和 App 续费挂在同一条订阅链上是一个做法。`)
            : (en ? 'Each payment is its own sub-order. The first payment\'s sub-order number becomes the main order number, and the balance joins that main order.' : '每笔收款是一张子订单。首款子订单号就是主订单号，尾款到账后挂到同一张主订单下。')}
        </div>
      </div>
    )
  }

  const textMatch = (row: PaymentLink) => {
    if (!keyword.trim()) return true
    return [row.userId, row.id, row.channelName, row.skuName].join(' ').toLowerCase().includes(keyword.trim().toLowerCase())
  }
  const sceneMatch = (row: ListRow, value: Scene) => {
    const legs = [row, row.balance].filter((item): item is PaymentLink => !!item)
    const isDeposit = row.kind === 'deposit_first'
    if (value === 'confirm') return legs.some((item) => canMarkBankPaid(item, links))
    if (value === 'first') return isDeposit && !row.orderId
    if (value === 'balance') return isDeposit && !!row.orderId && !!row.balance && !row.balance.orderId
    if (value === 'full_wait') return row.kind === 'full' && !row.orderId
    if (value === 'done') return legs.every((item) => item.orderId)
    return true
  }
  const allRows: ListRow[] = links
    .filter((row) => row.kind !== 'deposit_balance')
    .map((row) => ({
      ...row,
      balance: row.kind === 'deposit_first'
        ? links.find((item) => item.kind === 'deposit_balance' && !!item.depositPlanId && item.depositPlanId === row.depositPlanId)
        : undefined,
    }))
  const baseRows = allRows.filter((row) => {
    const legs = [row, row.balance].filter((item): item is PaymentLink => !!item)
    if (!legs.some(textMatch)) return false
    if (typeFilter === 'full' && row.kind !== 'full') return false
    if (typeFilter === 'deposit' && row.kind !== 'deposit_first') return false
    if (lineFilter && row.line !== lineFilter) return false
    if (channelFilter && row.channelId !== channelFilter) return false
    if (onlyMine && row.createdBy !== myEmail) return false
    return true
  })
  const rows = baseRows.filter((row) => sceneMatch(row, scene))
  const sceneOptions: { value: Scene; label: string }[] = [
    { value: 'all', label: en ? 'All' : '全部' },
    { value: 'confirm', label: en ? 'Transfer to confirm' : '待确认转账' },
    { value: 'first', label: en ? 'First payment due' : '待付首款' },
    { value: 'balance', label: en ? 'Balance due' : '待付尾款' },
    { value: 'full_wait', label: en ? 'Full payment due' : '全款待支付' },
    { value: 'done', label: en ? 'Completed' : '已完成' },
  ]
  const lineOptions = Array.from(new Set(allRows.map((row) => row.line).filter(Boolean)))
    .map((value) => ({ value, label: enValue(value) }))
  const channelOptions = Array.from(
    new Map(allRows.filter((row) => !lineFilter || row.line === lineFilter).filter((row) => row.channelId).map((row) => [row.channelId, row.channelName])).entries(),
  ).map(([value, label]) => ({ value, label }))
  const filtersOn = !!(keyword || typeFilter || lineFilter || channelFilter || onlyMine || scene !== 'all')
  const clearFilters = () => {
    setKeyword('')
    setTypeFilter(undefined)
    setLineFilter(undefined)
    setChannelFilter(undefined)
    setOnlyMine(false)
    setScene('all')
  }
  const depositKey = rows.filter((row) => row.kind === 'deposit_first').map((row) => row.id).sort().join('|')
  useEffect(() => {
    setExpanded(depositKey ? depositKey.split('|') : [])
  }, [depositKey])

  const openCreate = (kind: 'full' | 'deposit') => {
    setEditingId(null)
    resetCustomer()
    setTab(kind)
    setScreen('form')
  }

  if (screen === 'form') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
        <div className="pl-form-head">
          <Button icon={<ArrowLeftOutlined />} onClick={() => { setEditingId(null); setScreen('list') }}>{en ? 'Back to list' : '返回列表'}</Button>
          <div className="pl-form-head__title">
            <Typography.Title level={5} style={{ margin: 0 }}>
              {editingId
                ? (tab === 'full' ? (en ? 'Edit full payment link' : '编辑全款支付链接') : (en ? 'Edit deposit links' : '编辑定金支付链接'))
                : (tab === 'full' ? (en ? 'New full payment link' : '新建全款支付链接') : (en ? 'New deposit links' : '新建定金支付链接'))}
            </Typography.Title>
            <Typography.Text type="secondary">
              {tab === 'full'
                ? (en ? 'The customer pays the package in one payment.' : '用户一次付清套餐。')
                : (en ? 'The customer pays a first payment now and the balance later.' : '用户先付首款，之后再付尾款。')}
            </Typography.Text>
          </div>
          {!editingId && (
            <Segmented
              className="pl-form-head__switch"
              value={tab}
              onChange={(value) => { setTab(value as 'full' | 'deposit'); setFirstAmount(null) }}
              options={[
                { value: 'full', label: en ? 'Full payment' : '全款' },
                { value: 'deposit', label: en ? 'Deposit' : '定金' },
              ]}
            />
          )}
        </div>
        {formCard(tab)}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Segmented
          value={scene}
          onChange={(value) => setScene(value as Scene)}
          options={sceneOptions.map((item) => {
            const count = baseRows.filter((row) => sceneMatch(row, item.value)).length
            return {
              value: item.value,
              label: (
                <span className="pl-scene">
                  {item.label}
                  <span className={`pl-scene__count${item.value === 'confirm' && count ? ' is-alert' : ''}`}>{count}</span>
                </span>
              ),
            }
          })}
        />
        <Space>
          <Button type="primary" icon={<LinkOutlined />} onClick={() => openCreate('full')}>{en ? 'New full payment link' : '新建全款支付链接'}</Button>
          <Button icon={<LinkOutlined />} onClick={() => openCreate('deposit')}>{en ? 'New deposit link' : '新建定金支付链接'}</Button>
        </Space>
      </div>
      <Space wrap>
        <Input.Search allowClear placeholder={en ? 'User ID / link ID' : 'User ID / 链接 ID'} value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ width: 220 }} />
        <Select allowClear placeholder={en ? 'Type' : '类型'} value={typeFilter} onChange={setTypeFilter} style={{ width: 120 }}
          options={[
            { value: 'full', label: en ? 'Full' : '全款' },
            { value: 'deposit', label: en ? 'Deposit' : '定金' },
          ]}
        />
        <Select allowClear placeholder={en ? 'Business line' : '业务线'} value={lineFilter} style={{ width: 150 }} options={lineOptions}
          onChange={(value) => { setLineFilter(value); setChannelFilter(undefined) }}
        />
        <Select allowClear showSearch optionFilterProp="label" placeholder={en ? 'Channel' : '渠道'} value={channelFilter} onChange={setChannelFilter} style={{ width: 200 }} options={channelOptions} />
        <Checkbox checked={onlyMine} onChange={(event) => setOnlyMine(event.target.checked)}>{en ? 'Created by me' : '只看我创建的'}</Checkbox>
        {filtersOn && <Button type="link" onClick={clearFilters}>{en ? 'Clear filters' : '清空筛选'}</Button>}
      </Space>
      <Alert
        type="info"
        showIcon
        message={en
          ? 'A deposit creates a first-payment link and a balance link together. Expand a deposit to copy each link. Bank transfers are confirmed by an admin, ops, or a sales lead.'
          : '定金会同时生成首款和尾款两条链接，展开即可分别复制。银行转账由管理员、运营或销售组长确认到账。'}
      />
      <Table
        className="pl-table"
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 1660 }}
        expandable={{
          expandedRowKeys: expanded,
          onExpandedRowsChange: (keys) => setExpanded(keys.map(String)),
          rowExpandable: (row: ListRow) => row.kind === 'deposit_first',
          expandedRowRender: (row: ListRow) => depositLegs(row),
          expandIcon: ({ expanded: open, expandable, record, onExpand }) => (expandable ? (
            <Button
              type="text"
              size="small"
              icon={open ? <DownOutlined /> : <RightOutlined />}
              onClick={(event) => onExpand(record, event)}
            />
          ) : null),
        }}
        rowClassName={(row: ListRow) => (row.kind === 'deposit_first' && expanded.includes(row.id) ? 'pl-row--open' : '')}
        locale={{ emptyText: en ? 'No payment links yet' : '还没有支付链接' }}
      />
      <Modal
        title={methodTarget?.kind === 'deposit_balance' ? (en ? 'Balance payment methods' : '尾款支付方式') : (en ? 'Payment methods' : '支付方式')}
        open={!!methodTarget}
        onCancel={() => setMethodTarget(null)}
        onOk={saveLegMethods}
        okText={en ? 'Save' : '保存'}
        cancelText={en ? 'Cancel' : '取消'}
      >
        <Typography.Paragraph type="secondary">
          {en
            ? 'Each payment is chosen separately, so this one can differ from the other. Instalment methods are not available for deposits. The link address does not change.'
            : '每一笔单独选择支付方式，可以和另一笔不同。定金不支持分期类支付方式。修改后链接地址不变。'}
        </Typography.Paragraph>
        <Checkbox.Group value={methodDraft} onChange={(value) => setMethodDraft(value as string[])}>
          <Space direction="vertical">
            {methodTarget && depositMethods(methodTarget.line).map((method) => (
              <Checkbox key={method.code} value={method.code}>
                <span className="pl-method">
                  <img src={method.icon} alt="" />
                  {methodDisplayName(method, en ? 'en' : 'zh')}
                </span>
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      </Modal>
      <Modal
        title={en ? 'Payment link QR code' : '支付链接二维码'}
        open={!!qrTarget}
        onCancel={() => setQrTarget(null)}
        footer={[
          <Button key="close" onClick={() => setQrTarget(null)}>{en ? 'Close' : '关闭'}</Button>,
          <Button
            key="download"
            type="primary"
            disabled={!qrImage}
            onClick={() => {
              const link = document.createElement('a')
              link.href = qrImage
              link.download = `${qrTarget?.id || 'payment-link'}.png`
              link.click()
            }}
          >{en ? 'Download QR code' : '下载二维码'}</Button>,
        ]}
      >
        <Space direction="vertical" align="center" style={{ width: '100%' }}>
          {qrImage && <img src={qrImage} alt="" width={280} height={280} />}
          <Typography.Text type="secondary">{en ? 'Scanning opens the same payment page as the link.' : '扫码打开的页面和复制链接是同一个。'}</Typography.Text>
        </Space>
      </Modal>
    </div>
  )
}
