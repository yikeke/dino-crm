import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Checkbox,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import { CopyOutlined, EyeOutlined, LinkOutlined, ReloadOutlined } from '@ant-design/icons'
import { useI18n } from '../i18n'
import {
  channelsOnLine,
  formatMoney,
  linesInCatalog,
  loadMarketingCatalog,
  offersOnPlan,
  type LinkOffer,
} from '../paymentLinkCatalog'
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
  url: string
  received: boolean
  createdAt: string
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
  const [phone, setPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [note, setNote] = useState('')
  const [firstAmount, setFirstAmount] = useState<number | null>(null)
  const [payMethods, setPayMethods] = useState<string[]>([])
  const [tab, setTab] = useState<'full' | 'deposit'>('full')

  const reloadCatalog = () => setCatalog(loadMarketingCatalog())

  useEffect(() => {
    const onFocus = () => reloadCatalog()
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
  const hasDiscount = !!activeChannel?.plan?.promoCode && planOffers.some((offer) => offer.ruleLabel !== '原价')
  const shown = planOffers.map((offer) => (
    usePromo && hasDiscount ? offer : { ...offer, payable: offer.listPrice, ruleLabel: '原价' }
  ))
  const currency = shown[0]?.currency || ''
  const lowestPayable = shown.reduce((min, offer) => Math.min(min, offer.payable), shown[0]?.payable || 0)

  useEffect(() => {
    const next = lineChannels.find((item) => item.plan && item.channel.type === '销售') || lineChannels.find((item) => item.plan)
    const offers = offersOnPlan(next?.plan, catalog.skus)
    setChannelId(next?.channel.id || '')
    setUsePromo(!!next?.plan?.promoCode && offers.some((offer) => offer.ruleLabel !== '原价'))
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
    setPhone('')
    setCustomerName('')
    setNote('')
    setFirstAmount(null)
  }

  const onLine = (value: string) => {
    setLine(value)
  }

  const onChannel = (value: string) => {
    setChannelId(value)
    const next = lineChannels.find((item) => item.channel.id === value)
    const offers = offersOnPlan(next?.plan, catalog.skus)
    setUsePromo(!!next?.plan?.promoCode && offers.some((offer) => offer.ruleLabel !== '原价'))
    setFirstAmount(null)
  }

  const requireCustomer = () => {
    if (!activeChannel?.plan || !shown.length) {
      message.warning(en ? 'This channel has no active price plan' : '这个渠道还没有生效中的价格方案')
      return false
    }
    if (!phone.trim()) {
      message.warning(en ? 'Enter the customer phone' : '请填写客户手机号')
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
      phone: phone.trim(),
      customerName: customerName.trim(),
      note: note.trim(),
      methods: payMethods,
      url: '',
      received: false,
      createdAt: nowText(),
    }
  }

  const createFull = () => {
    if (!requireCustomer()) return
    const id = newId('PL')
    const amount = shown.length === 1 ? shown[0].payable : 0
    const row = baseFields('full', amount, '', id)
    row.url = buildUrl(row)
    persist([row, ...links])
    message.success(en ? 'Full payment link created' : '全款链接已生成')
    resetCustomer()
  }

  const createDepositFirst = () => {
    if (!requireCustomer()) return
    const amount = Math.round(Number(firstAmount) || 0)
    if (amount <= 0 || amount >= lowestPayable) {
      message.warning(en ? 'First payment must be greater than 0 and less than every package price on this plan' : '首款必须大于 0，且小于方案里每一个套餐的应付金额')
      return
    }
    const id = newId('PL')
    const planId = newId('DP')
    const row = baseFields('deposit_first', amount, planId, id)
    row.url = buildUrl(row)
    persist([row, ...links])
    message.success(en ? 'Deposit link created' : '定金首款链接已生成')
    resetCustomer()
  }

  const createBalance = (first: PaymentLink) => {
    const id = newId('PL')
    const row: PaymentLink = {
      ...first,
      id,
      kind: 'deposit_balance',
      amount: 0,
      payable: 0,
      depositPaid: first.amount,
      note: '',
      createdAt: nowText(),
      url: '',
    }
    row.url = buildUrl(row)
    persist([row, ...links])
    message.success(en ? 'Balance link created' : '尾款链接已生成')
  }

  const markReceived = (id: string) => {
    persist(links.map((item) => (item.id === id ? { ...item, received: true } : item)))
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
                    <b>{offer.skuName}</b>
                    {' · '}
                    {offer.payable !== offer.listPrice
                      ? <>{formatMoney(offer.listPrice, offer.currency)} → {formatMoney(offer.payable, offer.currency)}（{offer.ruleLabel}）</>
                      : <>{formatMoney(offer.listPrice, offer.currency)} · {en ? 'List price' : '原价'}</>}
                  </div>
                ))}
              </Space>
            </div>
          ) : (
            <Typography.Text type="secondary">{en ? 'Pick a channel that already has a price plan.' : '请选择已经配好价格方案的渠道。'}</Typography.Text>
          )}
        </Form.Item>
        <Space size={16} align="start" wrap>
          <Form.Item label={en ? 'Customer phone' : '客户手机号'} required style={{ minWidth: 220 }}>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+84…" />
          </Form.Item>
          <Form.Item label={en ? 'Customer name' : '客户姓名'} style={{ minWidth: 180 }}>
            <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
          </Form.Item>
          <Form.Item label={en ? 'Note' : '备注'} style={{ minWidth: 240 }}>
            <Input value={note} onChange={(event) => setNote(event.target.value)} />
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
          {mode === 'full' ? (en ? 'Create full payment link' : '生成全款链接') : (en ? 'Create first-payment link' : '生成首款链接')}
        </Button>
      </Form>
    </Card>
  )

  const columns = (mode: 'full' | 'deposit') => [
    { title: en ? 'Created' : '创建时间', dataIndex: 'createdAt', width: 150 },
    {
      title: en ? 'Type' : '类型',
      dataIndex: 'kind',
      width: 110,
      render: (kind: LinkKind) => {
        if (kind === 'full') return <Tag color="green">{en ? 'Full' : '全款'}</Tag>
        if (kind === 'deposit_first') return <Tag color="orange">{en ? 'First' : '定金首款'}</Tag>
        return <Tag color="gold">{en ? 'Balance' : '定金尾款'}</Tag>
      },
    },
    {
      title: en ? 'Customer' : '客户',
      render: (_: unknown, row: PaymentLink) => (
        <div>
          <div>{row.phone}</div>
          <Typography.Text type="secondary">{row.customerName || '—'}</Typography.Text>
        </div>
      ),
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
      title: en ? 'This link' : '本链接金额',
      render: (_: unknown, row: PaymentLink) => (
        <div>
          <b>{formatMoney(row.amount, row.currency)}</b>
          <div>
            <Typography.Text type="secondary">
              {en ? 'Package ' : '套餐应付 '}
              {formatMoney(row.payable, row.currency)}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Promo',
      dataIndex: 'promoCode',
      render: (code: string) => code ? <Typography.Text code>{code}</Typography.Text> : '—',
    },
    {
      title: en ? 'Methods' : '支付方式',
      render: (_: unknown, row: PaymentLink) => (row.methods || []).join(' / ') || '—',
    },
    {
      title: en ? 'Status' : '状态',
      render: (_: unknown, row: PaymentLink) => {
        if (row.kind === 'full') return row.received ? <Tag color="green">{en ? 'Received' : '已到账'}</Tag> : <Tag>{en ? 'Waiting' : '待转账'}</Tag>
        if (row.received) return <Tag color="green">{row.kind === 'deposit_first' ? (en ? 'First received' : '首款已到账') : (en ? 'Balance received' : '尾款已到账')}</Tag>
        return <Tag>{row.kind === 'deposit_first' ? (en ? 'Waiting for first' : '待收首款') : (en ? 'Waiting for balance' : '待收尾款')}</Tag>
      },
    },
    {
      title: en ? 'Actions' : '操作',
      width: 280,
      render: (_: unknown, row: PaymentLink) => {
        const balance = links.find((item) => item.kind === 'deposit_balance' && item.depositPlanId === row.depositPlanId)
        return (
          <Space wrap>
            <Button size="small" icon={<EyeOutlined />} onClick={() => window.open(row.url, '_blank')}>{en ? 'Open page' : '打开页面'}</Button>
            <Button size="small" icon={<CopyOutlined />} onClick={() => copyText(row.url)}>{en ? 'Copy' : '复制链接'}</Button>
            {!row.received && (
              <Button size="small" onClick={() => markReceived(row.id)}>{en ? 'Mark received' : '标记到账'}</Button>
            )}
            {mode === 'deposit' && row.kind === 'deposit_first' && row.received && !balance && (
              <Button size="small" type="primary" onClick={() => createBalance(row)}>{en ? 'Balance link' : '生成尾款链接'}</Button>
            )}
          </Space>
        )
      },
    },
  ]

  const fullRows = links.filter((item) => item.kind === 'full')
  const depositRows = links.filter((item) => item.kind !== 'full')

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Alert
        type="info"
        showIcon
        message={en ? 'Pick a channel. The payment link includes every SKU on that channel’s price plan, and you only choose whether to apply the promo.' : '先选渠道。链接带上该渠道价格方案里的全部 SKU，只选择用不用优惠。这是给某一个客户的 CC 支付链接，和落地页并列。'}
        action={<Button size="small" icon={<ReloadOutlined />} onClick={reloadCatalog}>{en ? 'Reload catalog' : '刷新货盘'}</Button>}
      />
      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as 'full' | 'deposit')}
        items={[
          {
            key: 'full',
            label: en ? 'Full Payment' : '全款支付',
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {formCard('full')}
                <Table rowKey="id" size="middle" columns={columns('full')} dataSource={fullRows} pagination={false} locale={{ emptyText: en ? 'No full payment links yet' : '还没有全款链接' }} />
              </Space>
            ),
          },
          {
            key: 'deposit',
            label: en ? 'Deposit' : '定金（首款 / 尾款）',
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {formCard('deposit')}
                <Table rowKey="id" size="middle" columns={columns('deposit')} dataSource={depositRows} pagination={false} locale={{ emptyText: en ? 'No deposit plans yet' : '还没有定金计划' }} />
              </Space>
            ),
          },
        ]}
      />
    </div>
  )
}
