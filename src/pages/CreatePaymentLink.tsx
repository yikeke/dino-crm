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
  const [skuIds, setSkuIds] = useState<string[]>([])
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
  const chosen = planOffers.filter((offer) => skuIds.includes(offer.skuId))
  const single = chosen.length === 1 ? chosen[0] : undefined
  const currency = single?.currency || chosen[0]?.currency || ''

  useEffect(() => {
    const next = lineChannels.find((item) => item.plan && item.channel.type === '销售') || lineChannels.find((item) => item.plan)
    setChannelId(next?.channel.id || '')
    setSkuIds(offersOnPlan(next?.plan, catalog.skus).map((offer) => offer.skuId))
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
    setSkuIds(offersOnPlan(next?.plan, catalog.skus).map((offer) => offer.skuId))
    setFirstAmount(null)
  }

  const requireCustomer = (mode: 'full' | 'deposit') => {
    if (!activeChannel?.plan) {
      message.warning(en ? 'This channel has no active price plan' : '这个渠道还没有生效中的价格方案')
      return false
    }
    if (!chosen.length) {
      message.warning(en ? 'Select at least one SKU from the price plan' : '请从价格方案里至少选择一个 SKU')
      return false
    }
    if (mode === 'deposit' && chosen.length !== 1) {
      message.warning(en ? 'A deposit link can include only one SKU' : '定金链接只能包含一个 SKU')
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
    const offer = chosen[0]
    const promo = activeChannel?.plan?.promoCode && chosen.some((item) => item.ruleLabel !== '原价')
      ? activeChannel.plan.promoCode
      : ''
    return {
      id,
      kind,
      depositPlanId,
      line: activeLine,
      channelId: activeChannel?.channel.id || '',
      channelName: activeChannel?.channel.name || '',
      channelCode: activeChannel?.channel.channelCode || '',
      planId: activeChannel?.plan?.id || '',
      offers: chosen,
      skuId: chosen.map((item) => item.skuId).join(','),
      skuName: chosen.map((item) => item.skuName).join(' / '),
      currency: offer?.currency || '',
      listPrice: offer?.listPrice || 0,
      promoCode: promo,
      promoLabel: promo,
      payable: kind === 'full' && chosen.length > 1 ? 0 : (offer?.payable || 0),
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
    if (!requireCustomer('full')) return
    const id = newId('PL')
    const amount = chosen.length === 1 ? chosen[0].payable : 0
    const row = baseFields('full', amount, '', id)
    row.url = buildUrl(row)
    persist([row, ...links])
    message.success(en ? 'Full payment link created' : '全款链接已生成')
    resetCustomer()
  }

  const createDepositFirst = () => {
    if (!requireCustomer('deposit') || !single) return
    const amount = Math.round(Number(firstAmount) || 0)
    if (amount <= 0 || amount >= single.payable) {
      message.warning(en ? 'First payment must be greater than 0 and less than the package price' : '首款必须大于 0，且小于套餐应付金额')
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
    const amount = first.payable - first.amount
    const row: PaymentLink = {
      ...first,
      id,
      kind: 'deposit_balance',
      amount,
      received: false,
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
          extra={mode === 'deposit'
            ? (en ? 'A deposit link keeps exactly one SKU from this plan. Promo comes with the plan.' : '定金链接从这套方案里只保留一个 SKU。优惠码跟着方案走，不用再单独选。')
            : (en ? 'Check one SKU, or several. The customer picks among them. Promo comes with the plan.' : '可以只放一个 SKU，也可以多选。用户打开后在这些 SKU 里选。优惠码跟着这套方案走。')}
        >
          {activeChannel?.plan ? (
            <div>
              <Typography.Paragraph style={{ marginBottom: 8 }}>
                {activeChannel.plan.promoCode
                  ? <><Tag>{activeChannel.plan.promoCode}</Tag>{en ? 'Promo on this plan' : '本方案 Promo Code'}</>
                  : (en ? 'This plan has no promo code. Selected SKUs sell at list price.' : '这套方案没有 Promo Code，选中的 SKU 按原价。')}
              </Typography.Paragraph>
              <Checkbox.Group value={skuIds} onChange={(value) => setSkuIds(value as string[])}>
                <Space direction="vertical">
                  {planOffers.map((offer) => (
                    <Checkbox key={offer.skuId} value={offer.skuId}>
                      {offer.skuName} · {formatMoney(offer.listPrice, offer.currency)}
                      {offer.ruleLabel !== '原价' ? ` → ${formatMoney(offer.payable, offer.currency)}（${offer.ruleLabel}）` : ` · ${offer.ruleLabel}`}
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
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
          {mode === 'deposit' && single && (
            <Form.Item label={en ? 'First payment' : '首款金额'} required style={{ minWidth: 180 }}>
              <InputNumber
                min={1}
                max={Math.max(single.payable - 1, 1)}
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
        {mode === 'deposit' && single && (
          <Typography.Paragraph type="secondary">
            {en ? 'Balance after this first payment: ' : '付完这笔首款后，尾款为 '}
            <b>{formatMoney(Math.max(single.payable - Math.round(Number(firstAmount) || 0), 0), currency)}</b>
            {en ? '. The balance link stays on the same SKU and channel plan.' : '。尾款链接仍用同一个 SKU 和这套渠道价格方案。'}
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
        message={en ? 'Pick a channel, then choose one or more SKUs from that channel’s price plan. The promo code belongs to the plan. This is the CC payment link for one customer, alongside landing pages.' : '先选渠道，再从该渠道的价格方案里勾选一个或多个 SKU。Promo Code 属于这套方案。这是给某一个客户的 CC 支付链接，和落地页并列。'}
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
