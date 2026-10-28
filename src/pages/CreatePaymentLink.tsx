import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Checkbox,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import { CopyOutlined, EditOutlined, EyeOutlined, LinkOutlined, QrcodeOutlined } from '@ant-design/icons'
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
import { ensurePaymentLinkOrders, settlePaymentLink } from '../paymentLinkStore'
import { methodsForLine } from '../paymentMethods'

const STORE_KEY = 'dino-cc-payment-links-v3'

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
}

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
      orderId: 'WEB-PL-TH', paidMethod: 'KPLUS',
      url: '', received: true, createdAt: '2026-10-28 11:05', updatedAt: '2026-10-28 11:20',
    }),
    blank({
      id: 'PL-BAL-VN', kind: 'deposit_balance', depositPlanId: 'DP-VN-DONE', sourceLinkId: 'PL-DEP-VN',
      line: 'Vietnam', channelId: 'sales_linh_nguyen', channelName: 'Linh Nguyen', channelCode: 'CH-VN-0005',
      planId: 'CSP-LINH', offers: vnQuarterly, skuId: 'VN-Q-2026', skuName: 'Pro Quarterly', currency: 'VND',
      listPrice: 990000, promoCode: 'CSP-LINH-PROMO', promoLabel: 'CSP-LINH-PROMO', payable: 891000, amount: 391000, depositPaid: 500000,
      phone: '', customerName: '', note: '', methods: ['bank_transfer'], userId: '2090031938694049793',
      orderId: 'WEB-PL-DEP-DONE', paidMethod: 'bank_transfer',
      url: '', received: true, createdAt: '2026-10-28 14:10', updatedAt: '2026-10-28 16:05',
    }),
    blank({
      id: 'PL-DEP-VN', kind: 'deposit_first', depositPlanId: 'DP-VN-DONE',
      line: 'Vietnam', channelId: 'sales_linh_nguyen', channelName: 'Linh Nguyen', channelCode: 'CH-VN-0005',
      planId: 'CSP-LINH', offers: vnQuarterly, skuId: 'VN-Q-2026', skuName: 'Pro Quarterly', currency: 'VND',
      listPrice: 990000, promoCode: 'CSP-LINH-PROMO', promoLabel: 'CSP-LINH-PROMO', payable: 891000, amount: 500000,
      phone: '', customerName: '', note: '', methods: ['bank_transfer'], userId: '2090031938694049793',
      orderId: 'WEB-PL-DEP-DONE', paidMethod: 'bank_transfer',
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
      orderId: 'WEB-PL-DEP-PART', paidMethod: 'vietqr',
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
      orderId: 'WEB-PL-FULL-001', paidMethod: 'card',
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
    orderId: 'WEB-PL-FULL-001', productName: 'Pro · Pro Quarterly', studentId: '2060199610824355846', userStatus: '付费' as const,
    orderStatus: '已支付' as const, originalPrice: 89100, paidAmount: 89100, payMethod: 'Payment Link' as const, currency: 'KRW',
    paidTime: '2026-10-27 16:20:00',
    transactions: [
      { id: 'TXN-WEB-PL-FULL-001-full', time: '2026-10-27 16:20:00', event: '支付成功', status: '已支付' as const, amount: 89100, paymentMethod: 'card', note: 'Payment link PL-FULL-PAID' },
    ],
  },
  {
    orderId: 'WEB-PL-DEP-PART', productName: 'Pro · Pro Quarterly', studentId: '2060199610824356009', userStatus: '未付费-体验中' as const,
    orderStatus: '待支付' as const, originalPrice: 891000, paidAmount: 500000, payMethod: 'Payment Link' as const, currency: 'VND',
    transactions: [
      { id: 'TXN-WEB-PL-DEP-PART-deposit_first', time: '2026-10-28 09:40:00', event: '定金首款支付成功', status: '已支付' as const, amount: 500000, paymentMethod: 'vietqr', note: 'Payment link PL-DEP-READY' },
    ],
  },
  {
    orderId: 'WEB-PL-TH', productName: 'Pro · Pro Quarterly', studentId: '2060199610824355848', userStatus: '未付费-体验中' as const,
    orderStatus: '待支付' as const, originalPrice: 9900, paidAmount: 990, payMethod: 'Payment Link' as const, currency: 'THB',
    transactions: [
      { id: 'TXN-WEB-PL-TH-deposit_first', time: '2026-10-28 11:20:00', event: '定金首款支付成功', status: '已支付' as const, amount: 990, paymentMethod: 'KPLUS', note: 'Payment link PL-DEP-TH' },
    ],
  },
  {
    orderId: 'WEB-PL-DEP-DONE', productName: 'Pro · Pro Quarterly', studentId: '2090031938694049793', userStatus: '付费' as const,
    orderStatus: '已支付' as const, originalPrice: 891000, paidAmount: 891000, payMethod: 'Payment Link' as const, currency: 'VND',
    paidTime: '2026-10-28 16:05:00',
    transactions: [
      { id: 'TXN-WEB-PL-DEP-DONE-deposit_first', time: '2026-10-27 18:48:00', event: '定金首款支付成功', status: '已支付' as const, amount: 500000, paymentMethod: 'bank_transfer', note: 'Payment link PL-DEP-VN' },
      { id: 'TXN-WEB-PL-DEP-DONE-deposit_balance', time: '2026-10-28 16:05:00', event: '尾款支付成功', status: '已支付' as const, amount: 391000, paymentMethod: 'bank_transfer', note: 'Payment link PL-BAL-VN' },
    ],
  },
]

