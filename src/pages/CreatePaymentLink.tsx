import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import { CopyOutlined, EditOutlined, EyeOutlined, InboxOutlined, LinkOutlined } from '@ant-design/icons'
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
import { settlePaymentLink } from '../paymentLinkStore'
import { methodsForLine } from '../paymentMethods'

const STORE_KEY = 'dino-cc-payment-links-v1'

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

function loadLinks(): PaymentLink[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function saveLinks(links: PaymentLink[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(links))
}

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

function bankTransferOnly(row: PaymentLink) {
  const methods = row.methods || []
  return methods.length > 0 && methods.every((code) => code === 'bank_transfer')
}

function canMarkBankPaid(row: PaymentLink) {
  if (row.orderId) return false
  return bankTransferOnly(row) || row.transferDeclared || row.paidMethod === 'bank_transfer'
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
  const [catalog, setCatalog] = useState(() => loadMarketingCatalog())
  const [links, setLinks] = useState<PaymentLink[]>(() => loadLinks())
  const [line, setLine] = useState('')
  const [channelId, setChannelId] = useState('')
  const [usePromo, setUsePromo] = useState(true)
  const [userQuery, setUserQuery] = useState('')
  const [firstAmount, setFirstAmount] = useState<number | null>(null)
  const [payMethods, setPayMethods] = useState<string[]>([])
  const [tab, setTab] = useState<'full' | 'deposit'>('full')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [screen, setScreen] = useState<'list' | 'form'>('list')
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [marking, setMarking] = useState<PaymentLink | null>(null)
  const [paidNote, setPaidNote] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const holdLineReset = useRef(false)
  const navigate = useNavigate()
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
  const currency = shown[0]?.currency || ''
  const lowestPayable = shown.reduce((min, offer) => Math.min(min, offer.payable), shown[0]?.payable || 0)

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
    const offer = shown[0]
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
      offers: shown,
      skuId: shown.map((item) => item.skuId).join(','),
      skuName: shown.map((item) => item.skuName).join(' / '),
      currency: offer?.currency || '',
      listPrice: offer?.listPrice || 0,
      promoCode: promo,
      promoLabel: promo,
      payable: shown.length === 1 ? offer.payable : 0,
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
    const amount = Math.round(Number(firstAmount) || 0)
    if (amount <= 0 || amount >= lowestPayable) {
      message.warning(en ? 'First payment must be greater than 0 and less than every package price on this plan' : '首款必须大于 0，且小于方案里每一个套餐的应付金额')
      return
    }
    const id = editingId || newId('PL')
    const planId = editingId ? (links.find((item) => item.id === editingId)?.depositPlanId || newId('DP')) : newId('DP')
    const row = baseFields('deposit_first', amount, planId, id)
    if (editingId) row.createdAt = links.find((item) => item.id === editingId)?.createdAt || row.createdAt
    row.url = buildUrl(row)
    persist(editingId ? links.map((item) => item.id === editingId ? row : item) : [row, ...links])
    setEditingId(null)
    setScreen('list')
    message.success(en ? 'Deposit link created' : '定金首款链接已生成')
    resetCustomer()
  }

  const createBalance = (first: PaymentLink) => {
    const id = newId('PL')
    const row: PaymentLink = {
      ...first,
      id,
      kind: 'deposit_balance',
      orderId: undefined,
      received: false,
      paidMethod: undefined,
      transferDeclared: false,
      sourceLinkId: first.id,
      depositPaid: first.amount,
      updatedAt: nowText(),
      note: '',
      createdAt: nowText(),
      url: '',
    }
    row.url = buildUrl(row)
    persist([row, ...links])
    setScreen('list')
    message.success(en ? 'Balance link created. When it is paid, the first payment order is updated. No second order is created.' : '尾款链接已生成。尾款支付后会更新首款那张订单，不另开订单。')
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
    setPayMethods(row.methods || [])
    setFirstAmount(row.kind === 'deposit_first' ? row.amount : null)
    setTab(row.kind === 'full' ? 'full' : 'deposit')
    setScreen('form')
  }

  const openMarkPaid = (row: PaymentLink) => {
    setMarking(row)
    setPaidNote('')
    setProof(null)
  }

  const confirmMarkPaid = () => {
    if (!marking || !proof) {
      message.warning(en ? 'Upload the payment screenshot' : '请上传用户支付截图')
      return
    }
    const first = marking.kind === 'deposit_balance'
      ? links.find((item) => item.kind === 'deposit_first' && item.depositPlanId === marking.depositPlanId)
      : undefined
    const offer = marking.offers?.[0]
    settlePaymentLink(marking.id, {
      methodName: 'bank_transfer',
      skuName: offer ? `${offer.memberLevel} · ${offer.skuName}` : marking.skuName,
      amount: marking.amount || offer?.payable || marking.payable,
      packageAmount: offer?.payable || marking.payable,
      currency: marking.currency,
      userId: marking.userId,
      note: paidNote.trim(),
      proofName: proof.name,
      leg: marking.kind,
      existingOrderId: first?.orderId,
    })
    setLinks(loadLinks())
    setMarking(null)
    message.success(en ? 'Marked paid' : '已标记为已支付')
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
          extra={en
            ? 'Every SKU on this channel plan is included. Choose whether the whole page uses the plan promo or list price.'
            : '价格方案里有几个 SKU 就全部展示。只选择整页使用优惠，或全部按原价。'}
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
          {mode === 'deposit' && shown.length > 0 && (
            <Form.Item label={en ? 'First payment' : '首款金额'} required style={{ minWidth: 180 }}>
              <InputNumber
                min={1}
                max={Math.max(lowestPayable - 1, 1)}
                value={firstAmount}
                onChange={(value) => setFirstAmount(typeof value === 'number' ? value : null)}
                style={{ width: '100%' }}
                addonAfter={currency}
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
        {mode === 'deposit' && shown.length > 0 && (
          <Typography.Paragraph type="secondary">
            {en ? 'Balance after this first payment: ' : '付完这笔首款后，尾款为 '}
            <b>{formatMoney(Math.max(lowestPayable - Math.round(Number(firstAmount) || 0), 0), currency)}</b>
            {en ? '. This first payment stays below every package, so the customer can still choose a SKU on the page.' : '。这笔首款低于方案里每一个套餐，用户仍可在页面上选择 SKU。'}
          </Typography.Paragraph>
        )}
        <Button type="primary" icon={<LinkOutlined />} onClick={mode === 'full' ? createFull : createDepositFirst}>
          {editingId
            ? (en ? 'Save changes' : '保存修改')
            : mode === 'full' ? (en ? 'Create full payment link' : '生成全款链接') : (en ? 'Create first-payment link' : '生成首款链接')}
        </Button>
      </Form>
    </Card>
  )

  const columns = (mode: 'full' | 'deposit') => [
    {
      title: en ? 'Type' : '类型',
      dataIndex: 'kind',
      width: 110,
      render: (kind: LinkKind) => {
        if (kind === 'full') return <Tag color="green">{en ? 'Full' : '全款'}</Tag>
        if (kind === 'deposit_first') return <Tag color="orange">{en ? 'Deposit first' : '定金首款'}</Tag>
        return <Tag color="gold">{en ? 'Deposit balance' : '定金尾款'}</Tag>
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
      render: (_: unknown, row: PaymentLink) => {
        const prices = (row.offers || []).map((offer) => offer.payable).filter((value) => value > 0)
        if (row.kind === 'deposit_first') return <b>{formatMoney(row.amount, row.currency)}</b>
        if (row.kind === 'deposit_balance') return <span>{en ? 'Balance of ' : '尾款，关联 '}{row.sourceLinkId || row.depositPlanId}</span>
        if (prices.length > 1) {
          const min = Math.min(...prices)
          const max = Math.max(...prices)
          return <b>{min === max ? formatMoney(min, row.currency) : `${formatMoney(min, row.currency)} – ${formatMoney(max, row.currency)}`}</b>
        }
        return <b>{formatMoney(prices[0] || row.amount || row.payable, row.currency)}</b>
      },
    },
    {
      title: en ? 'Payment methods' : '包含的支付方式',
      render: (_: unknown, row: PaymentLink) => (row.methods || []).join(' / ') || '—',
    },
    {
      title: en ? 'Status' : '状态',
      render: (_: unknown, row: PaymentLink) => {
        if (row.orderId) {
          const method = row.paidMethod === 'bank_transfer' ? (en ? 'Bank transfer' : '银行转账') : (row.paidMethod || '')
          return <Tag color="green">{en ? 'Paid' : '已支付'}{method ? ` · ${method}` : ''}</Tag>
        }
        if (canMarkBankPaid(row)) return <Tag color="orange">{en ? 'Awaiting transfer confirmation' : '待确认转账'}</Tag>
        return <Tag>{en ? 'Waiting for payment callback' : '等待支付回调'}</Tag>
      },
    },
    { title: en ? 'Created' : '创建时间', dataIndex: 'createdAt', width: 150 },
    { title: en ? 'Updated' : '更新时间', width: 150, render: (_: unknown, row: PaymentLink) => row.updatedAt || row.createdAt },
    {
      title: en ? 'Actions' : '操作',
      width: 280,
      render: (_: unknown, row: PaymentLink) => {
        const balance = links.find((item) => item.kind === 'deposit_balance' && item.depositPlanId === row.depositPlanId)
        return (
          <Space wrap>
            <Button size="small" icon={<EyeOutlined />} onClick={() => window.open(row.url, '_blank')}>{en ? 'Open page' : '打开页面'}</Button>
            <Button size="small" icon={<CopyOutlined />} onClick={() => copyText(row.url)}>{en ? 'Copy' : '复制链接'}</Button>
            {!row.orderId && (
              <Button size="small" icon={<EditOutlined />} onClick={() => startEdit(row)}>{en ? 'Edit' : '编辑'}</Button>
            )}
            {canMarkBankPaid(row) && (
              <Button size="small" onClick={() => openMarkPaid(row)}>{en ? 'Mark paid' : '标记已支付'}</Button>
            )}
            {row.orderId && (
              <Button size="small" type="link" onClick={() => navigate(`/orders/${row.orderId}`)}>{row.orderId}</Button>
            )}
            {row.kind === 'deposit_first' && row.orderId && !balance && (
              <Button size="small" type="primary" onClick={() => createBalance(row)}>{en ? 'Balance link' : '生成尾款链接'}</Button>
            )}
          </Space>
        )
      },
    },
  ]

  const rows = links.filter((row) => {
    const text = [row.phone, row.userId, row.id, row.channelName, row.skuName].join(' ').toLowerCase()
    if (keyword.trim() && !text.includes(keyword.trim().toLowerCase())) return false
    if (typeFilter && row.kind !== typeFilter) return false
    if (statusFilter === 'paid' && !row.orderId) return false
    if (statusFilter === 'bank' && !canMarkBankPaid(row)) return false
    if (statusFilter === 'callback' && (row.orderId || canMarkBankPaid(row))) return false
    return true
  })

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
              ? 'Deposit uses one order. The first payment opens it as partially paid. The balance link points at that order and, once paid, updates the same order. The two payments stay as separate lines.'
              : '定金只用一张订单。首款支付后订单是部分付款。尾款链接关联这张订单，付完后更新同一张订单，不另开订单。两笔付款各自保留。'}
          />
        )}
        {formCard(tab)}
        <Modal
          title={en ? 'Confirm bank transfer received' : '确认银行转账已支付'}
          open={!!marking}
          okText={en ? 'Confirm paid' : '确认已支付'}
          cancelText={en ? 'Cancel' : '取消'}
          okButtonProps={{ disabled: !proof }}
          onOk={confirmMarkPaid}
          onCancel={() => setMarking(null)}
          destroyOnClose
        >
          <Form layout="vertical">
            <Form.Item label={en ? 'Note' : '备注'}>
              <Input.TextArea rows={3} value={paidNote} onChange={(event) => setPaidNote(event.target.value)} placeholder={en ? 'Optional note for this transfer' : '可填写这笔转账的说明'} />
            </Form.Item>
            <Form.Item label={en ? 'Payment screenshot' : '用户支付截图'} required>
              <Upload.Dragger
                accept="image/*"
                maxCount={1}
                fileList={proof ? [{ uid: 'proof', name: proof.name, status: 'done' }] : []}
                beforeUpload={(file) => { setProof(file); return false }}
                onRemove={() => { setProof(null); return true }}
              >
                <p><InboxOutlined /></p>
                <p>{en ? 'Upload the customer’s transfer screenshot' : '上传用户的转账截图，确认后才会标记已支付'}</p>
              </Upload.Dragger>
            </Form.Item>
          </Form>
        </Modal>
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
              { value: 'bank', label: en ? 'Awaiting transfer confirmation' : '待确认转账' },
              { value: 'paid', label: en ? 'Paid' : '已支付' },
            ]}
          />
        </Space>
        <Space>
          <Button type="primary" icon={<LinkOutlined />} onClick={() => openCreate('full')}>{en ? 'New full payment link' : '新建全款支付链接'}</Button>
          <Button icon={<LinkOutlined />} onClick={() => openCreate('deposit')}>{en ? 'New deposit link' : '新建定金支付链接'}</Button>
        </Space>
      </div>
      <Table rowKey="id" size="middle" columns={columns('full')} dataSource={rows} pagination={false} locale={{ emptyText: en ? 'No payment links yet' : '还没有支付链接' }} />
      <Modal
        title={en ? 'Confirm bank transfer received' : '确认银行转账已支付'}
        open={!!marking}
        okText={en ? 'Confirm paid' : '确认已支付'}
        cancelText={en ? 'Cancel' : '取消'}
        okButtonProps={{ disabled: !proof }}
        onOk={confirmMarkPaid}
        onCancel={() => setMarking(null)}
        destroyOnClose
      >
        <Form layout="vertical">
          <Form.Item label={en ? 'Note' : '备注'}>
            <Input.TextArea rows={3} value={paidNote} onChange={(event) => setPaidNote(event.target.value)} placeholder={en ? 'Optional note for this transfer' : '可填写这笔转账的说明'} />
          </Form.Item>
          <Form.Item label={en ? 'Payment screenshot' : '用户支付截图'} required>
            <Upload.Dragger
              accept="image/*"
              maxCount={1}
              fileList={proof ? [{ uid: 'proof', name: proof.name, status: 'done' }] : []}
              beforeUpload={(file) => { setProof(file); return false }}
              onRemove={() => { setProof(null); return true }}
            >
              <p><InboxOutlined /></p>
              <p>{en ? 'Upload the customer’s transfer screenshot' : '上传用户的转账截图，确认后才会标记已支付'}</p>
            </Upload.Dragger>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
