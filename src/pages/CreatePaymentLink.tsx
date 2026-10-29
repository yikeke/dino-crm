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
  Dropdown,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { ArrowLeftOutlined, CopyOutlined, CrownOutlined, DownOutlined, EditOutlined, EyeOutlined, LinkOutlined, QrcodeOutlined, RightOutlined, StopOutlined } from '@ant-design/icons'
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
import dayjs from 'dayjs'
import { setState, useStore } from '../store'
import { useCurrentAccount } from '../perm'
import { useSession } from '../auth'
import {
  PREVIEW_LINK_ID,
  PREVIEW_LINK_KEY,
  completeOrder,
  currentStage,
  ensurePaymentLinkData,
  isExpired,
  now,
  payLinkUrl,
  readLinkOrders,
  readPaymentLinks,
  stageAmount,
  stageMethods,
  voidPaymentLink,
  writePaymentLinks,
  type LinkOrder,
  type PayStage,
  type PaymentLink,
} from '../paymentLinkStore'
import { enValue } from '../channel'
import { methodDisplayName, methodsForLine } from '../paymentMethods'
import './CreatePaymentLink.css'

type Scene = 'all' | 'confirm' | 'first' | 'balance' | 'full_wait' | 'done'

const OPEN_ORDER_PREVIEW = 10

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
  return now().slice(0, 16)
}

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
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
  const focusLinkId = searchParams.get('link') || ''
  const [catalog, setCatalog] = useState(() => loadMarketingCatalog())
  const [links, setLinks] = useState<PaymentLink[]>(() => {
    ensurePaymentLinkData()
    return readPaymentLinks()
  })
  const [linkOrders, setLinkOrders] = useState<LinkOrder[]>(() => readLinkOrders())
  const [line, setLine] = useState('')
  const [channelId, setChannelId] = useState('')
  const [usePromo, setUsePromo] = useState(true)
  const [userQuery, setUserQuery] = useState(presetUserId)
  const [depositSkuId, setDepositSkuId] = useState('')
  const [firstAmount, setFirstAmount] = useState<number | null>(null)
  const [payMethods, setPayMethods] = useState<string[]>([])
  const [tab, setTab] = useState<'full' | 'deposit'>('full')
  const [audience, setAudience] = useState<'user' | 'open'>('user')
  const [eventName, setEventName] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [screen, setScreen] = useState<'list' | 'form'>(presetUserId ? 'form' : 'list')
  const [keyword, setKeyword] = useState(focusLinkId)
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [scene, setScene] = useState<Scene>('all')
  const [lineFilter, setLineFilter] = useState<string | undefined>()
  const [channelFilter, setChannelFilter] = useState<string | undefined>()
  const [onlyMine, setOnlyMine] = useState(false)
  const [qrTarget, setQrTarget] = useState<PaymentLink | null>(null)
  const [qrImage, setQrImage] = useState('')
  const [methodTarget, setMethodTarget] = useState<{ link: PaymentLink; stage: PayStage } | null>(null)
  const [methodDraft, setMethodDraft] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string[]>(focusLinkId ? [focusLinkId] : [])
  const [memberTarget, setMemberTarget] = useState<string | null>(null)
  const [memberDays, setMemberDays] = useState<number | null>(7)
  const holdLineReset = useRef(false)
  const navigate = useNavigate()
  const { account, role } = useCurrentAccount()
  const session = useSession()
  const myEmail = account?.email || session?.email || ''
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
  const reload = () => {
    setLinks(readPaymentLinks())
    setLinkOrders(readLinkOrders())
  }

  useEffect(() => {
    const onFocus = () => {
      reloadCatalog()
      reload()
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
    if (!presetUserId && !focusLinkId) return
    setSearchParams({}, { replace: true })
  }, [presetUserId, focusLinkId, setSearchParams])

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
    writePaymentLinks(next)
  }

  const ordersBy = useMemo(() => {
    const map = new Map<string, LinkOrder[]>()
    linkOrders.forEach((order) => map.set(order.paymentLinkId, [...(map.get(order.paymentLinkId) || []), order]))
    return map
  }, [linkOrders])
  const ordersOf = (id: string) => ordersBy.get(id) || []
  const editable = (row: PaymentLink) => row.status === 'ACTIVE' && !ordersOf(row.id).some((order) => order.status !== 'CANCELLED')

  const resetCustomer = () => {
    setUserQuery('')
    setFirstAmount(null)
    setAudience('user')
    setEventName('')
    setValidUntil('')
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

  const openMode = tab === 'full' && audience === 'open'
  const methodsFor = (mode: 'full' | 'deposit') => methodsForLine(activeLine)
    .filter((method) => !(mode === 'full' && openMode && method.kind === 'manual'))

  const requireCustomer = () => {
    if (!activeChannel?.plan || !shown.length) {
      message.warning(en ? 'This channel has no active price plan' : '这个渠道还没有生效中的价格方案')
      return false
    }
    if (openMode) {
      if (!eventName.trim()) {
        message.warning(en ? 'Enter the event or material name' : '请填写活动 / 物料名称')
        return false
      }
    } else if (!linkedUserId) {
      message.warning(en ? 'Pick a User ID from the matches' : '请从匹配结果里选中一个 User ID')
      return false
    }
    if (!payMethods.some((code) => methodsFor(tab).some((method) => method.code === code))) {
      message.warning(en ? 'Select at least one payment method' : '请至少选择一种支付方式')
      return false
    }
    return true
  }

  const baseFields = (kind: 'full' | 'deposit', amount: number, id: string): PaymentLink => {
    const picked = kind === 'full' ? shown : shown.filter((offer) => offer.skuId === depositSkuId).slice(0, 1)
    const offer = picked[0]
    const promo = usePromo && hasDiscount ? (activeChannel?.plan?.promoCode || '') : ''
    const open = kind === 'full' && audience === 'open'
    const previous = editingId ? links.find((item) => item.id === editingId) : undefined
    const methods = payMethods.filter((code) => methodsFor(kind).some((method) => method.code === code))
    return {
      id,
      kind,
      audience: open ? 'open' : 'user',
      userId: open ? undefined : linkedUserId,
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
      payable: picked.length === 1 ? (offer?.payable || 0) : 0,
      amount,
      methods,
      balanceMethods: kind === 'deposit' ? methods : undefined,
      eventName: open ? eventName.trim() : undefined,
      validUntil: open ? (validUntil || undefined) : undefined,
      status: 'ACTIVE',
      url: payLinkUrl(id),
      createdAt: previous?.createdAt || nowText(),
      updatedAt: nowText(),
      createdBy: previous ? previous.createdBy : myEmail,
    }
  }

  const save = (row: PaymentLink) => {
    persist(editingId ? links.map((item) => (item.id === editingId ? row : item)) : [row, ...links])
    setEditingId(null)
    setScreen('list')
    setKeyword('')
    setScene('all')
    resetCustomer()
  }

  const blockedEdit = () => {
    const row = editingId ? links.find((item) => item.id === editingId) : undefined
    if (row && !editable(row)) {
      message.warning(en ? 'This link already has orders and cannot be changed' : '这条链接已经有订单，不能再改')
      return true
    }
    return false
  }

  const createFull = () => {
    if (!requireCustomer() || blockedEdit()) return
    const row = baseFields('full', 0, editingId || newId('PL'))
    save(row)
    message.success(editingId
      ? (en ? 'Payment link updated' : '支付链接已更新')
      : row.audience === 'open' ? (en ? 'Open payment link created. Download the QR code for print.' : '通用支付链接已生成，可下载二维码用于印刷物料') : (en ? 'Full payment link created' : '全款链接已生成'))
  }

  const createDeposit = () => {
    if (!requireCustomer() || blockedEdit()) return
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
    save(baseFields('deposit', amount, editingId || newId('PL')))
    message.success(editingId
      ? (en ? 'Deposit link updated' : '定金链接已更新')
      : (en ? 'Deposit link created. The customer pays the first payment and the balance with the same link.' : '定金链接已生成，首款和尾款都用这一条链接支付'))
  }

  const startEdit = (row: PaymentLink) => {
    if (!editable(row)) {
      message.warning(en ? 'Links with orders cannot be edited' : '已经有订单的链接不能再编辑')
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
    setFirstAmount(row.kind === 'deposit' ? row.amount : null)
    setAudience(row.audience === 'open' ? 'open' : 'user')
    setEventName(row.eventName || '')
    setValidUntil(row.validUntil || '')
    setTab(row.kind)
    setScreen('form')
  }

  const confirmTransfer = (order: LinkOrder) => {
    completeOrder(order.orderNo)
    reload()
    message.success(order.payStage === 'DEPOSIT_FIRST'
      ? (en ? 'First transfer confirmed. Membership stays closed until the balance is paid.' : '首款已确认。会员等尾款到账后再开通。')
      : (en ? 'Transfer confirmed and membership opened' : '已确认转账并开通会员'))
  }

  const voidLink = (row: PaymentLink) => {
    Modal.confirm({
      title: en ? `Void ${row.id}?` : `作废 ${row.id}？`,
      content: en
        ? 'The link stops accepting payments and its unpaid orders are cancelled. Paid orders stay as they are.'
        : '作废后链接不能再付款，未支付的订单会一起取消；已支付的订单不受影响。',
      okText: en ? 'Void' : '作废',
      okButtonProps: { danger: true },
      cancelText: en ? 'Cancel' : '取消',
      onOk: () => {
        voidPaymentLink(row.id)
        reload()
      },
    })
  }

  const linkedStudent = students.find((student) => student.studentId === linkedUserId)
  const firstValue = Math.round(Number(firstAmount) || 0)
  const depositPayable = chosenDeposit?.payable || 0
  const floor = depositFloor(activeLine, depositPayable)
  const firstValid = !!chosenDeposit && firstValue >= floor.min && firstValue < depositPayable
  const roundFor = (value: number, currency: string) => (['VND', 'KRW', 'IDR'].includes(currency) ? Math.round(value / 1000) * 1000 : Math.round(value))
  const quickFirst = chosenDeposit
    ? [
      ...(floor.min > 1 ? [{ label: en ? 'Minimum' : '最低', value: floor.min }] : []),
      { label: '10%', value: Math.max(floor.min, Math.round(depositPayable * 0.1)) },
      { label: '30%', value: Math.max(floor.min, roundFor(depositPayable * 0.3, chosenDeposit.currency)) },
      { label: '50%', value: Math.max(floor.min, roundFor(depositPayable * 0.5, chosenDeposit.currency)) },
    ].filter((item, index, all) => item.value < depositPayable && all.findIndex((other) => other.value === item.value) === index)
    : []

  const defaultFirst = chosenDeposit ? Math.max(floor.min, Math.round(depositPayable * 0.1)) : 0
  useEffect(() => {
    if (tab !== 'deposit' || editingId || firstAmount !== null || !defaultFirst || defaultFirst >= depositPayable) return
    setFirstAmount(defaultFirst)
  }, [tab, editingId, firstAmount, defaultFirst, depositPayable])

  const previewDraft = (mode: 'full' | 'deposit') => {
    const draft = baseFields(mode, mode === 'full' ? 0 : firstValue, PREVIEW_LINK_ID)
    localStorage.setItem(PREVIEW_LINK_KEY, JSON.stringify(draft))
    window.open(`${payLinkUrl(PREVIEW_LINK_ID)}&preview=1`, '_blank')
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
    const methodList = methodsFor(mode)
    const open = mode === 'full' && audience === 'open'
    const hiddenManual = open && methodsForLine(activeLine).some((method) => method.kind === 'manual')
    const pickedMethods = methodList.filter((method) => payMethods.includes(method.code))
    const promo = usePromo && hasDiscount ? activeChannel?.plan?.promoCode : ''
    const balanceValue = Math.max(depositPayable - firstValue, 0)
    const firstShare = depositPayable ? Math.min(100, Math.max(0, (firstValue / depositPayable) * 100)) : 0
    const ready = (open ? !!eventName.trim() : !!linkedUserId) && !!activeChannel?.plan && pickedMethods.length > 0 && (mode === 'full' ? shown.length > 0 : firstValid)
    let stepNo = 0
    return (
      <div className="pl-form">
        <div className="pl-form__main">
          <Card size="small" title={step(++stepNo, en ? 'Who pays' : '付款人', open ? (en ? 'Anyone who scans logs in first' : '扫码用户先登录再付款') : (en ? 'Phone number or User ID' : '手机号或 User ID'))}>
            {mode === 'full' && (
              <div className="pl-audience">
                {([
                  { value: 'user', title: en ? 'A specific user' : '指定用户', desc: en ? 'Sales follow-up. The link is tied to one User ID and is paid once.' : '销售跟进用。链接绑定一个 User ID，付清即结束。' },
                  { value: 'open', title: en ? 'Open link (expo / printed QR)' : '通用链接（展会 / 物料二维码）', desc: en ? 'No User ID up front. The customer logs in before paying; anyone can pay, many times.' : '不预先指定用户。用户付款前先登录，付款绑定到登录账号；可被多人多次付款。' },
                ] as const).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`pl-audience__item${audience === item.value ? ' is-on' : ''}`}
                    disabled={!!editingId}
                    onClick={() => setAudience(item.value)}
                  >
                    <span className="pl-audience__radio" />
                    <span>
                      <b>{item.title}</b>
                      <Typography.Text type="secondary">{item.desc}</Typography.Text>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {open ? (
              <div className="pl-grid-2 pl-grid-2--wide">
                <div>
                  <div className="pl-label">{en ? 'Event / material name' : '活动 / 物料名称'} <span className="pl-required">*</span></div>
                  <Input
                    value={eventName}
                    onChange={(event) => setEventName(event.target.value)}
                    placeholder={en ? 'e.g. Seoul Edu Expo 2026 · Booth B12' : '例如 Seoul Edu Expo 2026 · B12 展位'}
                    maxLength={60}
                    showCount
                  />
                  <Typography.Text type="secondary" className="pl-field-hint">{en ? 'Shown at the top of the customer page; also used to attribute orders.' : '显示在用户页面顶部，同时用于统计订单来源。'}</Typography.Text>
                </div>
                <div>
                  <div className="pl-label">{en ? 'Valid until' : '有效期至'}</div>
                  <Input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
                  <Typography.Text type="secondary" className="pl-field-hint">{en ? 'Optional. After this date the QR code shows the link as expired.' : '可不填。过期后扫码会提示链接已失效。'}</Typography.Text>
                </div>
              </div>
            ) : (
              <>
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
              </>
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
              ? (en ? 'Offered for both payments; the customer picks per payment. Methods with a minimum amount are checked against each payment.' : '首款、尾款都提供，用户每次付款时单独选；有最低金额的方式按每一笔金额判断')
              : (en ? 'The customer only sees the methods checked here' : '用户只会看到这里勾选的方式'))}
          >
            {hiddenManual && (
              <Typography.Text type="secondary" className="pl-field-hint">{en ? 'Bank transfer is not offered on open links: each transfer has to be matched to a person by an admin.' : '通用链接不提供银行转账：转账需要管理员按人核对，没法对应到扫码用户。'}</Typography.Text>
            )}
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
                {mode === 'full' ? (en ? 'Full payment' : '全款') : (en ? 'Deposit · 1 link, 2 payments' : '定金 · 1 条链接，分两次付')}
              </Tag>
              {open && <Tag color="cyan" bordered={false}>{en ? 'Open link · reusable' : '通用链接 · 可多次付款'}</Tag>}
              {editingId && <Tag bordered={false}>{en ? 'Editing' : '编辑中'} {editingId}</Tag>}
            </div>
            <dl className="pl-summary__list">
              <dt>{en ? 'Customer' : '客户'}</dt>
              <dd>{open ? <>{en ? 'Bound at login' : '登录后绑定'}{eventName.trim() && <><br /><Typography.Text type="secondary">{eventName.trim()}</Typography.Text></>}{validUntil && <><br /><Typography.Text type="secondary">{en ? 'Until' : '有效期至'} {validUntil}</Typography.Text></>}</> : linkedStudent ? <>{linkedStudent.name}<br /><Typography.Text type="secondary">{linkedStudent.studentId}</Typography.Text></> : <Typography.Text type="secondary">{en ? 'Not selected' : '未选择'}</Typography.Text>}</dd>
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
                  <dt>{en ? 'Payments' : '分两次付'}</dt>
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
              {open
                ? (en ? 'Print the QR code on expo materials. Each customer logs in, pays, and gets their own order bound to the account they logged in with.' : '二维码可印在展会物料上。每个用户扫码登录后付款，各自生成一张订单，绑定到登录的账号。')
                : mode === 'full'
                ? (en ? 'The order is created when the customer picks a method and starts paying. Membership opens when it is paid.' : '用户选好支付方式开始付款时才生成订单；付款成功后开通会员。')
                : (en ? 'One link for both payments. Each payment becomes its own order when the customer pays; the balance order points to the first one. Membership opens after the balance.' : '首款、尾款用同一条链接。用户每次付款各生成一张订单，尾款订单关联首款订单；尾款到账后开通会员。')}
            </Typography.Paragraph>
            <Button type="primary" block size="large" icon={<LinkOutlined />} disabled={!ready} onClick={mode === 'full' ? createFull : createDeposit}>
              {editingId
                ? (en ? 'Save changes' : '保存修改')
                : open ? (en ? 'Create open link' : '生成通用支付链接') : mode === 'full' ? (en ? 'Create full payment link' : '生成全款链接') : (en ? 'Create deposit link' : '生成定金链接')}
            </Button>
            <Button block icon={<EyeOutlined />} style={{ marginTop: 8 }} disabled={!activeChannel?.plan || !shown.length} onClick={() => previewDraft(mode)}>
              {en ? 'Preview customer page' : '预览用户页面'}
            </Button>
            {!ready && (
              <Typography.Text type="secondary" className="pl-summary__todo">
                {open && !eventName.trim()
                  ? (en ? 'Enter the event or material name.' : '请填写活动 / 物料名称。')
                  : !open && !linkedUserId
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

  const methodByCode = (row: PaymentLink, code: string) => methodsForLine(row.line).find((item) => item.code === code)
  const methodName = (row: PaymentLink, code: string) => {
    const method = methodByCode(row, code)
    return method ? methodDisplayName(method, en ? 'en' : 'zh') : code
  }

  const methodsCell = (row: PaymentLink, codes: string[]) => {
    const picked = codes.map((code) => methodByCode(row, code)).filter((item): item is NonNullable<typeof item> => !!item)
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

  const stageName = (stage: PayStage) => (stage === 'FULL'
    ? (en ? 'Full payment' : '全款')
    : stage === 'DEPOSIT_FIRST' ? (en ? 'First payment' : '首款') : (en ? 'Balance' : '尾款'))

  const paidOf = (orders: LinkOrder[], stage: PayStage) => orders.find((order) => order.payStage === stage && order.status === 'COMPLETED')
  const declaredOf = (orders: LinkOrder[], stage: PayStage) => orders.find((order) => order.payStage === stage && order.status === 'PENDING' && !!order.declaredAt)

  const linkStatus = (row: PaymentLink): { label: string; color: string } => {
    const orders = ordersOf(row.id)
    if (row.status === 'VOID') return { label: en ? 'Void' : '已作废', color: 'default' }
    if (row.audience === 'open') {
      return isExpired(row) ? { label: en ? 'Expired' : '已过期', color: 'default' } : { label: en ? 'Collecting' : '收款中', color: 'cyan' }
    }
    if (row.kind === 'full') {
      if (paidOf(orders, 'FULL')) return { label: en ? 'Paid' : '已支付', color: 'success' }
      if (declaredOf(orders, 'FULL')) return { label: en ? 'Transfer to confirm' : '转账待确认', color: 'warning' }
      return { label: en ? 'Awaiting payment' : '待支付', color: 'processing' }
    }
    if (paidOf(orders, 'DEPOSIT_BALANCE')) return { label: en ? 'Fully paid' : '已付清', color: 'success' }
    if (paidOf(orders, 'DEPOSIT_FIRST')) {
      return declaredOf(orders, 'DEPOSIT_BALANCE')
        ? { label: en ? 'Balance transfer to confirm' : '尾款待确认', color: 'warning' }
        : { label: en ? 'Balance due' : '待付尾款', color: 'orange' }
    }
    return declaredOf(orders, 'DEPOSIT_FIRST')
      ? { label: en ? 'First transfer to confirm' : '首款待确认', color: 'warning' }
      : { label: en ? 'First payment due' : '待付首款', color: 'processing' }
  }

  const collected = (row: PaymentLink) => ordersOf(row.id).filter((order) => order.status === 'COMPLETED')

  const openOrder = (order: LinkOrder) => {
    const query = new URLSearchParams({ from: 'payment-links', sub: order.orderNo })
    navigate(`/orders/${order.parentOrderNo || order.orderNo}?${query.toString()}`)
  }

  const orderStatusTag = (order: LinkOrder) => {
    if (order.status === 'COMPLETED') return <Tag color="success" bordered={false}>{en ? 'Paid' : '已支付'}</Tag>
    if (order.status === 'CANCELLED') return <Tag bordered={false}>{en ? 'Cancelled' : '已取消'}</Tag>
    if (order.declaredAt) return <Tag color="warning" bordered={false}>{en ? 'Transfer to confirm' : '转账待确认'}</Tag>
    return <Tag color="processing" bordered={false}>{en ? 'Awaiting payment' : '待支付'}</Tag>
  }

  const orderLine = (row: PaymentLink, order: LinkOrder) => (
    <div key={order.orderNo} className={`pl-order-line is-${order.status.toLowerCase()}`}>
      <Button type="link" size="small" className="pl-order-no" onClick={() => openOrder(order)}>{order.orderNo}</Button>
      <span className="pl-order-line__method">{methodName(row, order.method)}</span>
      {orderStatusTag(order)}
      <Typography.Text type="secondary" className="pl-order-line__time">
        {order.status === 'COMPLETED'
          ? `${en ? 'Paid' : '支付'} ${(order.paidAt || '').slice(0, 16)}`
          : order.declaredAt
            ? `${en ? 'Declared' : '用户声明转账'} ${order.declaredAt.slice(0, 16)}`
            : `${en ? 'Ordered' : '下单'} ${order.createdAt.slice(0, 16)}`}
      </Typography.Text>
      {(order.providerRef || order.transferReference) && (
        <Typography.Text type="secondary" className="pl-leg__id">{order.providerRef || order.transferReference}</Typography.Text>
      )}
      {canConfirmBank && order.status === 'PENDING' && order.method === 'bank_transfer' && row.status === 'ACTIVE' && (
        <Button size="small" type="primary" onClick={() => confirmTransfer(order)}>
          {order.payStage === 'DEPOSIT_FIRST'
            ? (en ? 'Confirm first transfer' : '确认首款已到账')
            : (en ? 'Confirm transfer & open membership' : '确认到账并开通会员')}
        </Button>
      )}
    </div>
  )

  const linkActions = (row: PaymentLink) => (
    <Space size={4} wrap>
      <Button size="small" type="link" icon={<CopyOutlined />} onClick={() => copyText(row.url)}>{en ? 'Copy link' : '复制链接'}</Button>
      <Button size="small" type="link" icon={<QrcodeOutlined />} onClick={() => setQrTarget(row)}>{en ? 'QR' : '二维码'}</Button>
      <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => window.open(row.url, '_blank')}>{en ? 'Preview' : '预览'}</Button>
    </Space>
  )

  const columns = [
    {
      title: en ? 'Type' : '类型',
      key: 'kind',
      width: 96,
      render: (_: unknown, row: PaymentLink) => (
        <Space direction="vertical" size={4}>
          {row.kind === 'full' ? <Tag color="green">{en ? 'Full' : '全款'}</Tag> : <Tag color="orange">{en ? 'Deposit' : '定金'}</Tag>}
          {row.audience === 'open' && <Tag color="cyan">{en ? 'Open' : '通用'}</Tag>}
        </Space>
      ),
    },
    {
      title: en ? 'Link / User ID' : '链接 / User ID',
      width: 220,
      render: (_: unknown, row: PaymentLink) => (
        <div className="pl-two-line">
          <Typography.Text className="pl-link-id">{row.id}</Typography.Text>
          {row.audience === 'open'
            ? <Typography.Text type="secondary">{en ? 'Bound at login' : '扫码登录后绑定'} · {row.eventName || '—'}</Typography.Text>
            : (
              <>
                <Typography.Text type="secondary" copyable={!!row.userId}>{row.userId || '—'}</Typography.Text>
                {row.userId && (
                  <Button size="small" type="link" className="pl-member-btn" icon={<CrownOutlined />} onClick={() => { setMemberTarget(row.userId || null); setMemberDays(7) }}>
                    {en ? 'Add membership' : '添加会员'}
                  </Button>
                )}
              </>
            )}
        </div>
      ),
    },
    {
      title: en ? 'Channel / SKU' : '渠道 / SKU',
      width: 230,
      render: (_: unknown, row: PaymentLink) => (
        <div className="pl-two-line">
          <span>{row.channelName || '—'}</span>
          <Typography.Text type="secondary">{(row.offers || []).map((item) => item.skuName).join(' / ') || row.skuName}</Typography.Text>
        </div>
      ),
    },
    {
      title: en ? 'Amount' : '金额',
      width: 210,
      render: (_: unknown, row: PaymentLink) => {
        if (row.kind === 'deposit') {
          return (
            <div className="pl-two-line">
              <b>{formatMoney(row.payable, row.currency)}</b>
              <Typography.Text type="secondary">
                {en ? 'First' : '首款'} {formatMoney(row.amount, '')} + {en ? 'balance' : '尾款'} {formatMoney(Math.max(row.payable - row.amount, 0), '')}
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
        return <b>{formatMoney(prices[0] || row.payable, row.currency)}</b>
      },
    },
    {
      title: en ? 'Payment methods' : '支付方式',
      width: 200,
      render: (_: unknown, row: PaymentLink) => methodsCell(row, row.methods || []),
    },
    {
      title: en ? 'Status' : '状态',
      width: 150,
      render: (_: unknown, row: PaymentLink) => {
        const status = linkStatus(row)
        return (
          <div className="pl-two-line">
            <span><Tag color={status.color} bordered={false}>{status.label}</Tag></span>
            {row.audience === 'open' && row.validUntil && <Typography.Text type="secondary">{en ? 'Until' : '至'} {row.validUntil}</Typography.Text>}
          </div>
        )
      },
    },
    {
      title: en ? 'Collected' : '已收',
      width: 170,
      render: (_: unknown, row: PaymentLink) => {
        const paid = collected(row)
        if (!paid.length) return <Typography.Text type="secondary">{en ? 'Nothing yet' : '暂无'}</Typography.Text>
        return (
          <div className="pl-two-line">
            <b>{formatMoney(paid.reduce((sum, order) => sum + order.payAmount, 0), row.currency || paid[0].currency)}</b>
            <Typography.Text type="secondary">{en ? `${paid.length} paid order${paid.length > 1 ? 's' : ''}` : `${paid.length} 张已支付订单`}</Typography.Text>
          </div>
        )
      },
    },
    {
      title: en ? 'Created / Updated' : '创建 / 更新',
      width: 150,
      render: (_: unknown, row: PaymentLink) => {
        const latest = [row.updatedAt, ...ordersOf(row.id).map((order) => (order.paidAt || order.declaredAt || order.createdAt).slice(0, 16))].sort().pop()
        return (
          <div className="pl-two-line">
            <span>{row.createdAt}</span>
            <Typography.Text type="secondary">{latest}</Typography.Text>
          </div>
        )
      },
    },
    {
      title: en ? 'Actions' : '操作',
      key: 'actions',
      width: 230,
      fixed: 'right' as const,
      render: (_: unknown, row: PaymentLink) => (
        <Space direction="vertical" size={4}>
          {linkActions(row)}
          {row.status === 'ACTIVE' && (
            <Space size={4}>
              {editable(row) && <Button size="small" type="link" icon={<EditOutlined />} onClick={() => startEdit(row)}>{en ? 'Edit' : '编辑'}</Button>}
              {currentStage(row, ordersOf(row.id)) && (
                <Button size="small" type="link" danger icon={<StopOutlined />} onClick={() => voidLink(row)}>{en ? 'Void' : '作废'}</Button>
              )}
            </Space>
          )}
        </Space>
      ),
    },
  ]

  const stageRows = (row: PaymentLink) => {
    const orders = ordersOf(row.id)
    const stages: PayStage[] = row.kind === 'full' ? ['FULL'] : ['DEPOSIT_FIRST', 'DEPOSIT_BALANCE']
    const firstPaid = paidOf(orders, 'DEPOSIT_FIRST')
    const offer = row.offers.length === 1 ? row.offers[0] : undefined
    return (
      <div className="pl-legs">
        {stages.map((stage, index) => {
          const mine = orders.filter((order) => order.payStage === stage).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          const paid = mine.find((order) => order.status === 'COMPLETED')
          const live = paid || mine.find((order) => order.status === 'PENDING')
          const folded = mine.filter((order) => order !== live).length
          const waiting = stage === 'DEPOSIT_BALANCE' && !firstPaid
          const amount = stage === 'FULL' && !offer ? (live?.payAmount ?? 0) : stageAmount(row, stage, offer, orders)
          const changeable = !paid && row.status === 'ACTIVE' && !!currentStage(row, orders)
          return (
            <div key={stage} className={`pl-leg${paid ? ' is-paid' : ''}`}>
              <div className="pl-leg__step">
                <span className="pl-leg__dot">{paid ? '✓' : index + 1}</span>
              </div>
              <div className="pl-leg__name">
                <b>{stageName(stage)}</b>
                <Typography.Text type="secondary" className="pl-leg__relation">pay_stage = {stage}</Typography.Text>
              </div>
              <div className="pl-leg__amount">{amount ? formatMoney(amount, row.currency) : (en ? 'Customer picks SKU' : '用户选 SKU 后定')}</div>
              <div className="pl-leg__status">
                {live ? orderLine(row, live) : (
                  <div className="pl-order-line is-none">
                    <Tag bordered={false}>{waiting ? (en ? 'After first payment' : '首款付清后可付') : (en ? 'Awaiting payment · no order yet' : '待支付 · 未下单')}</Tag>
                    <Typography.Text type="secondary">
                      {en ? 'Created when the customer picks a method and pays' : '用户选好支付方式开始付款时生成订单'}
                    </Typography.Text>
                  </div>
                )}
                {live?.parentOrderNo && (
                  <Typography.Text type="secondary" className="pl-leg__relation">parent_order_no = {live.parentOrderNo}</Typography.Text>
                )}
                {folded > 0 && (
                  <Typography.Text type="secondary" className="pl-leg__relation">
                    {en ? `${folded} abandoned attempt${folded > 1 ? 's' : ''} folded` : `另有 ${folded} 次未完成的尝试（已折叠）`}
                  </Typography.Text>
                )}
              </div>
              <div className="pl-leg__actions">
                {methodsCell(row, stageMethods(row, stage))}
                {changeable && (
                  <Button size="small" type="link" icon={<EditOutlined />} onClick={() => { setMethodTarget({ link: row, stage }); setMethodDraft(stageMethods(row, stage)) }}>
                    {en ? 'Methods' : '改支付方式'}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
        <div className="pl-legs__note">
          {row.kind === 'deposit'
            ? (en
              ? 'One link, two payments. Each payment is its own web_order; the balance order carries parent_order_no pointing to the first. The order center shows them together under the first order no.'
              : '一条链接分两次付。每次付款是一张独立的 web_order，尾款订单用 parent_order_no 指向首款订单；订单中心按首款单号合并展示。')
            : (en
              ? 'The order is created when the customer starts paying, with the method they picked.'
              : '用户开始付款时按所选支付方式生成订单。')}
        </div>
      </div>
    )
  }

  const openRows = (row: PaymentLink) => {
    const orders = ordersOf(row.id)
    const paid = orders.filter((order) => order.status === 'COMPLETED').sort((a, b) => (b.paidAt || '').localeCompare(a.paidAt || ''))
    const pending = orders.filter((order) => order.status === 'PENDING').length
    return (
      <div className="pl-legs">
        {paid.length ? (
          <div className="pl-open-list">
            {paid.slice(0, OPEN_ORDER_PREVIEW).map((order) => (
              <div key={order.orderNo} className="pl-open-list__row">
                <Button type="link" size="small" className="pl-order-no" onClick={() => openOrder(order)}>{order.orderNo}</Button>
                <Typography.Text type="secondary">{order.userId}</Typography.Text>
                <span>{order.skuName}</span>
                <b>{formatMoney(order.payAmount, order.currency)}</b>
                <span>{methodName(row, order.method)}</span>
                <Typography.Text type="secondary">{(order.paidAt || '').slice(0, 16)}</Typography.Text>
              </div>
            ))}
          </div>
        ) : (
          <Typography.Text type="secondary">{en ? 'No one has paid yet. Each payment creates its own order.' : '还没有人付款。每笔付款各生成一张订单。'}</Typography.Text>
        )}
        <div className="pl-legs__note pl-open-foot">
          <span>
            {en
              ? `${paid.length} paid${pending ? ` · ${pending} in progress` : ''}${paid.length > OPEN_ORDER_PREVIEW ? ` · latest ${OPEN_ORDER_PREVIEW} shown` : ''}`
              : `已支付 ${paid.length} 单${pending ? ` · 进行中 ${pending} 单` : ''}${paid.length > OPEN_ORDER_PREVIEW ? ` · 这里只显示最近 ${OPEN_ORDER_PREVIEW} 单` : ''}`}
          </span>
          {orders.length > 0 && (
            <Button size="small" type="link" onClick={() => navigate(`/orders?payment_link_id=${encodeURIComponent(row.id)}`)}>
              {en ? `View all ${orders.length} orders in the order center` : `在订单中心查看全部 ${orders.length} 单`}
            </Button>
          )}
        </div>
      </div>
    )
  }

  const saveStageMethods = () => {
    if (!methodTarget) return
    if (!methodDraft.length) {
      message.warning(en ? 'Select at least one payment method' : '请至少选择一种支付方式')
      return
    }
    const { link, stage } = methodTarget
    persist(links.map((item) => {
      if (item.id !== link.id) return item
      const update = stage === 'DEPOSIT_BALANCE'
        ? { balanceMethods: methodDraft }
        : { methods: methodDraft, balanceMethods: item.kind === 'deposit' ? (item.balanceMethods || item.methods) : undefined }
      return { ...item, ...update, updatedAt: nowText() }
    }))
    setMethodTarget(null)
    message.success(en ? 'Payment methods updated. The link stays the same.' : '支付方式已更新，链接地址不变。')
  }

  const addMembership = () => {
    if (!memberTarget || !memberDays || memberDays <= 0) return
    setState((prev) => ({
      ...prev,
      students: prev.students.map((student) => {
        if (student.studentId !== memberTarget) return student
        const current = student.expireTime ? dayjs(student.expireTime) : dayjs()
        const base = current.isAfter(dayjs()) ? current : dayjs()
        return { ...student, expireTime: base.add(memberDays, 'day').format('YYYY-MM-DD HH:mm:ss'), lastModifier: myEmail || student.lastModifier }
      }),
    }))
    message.success(en ? `Added ${memberDays} days for ${memberTarget}` : `已为 ${memberTarget} 添加 ${memberDays} 天会员`)
    setMemberTarget(null)
  }

  const textMatch = (row: PaymentLink) => {
    if (!keyword.trim()) return true
    return [row.userId, row.id, row.channelName, row.skuName, row.eventName, ...ordersOf(row.id).flatMap((order) => [order.orderNo, order.userId])]
      .join(' ').toLowerCase().includes(keyword.trim().toLowerCase())
  }
  const sceneMatch = (row: PaymentLink, value: Scene) => {
    const orders = ordersOf(row.id)
    const stage = currentStage(row, orders)
    if (value === 'confirm') return row.status === 'ACTIVE' && orders.some((order) => order.status === 'PENDING' && !!order.declaredAt)
    if (value === 'first') return row.kind === 'deposit' && stage === 'DEPOSIT_FIRST'
    if (value === 'balance') return row.kind === 'deposit' && stage === 'DEPOSIT_BALANCE'
    if (value === 'full_wait') return row.kind === 'full' && row.audience !== 'open' && stage === 'FULL'
    if (value === 'done') return row.audience !== 'open' && row.status === 'ACTIVE' && !stage
    return true
  }
  const baseRows = links.filter((row) => {
    if (!textMatch(row)) return false
    if (typeFilter === 'full' && (row.kind !== 'full' || row.audience === 'open')) return false
    if (typeFilter === 'deposit' && row.kind !== 'deposit') return false
    if (typeFilter === 'open' && row.audience !== 'open') return false
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
  const lineOptions = Array.from(new Set(links.map((row) => row.line).filter(Boolean)))
    .map((value) => ({ value, label: enValue(value) }))
  const channelOptions = Array.from(
    new Map(links.filter((row) => !lineFilter || row.line === lineFilter).filter((row) => row.channelId).map((row) => [row.channelId, row.channelName])).entries(),
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
  const depositKey = rows.filter((row) => row.kind === 'deposit').map((row) => row.id).sort().join('|')
  useEffect(() => {
    if (focusLinkId) return
    setExpanded(depositKey ? depositKey.split('|') : [])
  }, [depositKey, focusLinkId])

  const openCreate = (kind: 'full' | 'deposit', who: 'user' | 'open' = 'user') => {
    setEditingId(null)
    resetCustomer()
    setAudience(kind === 'full' ? who : 'user')
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
                ? (tab === 'full' ? (en ? 'Edit full payment link' : '编辑全款支付链接') : (en ? 'Edit deposit link' : '编辑定金支付链接'))
                : (tab === 'full' ? (en ? 'New full payment link' : '新建全款支付链接') : (en ? 'New deposit link' : '新建定金支付链接'))}
            </Typography.Title>
            <Typography.Text type="secondary">
              {tab === 'full'
                ? (en ? 'The customer pays the package in one payment.' : '用户一次付清套餐。')
                : (en ? 'The customer pays a first payment now and the balance later, both with this link.' : '用户先付首款，之后用同一条链接再付尾款。')}
            </Typography.Text>
          </div>
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
          <Dropdown.Button
            type="primary"
            icon={<DownOutlined />}
            onClick={() => openCreate('full')}
            menu={{
              items: [
                { key: 'user', icon: <LinkOutlined />, label: en ? 'For a specific User ID (default)' : '指定用户 ID（默认）' },
                { key: 'open', icon: <QrcodeOutlined />, label: en ? 'Open link · expo / printed QR' : '通用链接 · 展会 / 物料二维码' },
              ],
              onClick: ({ key }) => openCreate('full', key === 'open' ? 'open' : 'user'),
            }}
          >
            <LinkOutlined /> {en ? 'New full payment link' : '新建全款支付链接'}
          </Dropdown.Button>
          <Button icon={<LinkOutlined />} onClick={() => openCreate('deposit')}>{en ? 'New deposit link' : '新建定金支付链接'}</Button>
        </Space>
      </div>
      <Space wrap>
        <Input.Search allowClear placeholder={en ? 'Link / user / order no.' : '链接 / User ID / 订单号'} value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ width: 240 }} />
        <Select allowClear placeholder={en ? 'Type' : '类型'} value={typeFilter} onChange={setTypeFilter} style={{ width: 120 }}
          options={[
            { value: 'full', label: en ? 'Full' : '全款' },
            { value: 'deposit', label: en ? 'Deposit' : '定金' },
            { value: 'open', label: en ? 'Open' : '通用' },
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
          ? 'Each row is one payment link; expand it to see its orders. Orders are created when the customer starts paying. Bank transfers are confirmed by an admin, ops, or a sales lead.'
          : '每一行是一条支付链接，展开看它下面的订单。订单在用户开始付款时才生成。银行转账由管理员、运营或销售组长确认到账。'}
      />
      <Table
        className="pl-table"
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 1700 }}
        expandable={{
          expandedRowKeys: expanded,
          onExpandedRowsChange: (keys) => setExpanded(keys.map(String)),
          expandedRowRender: (row: PaymentLink) => (row.audience === 'open' ? openRows(row) : stageRows(row)),
          expandIcon: ({ expanded: open, record, onExpand }) => (
            <Button
              type="text"
              size="small"
              icon={open ? <DownOutlined /> : <RightOutlined />}
              onClick={(event) => onExpand(record, event)}
            />
          ),
        }}
        rowClassName={(row: PaymentLink) => [expanded.includes(row.id) ? 'pl-row--open' : '', row.status === 'VOID' ? 'pl-row--void' : ''].join(' ')}
        locale={{ emptyText: en ? 'No payment links yet' : '还没有支付链接' }}
      />
      <Modal
        title={methodTarget ? `${stageName(methodTarget.stage)} · ${en ? 'payment methods' : '支付方式'}` : ''}
        open={!!methodTarget}
        onCancel={() => setMethodTarget(null)}
        onOk={saveStageMethods}
        okText={en ? 'Save' : '保存'}
        cancelText={en ? 'Cancel' : '取消'}
      >
        <Typography.Paragraph type="secondary">
          {en
            ? 'Pick again from every method on this line; you can add methods that were not offered before. Only the payment not yet made is affected. The customer still picks one method when paying, and that order keeps it. The link address does not change.'
            : '从这条业务线的全部支付方式里重新勾选，可以新增原来没给的方式。只影响还没付的这一笔；用户付款时从中选一种，生成的订单就用那一种。链接地址不变。'}
        </Typography.Paragraph>
        <Checkbox.Group value={methodDraft} onChange={(value) => setMethodDraft(value as string[])}>
          <Space direction="vertical">
            {methodTarget && methodsForLine(methodTarget.link.line).filter((method) => !(methodTarget.link.audience === 'open' && method.kind === 'manual')).map((method) => (
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
        title={`${en ? 'Add membership' : '添加会员'} · ${memberTarget || ''}`}
        open={!!memberTarget}
        onCancel={() => setMemberTarget(null)}
        onOk={addMembership}
        okButtonProps={{ disabled: !memberDays || memberDays <= 0 }}
        okText={en ? 'Save' : '保存'}
        cancelText={en ? 'Cancel' : '取消'}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary">
          {en
            ? 'For example, give trial days after the first payment. This only extends the membership; it does not create or change any order of this link.'
            : '例如首款到账后先给用户开通体验天数。这里只延长会员有效期，不生成也不修改这条链接下的任何订单。'}
        </Typography.Paragraph>
        <div className="pl-label">{en ? 'Days' : '有效期天数'}</div>
        <InputNumber min={1} max={365} value={memberDays} onChange={(value) => setMemberDays(typeof value === 'number' ? value : null)} addonAfter={en ? 'days' : '天'} style={{ width: '100%' }} />
        <Typography.Text type="secondary" className="pl-field-hint">
          {en ? 'No active membership: counted from now. Active membership: added after the current expiry.' : '无有效会员从当前时间起算；有效会员从当前到期时间向后续期。'}
        </Typography.Text>
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
          <Typography.Text type="secondary">{en ? 'The QR code only carries the link ID. Scanning opens the same page as the link.' : '二维码里只有链接 ID，扫码打开的页面和复制链接是同一个。'}</Typography.Text>
        </Space>
      </Modal>
    </div>
  )
}