function loadLinks(): PaymentLink[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch {
    /* seed below */
  }
  const seeded = buildSeedLinks()
  saveLinks(seeded)
  return seeded
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
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [qrTarget, setQrTarget] = useState<PaymentLink | null>(null)
  const [qrImage, setQrImage] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const holdLineReset = useRef(false)
  const navigate = useNavigate()
  const { role } = useCurrentAccount()
  const canConfirmBank = !role || role.id === 'role_admin' || role.id === 'role_ops' || role.id === 'role_sales_leader'
  const students = useStore((s) => s.students)
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
      methods: payMethods,
      userId: linkedUserId,
      orderId: editingId ? links.find((item) => item.id === editingId)?.orderId : undefined,
      url: '',
      received: false,
      createdAt: editingId ? (links.find((item) => item.id === editingId)?.createdAt || nowText()) : nowText(),
      updatedAt: nowText(),
      sourceLinkId: editingId ? links.find((item) => item.id === editingId)?.sourceLinkId : undefined,
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

  const formCard = (mode: 'full' | 'deposit') => (
    <Card>
      <Form layout="vertical">
        <Space size={16} align="start" wrap style={{ width: '100%' }}>
          <Form.Item label={en ? 'Business line' : '业务线'} style={{ minWidth: 180 }}>
            <Select
              value={activeLine || undefined}
              placeholder={en ? 'Select a line' : '选择业务线'}
              options={lines.map((item) => ({ value: item, label: item }))}
              onChange={onLine}
            />
          </Form.Item>
          <Form.Item label={en ? 'Channel' : '渠道'} required style={{ minWidth: 360 }}>
            <Select
              value={activeChannel?.channel.id}
              options={lineChannels.map((item) => ({
                value: item.channel.id,
                disabled: !item.plan,
                label: `${item.channel.name} · ${item.channel.channelCode || '—'} · ${item.channel.type || ''}${item.plan ? '' : (en ? ' · no price plan' : ' · 无价格方案')}`,
              }))}
              onChange={onChannel}
            />
          </Form.Item>
        </Space>
        <Form.Item
          label={en ? 'Channel SKU price plan' : '渠道 SKU 价格方案'}
          required
          extra={mode === 'deposit'
            ? (en
              ? 'A deposit link includes one SKU. If the customer wants another package, create a new link.'
              : '定金链接只能选一个 SKU。客户要换套餐时，新建一条链接，不要改这条。')
            : (en
              ? 'Every SKU on this channel plan is included. Choose whether the whole page uses the plan promo or list price.'
              : '价格方案里有几个 SKU 就全部展示。只选择整页使用优惠，或全部按原价。')}
        >
          {activeChannel?.plan ? (
            <div>
              <Select
                style={{ minWidth: 320, marginBottom: 12 }}
                disabled={!hasDiscount}
                value={hasDiscount && usePromo ? 'yes' : 'no'}
                options={hasDiscount
                  ? [
                    { value: 'yes', label: en ? `Use promo · ${activeChannel.plan.promoCode}` : `使用优惠 · ${activeChannel.plan.promoCode}` },
                    { value: 'no', label: en ? 'No promo (list price for every SKU)' : '不使用优惠（全部按原价）' },
                  ]
                  : [{ value: 'no', label: en ? 'No promo on this plan. Every SKU stays at list price.' : '当前方案无优惠，全部按原价售卖' }]}
                onChange={(value) => { setUsePromo(value === 'yes'); setFirstAmount(null) }}
              />
              {mode === 'deposit' ? (
                <Radio.Group
                  value={chosenDeposit?.skuId}
                  disabled={!!editingId}
                  onChange={(event) => { setDepositSkuId(event.target.value); setFirstAmount(null) }}
                >
                  <Space direction="vertical" size={4}>
                    {shown.map((offer) => (
                      <Radio key={offer.skuId} value={offer.skuId}>
                        <Tag color={offer.memberLevel === 'Max' ? 'gold' : 'purple'}>{offer.memberLevel}</Tag>
                        <b>{offer.skuName}</b>
                        {' · '}
                        {offer.payable !== offer.listPrice
                          ? <>{formatMoney(offer.listPrice, offer.currency)} → {formatMoney(offer.payable, offer.currency)}（{offer.ruleLabel}）</>
                          : <>{formatMoney(offer.listPrice, offer.currency)} · List price</>}
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              ) : (
              <Space direction="vertical" size={4}>
                {shown.map((offer) => (
                  <div key={offer.skuId}>
                    <Tag color={offer.memberLevel === 'Max' ? 'gold' : 'purple'}>{offer.memberLevel}</Tag>
                    <b>{offer.skuName}</b>
                    {' · '}
                    {offer.payable !== offer.listPrice
                      ? <>{formatMoney(offer.listPrice, offer.currency)} → {formatMoney(offer.payable, offer.currency)}（{offer.ruleLabel}）</>
                      : <>{formatMoney(offer.listPrice, offer.currency)} · List price</>}
                  </div>
                ))}
              </Space>
              )}
            </div>
          ) : (
            <Typography.Text type="secondary">{en ? 'Pick a channel that already has a price plan.' : '请选择已经配好价格方案的渠道。'}</Typography.Text>
          )}
        </Form.Item>
        <Space size={16} align="start" wrap>
          <Form.Item
            label="User ID"
            required
            style={{ minWidth: 320 }}
            extra={en
              ? 'Enter a phone number or a User ID. Matches are User IDs from the user database, and the saved value is the User ID.'
              : '可输入手机号或 User ID。输入时会匹配用户库里的 User ID，选中后保存的是 User ID。'}
          >
            <AutoComplete
              value={userQuery}
              options={userMatches.map((student) => ({ value: student.studentId }))}
              onChange={setUserQuery}
              onSelect={setUserQuery}
              placeholder={en ? 'Phone or User ID' : '手机号或 User ID'}
              style={{ width: '100%' }}
            />
          </Form.Item>
          {mode === 'deposit' && chosenDeposit && (
            <Form.Item
              label={en ? 'First payment' : '首款金额'}
              required
              style={{ minWidth: 220 }}
              extra={depositFloor(activeLine, chosenDeposit.payable).label || (en ? 'Greater than 0 and below the package price' : '大于 0，且小于套餐应付')}
            >
              <InputNumber
                min={depositFloor(activeLine, chosenDeposit.payable).min}
                max={Math.max(chosenDeposit.payable - 1, 1)}
                value={firstAmount}
                onChange={(value) => setFirstAmount(typeof value === 'number' ? value : null)}
                style={{ width: '100%' }}
                addonAfter={chosenDeposit.currency}
              />
            </Form.Item>
          )}
        </Space>
        <Form.Item
          label={en ? 'Payment methods' : '支付方式'}
          required
          extra={en ? 'Pick one method, or several. The customer page only shows the methods checked here.' : '可以只选一种，也可以多选。用户打开链接后，只会看到这里勾选的方式。'}
        >
          <Checkbox.Group value={payMethods} onChange={(value) => setPayMethods(value as string[])}>
            <Space size={[16, 8]} wrap>
              {methodsForLine(activeLine).map((method) => (
                <Checkbox key={method.code} value={method.code}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <img src={method.icon} alt="" width={22} height={22} style={{ objectFit: 'contain' }} />
                    {method.name}
                  </span>
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        </Form.Item>
        {mode === 'deposit' && chosenDeposit && (
          <Typography.Paragraph type="secondary">
            {en ? 'Balance after this first payment: ' : '付完这笔首款后，尾款为 '}
            <b>{formatMoney(Math.max(chosenDeposit.payable - Math.round(Number(firstAmount) || 0), 0), chosenDeposit.currency)}</b>
            {en ? '. Saving creates both the first-payment link and the balance link.' : '。保存后会同时生成首款链接和尾款链接。'}
          </Typography.Paragraph>
        )}
        <Button type="primary" icon={<LinkOutlined />} onClick={mode === 'full' ? createFull : createDepositFirst}>
          {editingId
            ? (en ? 'Save changes' : '保存修改')
            : mode === 'full' ? (en ? 'Create full payment link' : '生成全款链接') : (en ? 'Create first and balance links' : '生成首款和尾款链接')}
        </Button>
      </Form>
    </Card>
  )

  type ListRow = PaymentLink & { children?: PaymentLink[] }

  const statusOf = (row: PaymentLink) => {
    if (row.orderId) {
      const method = row.paidMethod === 'bank_transfer' ? (en ? 'Bank transfer' : '银行转账') : (row.paidMethod || '')
      return <Tag color="green">{en ? 'Paid' : '已支付'}{method ? ` · ${method}` : ''}</Tag>
    }
    if (hasBankTransfer(row)) return <Tag color="orange">{en ? 'Awaiting manager confirmation' : '待管理员确认支付'}</Tag>
    return <Tag>{en ? 'Waiting for payment callback' : '等待支付回调'}</Tag>
  }

  const amountOf = (row: PaymentLink) => {
    const prices = (row.offers || []).map((offer) => offer.payable).filter((value) => value > 0)
    if (row.kind === 'deposit_first' || row.kind === 'deposit_balance') return <b>{formatMoney(row.amount, row.currency)}</b>
    if (prices.length > 1) {
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      return <b>{min === max ? formatMoney(min, row.currency) : `${formatMoney(min, row.currency)} – ${formatMoney(max, row.currency)}`}</b>
    }
    return <b>{formatMoney(prices[0] || row.amount || row.payable, row.currency)}</b>
  }

  const actionsOf = (row: PaymentLink) => (
    <Space wrap>
      <Button size="small" icon={<EyeOutlined />} onClick={() => window.open(row.url, '_blank')}>{en ? 'Open page' : '打开页面'}</Button>
      <Button size="small" icon={<CopyOutlined />} onClick={() => copyText(row.url)}>
        {row.kind === 'deposit_first' ? (en ? 'Copy first-payment link' : '复制定金收款链接') : row.kind === 'deposit_balance' ? (en ? 'Copy balance link' : '复制尾款链接') : (en ? 'Copy' : '复制链接')}
      </Button>
      <Button size="small" icon={<QrcodeOutlined />} onClick={() => setQrTarget(row)}>{en ? 'QR code' : '二维码'}</Button>
      {!row.orderId && row.kind !== 'deposit_balance' && (
        <Button size="small" icon={<EditOutlined />} onClick={() => startEdit(row)}>{en ? 'Edit' : '编辑'}</Button>
      )}
      {canConfirmBank && canMarkBankPaid(row, links) && (
        <Button size="small" type="primary" onClick={() => markBankPaid(row)}>
          {row.kind === 'deposit_first'
            ? (en ? 'Confirm first transfer' : '确认首款已转账')
            : (en ? 'Confirm transfer and open membership' : '确认已转账并开通会员')}
        </Button>
      )}
      {row.orderId && (
        <Button size="small" type="link" onClick={() => navigate(`/orders/${row.orderId}`)}>{row.orderId}</Button>
      )}
    </Space>
  )

  const columns = [
    {
      title: en ? 'Type' : '类型',
      dataIndex: 'kind',
      width: 110,
      render: (kind: LinkKind) => {
        if (kind === 'full') return <Tag color="green">{en ? 'Full' : '全款'}</Tag>
        if (kind === 'deposit_first') return <Tag color="orange">{en ? 'Deposit first' : '定金首款'}</Tag>
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#d48806', fontFamily: 'monospace' }}>└</span>
            <Tag color="gold">{en ? 'Deposit balance' : '定金尾款'}</Tag>
          </span>
        )
      },
    },
    {
      title: 'User ID',
      dataIndex: 'userId',
      render: (userId: string | undefined) => userId || '—',
    },
    {
      title: en ? 'Channel / SKU' : '渠道 / SKU',
      render: (_: unknown, row: PaymentLink) => (
        <div>
          <div>{row.channelName || '—'}{row.channelCode ? ` · ${row.channelCode}` : ''}</div>
          <Typography.Text type="secondary">
            {(row.offers || []).map((offer) => offer.skuName).join(' / ') || row.skuName}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: en ? 'Link amount' : '链接金额',
      render: (_: unknown, row: PaymentLink) => amountOf(row),
    },
    {
      title: en ? 'Payment methods' : '包含的支付方式',
      render: (_: unknown, row: PaymentLink) => (row.methods || []).join(' / ') || '—',
    },
    {
      title: en ? 'Status' : '状态',
      render: (_: unknown, row: PaymentLink) => statusOf(row),
    },
    { title: en ? 'Created' : '创建时间', dataIndex: 'createdAt', width: 150 },
    { title: en ? 'Updated' : '更新时间', width: 150, render: (_: unknown, row: PaymentLink) => row.updatedAt || row.createdAt },
    {
      title: en ? 'Actions' : '操作',
      width: 420,
      render: (_: unknown, row: PaymentLink) => actionsOf(row),
    },
  ]

  const textMatch = (row: PaymentLink) => {
    if (!keyword.trim()) return true
    return [row.phone, row.userId, row.id, row.channelName, row.skuName].join(' ').toLowerCase().includes(keyword.trim().toLowerCase())
  }
  const statusMatch = (row: PaymentLink) => {
    if (statusFilter === 'paid') return !!row.orderId
    if (statusFilter === 'bank') return !row.orderId && hasBankTransfer(row)
    if (statusFilter === 'callback') return !row.orderId && !hasBankTransfer(row)
    return true
  }
  const rows: ListRow[] = links
    .filter((row) => row.kind !== 'deposit_balance')
    .map((row) => ({
      ...row,
      children: links.filter((item) => item.kind === 'deposit_balance' && item.depositPlanId && item.depositPlanId === row.depositPlanId),
    }))
    .filter((row) => {
      const kids = row.children || []
      const selfText = textMatch(row)
      const kidText = kids.some(textMatch)
      const selfStatus = statusMatch(row)
      const kidStatus = kids.some(statusMatch)
      if (!selfText && !kidText) return false
      if (typeFilter === 'full') return row.kind === 'full' && selfStatus
      if (typeFilter === 'deposit_first') return row.kind === 'deposit_first' && (selfStatus || kidStatus)
      if (typeFilter === 'deposit_balance') return kids.length > 0 && (selfStatus || kidStatus)
      if (statusFilter && !selfStatus && !kidStatus) return false
      return true
    })
  const pairKey = rows.filter((row) => row.children?.length).map((row) => row.id).sort().join('|')
  useEffect(() => {
    setExpanded(pairKey ? pairKey.split('|') : [])
  }, [pairKey])

  const openCreate = (kind: 'full' | 'deposit') => {
    setEditingId(null)
    resetCustomer()
    setTab(kind)
    setScreen('form')
  }

  if (screen === 'form') {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <Space>
          <Button onClick={() => { setEditingId(null); setScreen('list') }}>{en ? 'Back to list' : '返回列表'}</Button>
          <Typography.Text strong>
            {tab === 'full' ? (en ? 'Full payment link' : '全款支付链接') : (en ? 'Deposit payment link' : '定金支付链接')}
          </Typography.Text>
        </Space>
        {tab === 'deposit' && (
          <Alert
            type="info"
            showIcon
            message={en
              ? 'Saving creates the first-payment link and the balance link together. First payment opens one order as unpaid. Balance payment updates that same order. No second order is created.'
              : '保存后会同时生成首款链接和尾款链接。首款到账后只开一张待支付订单，尾款到账后回写同一张订单，不另开订单。'}
          />
        )}
        {formCard(tab)}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Space wrap>
          <Input allowClear placeholder={en ? 'User ID / link' : 'User ID / 链接'} value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ width: 220 }} />
          <Select allowClear placeholder={en ? 'Type' : '类型'} value={typeFilter} onChange={setTypeFilter} style={{ width: 140 }}
            options={[
              { value: 'full', label: en ? 'Full' : '全款' },
              { value: 'deposit_first', label: en ? 'Deposit first' : '定金首款' },
              { value: 'deposit_balance', label: en ? 'Deposit balance' : '定金尾款' },
            ]}
          />
          <Select allowClear placeholder={en ? 'Status' : '状态'} value={statusFilter} onChange={setStatusFilter} style={{ width: 180 }}
            options={[
              { value: 'callback', label: en ? 'Waiting for callback' : '等待支付回调' },
              { value: 'bank', label: en ? 'Awaiting manager confirmation' : '待管理员确认支付' },
              { value: 'paid', label: en ? 'Paid' : '已支付' },
            ]}
          />
        </Space>
        <Space>
          <Button type="primary" icon={<LinkOutlined />} onClick={() => openCreate('full')}>{en ? 'New full payment link' : '新建全款支付链接'}</Button>
          <Button icon={<LinkOutlined />} onClick={() => openCreate('deposit')}>{en ? 'New deposit link' : '新建定金支付链接'}</Button>
        </Space>
      </div>
      <Alert
        type="info"
        showIcon
        message={en
          ? 'A deposit plan creates both links at once. Status is only paid, waiting for callback, or awaiting manager confirmation. Bank transfer rows show “Confirm transfer and open membership” for admin, ops, or a sales lead. Regular CC accounts do not see that action.'
          : '定金会一次生成首款和尾款两条链接。状态只有已支付、等待支付回调、待管理员确认支付。包含银行转账的未支付记录，管理员、运营或销售组长会看到「确认已转账并开通会员」。普通 CC 看不到这个按钮。'}
      />
      <style>{`
        .paylink-first td { background: #fff7e6 !important; }
        .paylink-balance td { background: #fffbe6 !important; }
        .paylink-table .ant-table-row-indent { padding-left: 28px !important; }
      `}</style>
      <Table
        className="paylink-table"
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={rows}
        pagination={false}
        indentSize={28}
        expandable={{
          expandedRowKeys: expanded,
          onExpandedRowsChange: (keys) => setExpanded(keys.map(String)),
          rowExpandable: (row: ListRow) => !!row.children?.length,
        }}
        rowClassName={(row) => row.kind === 'deposit_first' ? 'paylink-first' : row.kind === 'deposit_balance' ? 'paylink-balance' : ''}
        locale={{ emptyText: en ? 'No payment links yet' : '还没有支付链接' }}
      />
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
