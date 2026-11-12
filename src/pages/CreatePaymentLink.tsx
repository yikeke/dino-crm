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
  Drawer,
  Empty,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { ArrowLeftOutlined, ClockCircleOutlined, CopyOutlined, CrownOutlined, EditOutlined, EyeOutlined, HistoryOutlined, LinkOutlined, QrcodeOutlined, RightOutlined, StopOutlined } from '@ant-design/icons'
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
  balanceDeadline,
  balanceOverdue,
  confirmBankPayment,
  currentStage,
  historyEntry,
  logLinkAction,
  ensurePaymentLinkData,
  isExpired,
  now,
  orderState,
  paidTxn,
  payLinkUrl,
  readLinkOrders,
  readLinkTxns,
  parseTime,
  readPaymentLinks,
  singlePayment,
  stageAmount,
  stageMethods,
  syncUpfrontOrder,
  writePaymentLinks,
  type LinkHistoryEntry,
  type LinkTxn,
  type WebOrder,
  type PayStage,
  type PaymentLink,
} from '../paymentLinkStore'
import { enValue } from '../channel'
import { methodDisplayName, methodsForLine } from '../paymentMethods'
import './CreatePaymentLink.css'

type Scene = 'all' | 'first' | 'balance' | 'full_wait' | 'done' | 'collecting' | 'expired'

const OPEN_LINK_LINES = ['Korea']
const PERSONAL_LINK_LINES = ['Malaysia', 'Thailand', 'Vietnam', 'Korea']

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

/** scope 'user': links tied to one User ID (full, or split into deposit + balance). scope 'open': expo / printed QR links. */
export default function CreatePaymentLink({ scope = 'user' }: { scope?: 'user' | 'open' }) {
  const openPage = scope === 'open'
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
  const [linkOrders, setLinkOrders] = useState<WebOrder[]>(() => readLinkOrders())
  const [linkTxns, setLinkTxns] = useState<LinkTxn[]>(() => readLinkTxns())
  const [line, setLine] = useState('')
  const [channelId, setChannelId] = useState('')
  const [usePromo, setUsePromo] = useState(true)
  const [userQuery, setUserQuery] = useState(presetUserId)
  const [depositSkuId, setDepositSkuId] = useState('')
  const [firstAmount, setFirstAmount] = useState<number | null>(null)
  const [payMethods, setPayMethods] = useState<string[]>([])
  const [tab, setTab] = useState<'full' | 'deposit'>('full')
  const [audience, setAudience] = useState<'user' | 'open'>(openPage ? 'open' : 'user')
  const [eventName, setEventName] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [screen, setScreen] = useState<'list' | 'form'>(presetUserId ? 'form' : 'list')
  const [keyword, setKeyword] = useState('')
  const [scene, setScene] = useState<Scene>('all')
  const [lineFilter, setLineFilter] = useState<string | undefined>()
  const [channelFilter, setChannelFilter] = useState<string | undefined>()
  const [qrTarget, setQrTarget] = useState<PaymentLink | null>(null)
  const [qrImage, setQrImage] = useState('')
  const [memberTarget, setMemberTarget] = useState<string | null>(null)
  const [memberLink, setMemberLink] = useState('')
  const [historyOf, setHistoryOf] = useState<PaymentLink | null>(null)
  const [memberDays, setMemberDays] = useState<number | null>(7)
  const [confirmTarget, setConfirmTarget] = useState<{ link: PaymentLink; skuId: string } | null>(null)
  const holdLineReset = useRef(false)
  const navigate = useNavigate()
  const { account, role } = useCurrentAccount()
  const session = useSession()
  const myEmail = account?.email || session?.email || ''
  const canConfirmBank = !role || role.id === 'role_admin' || role.id === 'role_ops' || role.id === 'role_sales_leader'
  const ccManager = role?.id !== 'role_support'
  const students = useStore((s) => s.students)
  const accounts = useStore((s) => s.accounts)
  const actorName = (email?: string) => accounts.find((item) => item.email === email)?.name || email || '—'
  const logAction = (id: string, action: string, detail: string) => logLinkAction(id, myEmail || 'admin@dinoai.ai', action, detail)
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
    setLinkTxns(readLinkTxns())
  }

  useEffect(() => {
    const onFocus = () => {
      reloadCatalog()
      reload()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const lines = useMemo(() => {
    const all = linesInCatalog(catalog.skus, catalog.channels)
    return all.filter((item) => (openPage ? OPEN_LINK_LINES : PERSONAL_LINK_LINES).includes(item))
  }, [catalog.skus, catalog.channels, openPage])
  const activeLine = (lines.includes(line) ? line : '') || lines[0] || ''
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

  const openDetail = (id: string) => setSearchParams({ link: id })
  const closeDetail = () => setSearchParams({})

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
    if (editingId) return
    setPayMethods(methodsForLine(activeLine).map((item) => item.code))
  }, [activeLine]) // eslint-disable-line react-hooks/exhaustive-deps

  const persist = (next: PaymentLink[]) => {
    setLinks(next)
    writePaymentLinks(next)
  }

  const ordersBy = useMemo(() => {
    const map = new Map<string, WebOrder[]>()
    linkOrders.forEach((order) => map.set(order.paymentLinkId, [...(map.get(order.paymentLinkId) || []), order]))
    return map
  }, [linkOrders])
  const txnsBy = useMemo(() => {
    const map = new Map<string, LinkTxn[]>()
    linkTxns.forEach((txn) => map.set(txn.paymentLinkId, [...(map.get(txn.paymentLinkId) || []), txn]))
    return map
  }, [linkTxns])
  const ordersOf = (id: string) => ordersBy.get(id) || []
  const txnsOf = (id: string) => txnsBy.get(id) || []
  const editable = (row: PaymentLink) => row.status === 'ACTIVE' && (row.audience !== 'open' || ccManager)
  const firstLocked = !!editingId && !!paidTxn(txnsOf(editingId), 'DEPOSIT_FIRST')

  const DEPOSIT_VALID_DAYS = 7
  const defaultValidity = (kind: 'full' | 'deposit') => (kind === 'deposit' ? dayjs().add(DEPOSIT_VALID_DAYS, 'day').format('YYYY-MM-DD') : '')

  const resetCustomer = () => {
    setUserQuery('')
    setFirstAmount(null)
    setAudience(openPage ? 'open' : 'user')
    setEventName('')
    setValidUntil('')
    setPayMethods(methodsForLine(activeLine).map((item) => item.code))
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
  const scopeLocked = !!editingId
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
      validUntil: validUntil || undefined,
      status: 'ACTIVE',
      url: payLinkUrl(id),
      createdAt: previous?.createdAt || nowText(),
      updatedAt: nowText(),
      createdBy: previous ? previous.createdBy : myEmail,
    }
  }

  const save = (row: PaymentLink) => {
    const previous = editingId ? links.find((item) => item.id === editingId) : undefined
    const action = previous ? '编辑链接' : row.audience === 'open' ? '新建通用链接' : row.kind === 'deposit' ? '新建定金链接' : '新建全款链接'
    const methodText = row.methods.map((code) => methodName(row, code)).join('、')
    const changes = previous
      ? [
          row.audience === 'open' && previous.eventName !== row.eventName && `活动名 ${previous.eventName || '—'} → ${row.eventName || '—'}`,
          (previous.validUntil || '') !== (row.validUntil || '') && `有效期 ${previous.validUntil || '不限'} → ${row.validUntil || '不限'}`,
          previous.methods.join() !== row.methods.join() && `支付方式 ${previous.methods.map((code) => methodName(previous, code)).join('、')} → ${methodText}`,
          (previous.promoCode || '') !== (row.promoCode || '') && `优惠 ${previous.promoCode || '全部原价'} → ${row.promoCode || '全部原价'}`,
          row.kind === 'deposit' && previous.amount !== row.amount && `首款 ${formatMoney(previous.amount, row.currency)} → ${formatMoney(row.amount, row.currency)}`,
        ].filter(Boolean).join('；') || '未改动'
      : ''
    const validText = row.validUntil ? `，有效期至 ${row.validUntil}` : ''
    const detail = changes ? changes : row.kind === 'deposit'
      ? `首款 ${formatMoney(row.amount, row.currency)}，尾款 ${formatMoney(Math.max(row.payable - row.amount, 0), row.currency)}${validText} · ${methodText}`
      : row.audience === 'open'
        ? `${row.eventName || ''}${validText} · ${row.offers.length} 个 SKU · ${methodText}`
        : `${row.offers.length} 个 SKU${validText} · ${methodText}`
    row = { ...row, history: [...(previous?.history || []), historyEntry(myEmail || 'admin@dinoai.ai', action, detail)] }
    persist(editingId ? links.map((item) => (item.id === editingId ? row : item)) : [row, ...links])
    syncUpfrontOrder(row)
    reload()
    setEditingId(null)
    setScreen('list')
    setKeyword('')
    setScene('all')
    resetCustomer()
  }

  const blockedEdit = () => {
    const row = editingId ? links.find((item) => item.id === editingId) : undefined
    if (row && !editable(row)) {
      message.warning(en ? 'Only CC managers can edit open links' : '通用链接只有 CC 主管能编辑')
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
    if (!validUntil) {
      message.warning(en ? 'Deposit links need a valid-until date' : '定金链接必须设置有效期')
      return
    }
    save(baseFields('deposit', amount, editingId || newId('PL')))
    message.success(editingId
      ? (en ? 'Deposit link updated' : '定金链接已更新')
      : (en ? 'Deposit link created. The customer pays the first payment and the balance with the same link.' : '定金链接已生成，首款和尾款都用这一条链接支付'))
  }

  const startEdit = (row: PaymentLink) => {
    if (!editable(row)) {
      message.warning(en ? 'Only CC managers can edit open links' : '通用链接只有 CC 主管能编辑')
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

  const confirmTransfer = (row: PaymentLink, skuId?: string) => {
    const txn = confirmBankPayment(row.id, skuId)
    if (!txn || txn.status !== 'SUCCESS') return
    logAction(row.id, txn.payStage === 'DEPOSIT_FIRST' ? '确认首款到账' : txn.payStage === 'DEPOSIT_BALANCE' ? '确认尾款到账' : '确认全款到账',
      `${txn.orderNo} / ${txn.txnId} · ${formatMoney(txn.amount, txn.currency)}${txn.payStage === 'DEPOSIT_FIRST' ? '' : '，开通会员'}`)
    reload()
    setConfirmTarget(null)
    message.success(txn.payStage === 'DEPOSIT_FIRST'
      ? (en ? 'First transfer confirmed. Membership stays closed until the balance is paid.' : '首款已确认。会员等尾款到账后再开通。')
      : (en ? 'Transfer confirmed and membership opened' : '已确认转账并开通会员'))
  }

  const confirmTransferSafely = (row: PaymentLink, skuId?: string) => {
    const stage = currentStage(row, txnsOf(row.id))
    const first = stage === 'DEPOSIT_FIRST'
    const order = ordersOf(row.id).find((item) => !item.cancelled)
    const offer = row.offers.find((item) => item.skuId === (skuId || order?.skuId)) || (row.offers.length === 1 ? row.offers[0] : undefined)
    const amount = first ? row.amount : stage === 'DEPOSIT_BALANCE' ? Math.max(row.payable - row.amount, 0) : offer?.payable || row.payable
    Modal.confirm({
      title: first ? (en ? 'Confirm the first payment arrived?' : '确认首款已到账？') : (en ? 'Confirm the transfer and open membership?' : '确认到账并开通会员？'),
      content: (
        <div className="pl-confirm-modal">
          <p>{en ? 'Check the bank statement first: the amount and the transfer note must both match.' : '请先核对银行流水：金额和转账附言都要对上。'}</p>
          <p>{en ? 'Link' : '链接'}：{row.id}{row.userId ? ` · User ID ${row.userId}` : ''}</p>
          <p>{stageName(stage || 'FULL')}：<b>{formatMoney(amount, row.currency)}</b>{offer && row.kind === 'full' ? ` · ${offer.skuName}` : ''}</p>
          <p>{first
            ? (en ? 'Membership opens after the balance is paid. This cannot be undone.' : '会员等尾款到账后再开通。确认后不能撤销。')
            : (en ? 'Membership opens right away. This cannot be undone.' : '确认后马上开通会员，不能撤销。')}</p>
        </div>
      ),
      okText: first ? (en ? 'Confirm first payment' : '确认首款已到账') : (en ? 'Confirm & open membership' : '确认到账并开通会员'),
      cancelText: en ? 'Cancel' : '取消',
      onOk: () => confirmTransfer(row, skuId),
    })
  }

  const askConfirm = (row: PaymentLink) => {
    const order = ordersOf(row.id).find((item) => !item.cancelled)
    if (row.offers.length > 1 && !order?.skuId) {
      setConfirmTarget({ link: row, skuId: row.offers[0]?.skuId || '' })
      return
    }
    confirmTransferSafely(row)
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

  const editingRow = editingId ? links.find((item) => item.id === editingId) : undefined
  const today = dayjs().format('YYYY-MM-DD')
  const stopped = !!validUntil && validUntil < today

  const setCollecting = (stop: boolean) => {
    if (!editingRow) return
    const next = stop ? dayjs().subtract(1, 'day').format('YYYY-MM-DD') : defaultValidity(editingRow.kind) || undefined
    Modal.confirm({
      title: stop ? (en ? 'Stop taking payments?' : '停止收款？') : (en ? 'Resume taking payments?' : '恢复收款？'),
      content: stop
        ? (en ? 'Valid-until becomes yesterday and takes effect now. The customer page shows the link as expired. Paid orders stay as they are.' : '有效期改成昨天，马上生效：用户打开链接提示已过期，不能再付款。已支付的订单不变。')
        : editingRow.kind === 'deposit'
          ? (en ? `Valid-until becomes ${next} (7 days from today) and takes effect now.` : `有效期改成 ${next}（今天起 7 天），马上生效，用户可以继续付款。`)
          : (en ? 'Valid-until is cleared (no end date) and takes effect now.' : '清空有效期（不限期），马上生效，用户可以继续付款。'),
      okText: stop ? (en ? 'Stop' : '停止收款') : (en ? 'Resume' : '恢复收款'),
      okButtonProps: stop ? { danger: true } : undefined,
      cancelText: en ? 'Cancel' : '取消',
      onOk: () => {
        persist(links.map((item) => (item.id === editingRow.id ? { ...item, validUntil: next, updatedAt: nowText() } : item)))
        logAction(editingRow.id, stop ? '停止收款' : '恢复收款', `有效期 ${editingRow.validUntil || '不限'} → ${next || '不限'}`)
        reload()
        setValidUntil(next || '')
        message.success(stop ? (en ? 'Payments stopped' : '已停止收款') : (en ? 'Payments resumed' : '已恢复收款'))
      },
    })
  }

  const validityCard = (no: number, deposit: boolean) => (
    <Card size="small" title={step(no, en ? 'Link validity' : '链接有效期', deposit
      ? (en ? 'Required for deposits, 7 days by default' : '定金必填，默认 7 天')
      : (en ? 'Leave empty for no end date' : '不填就不限期'))}>
      <div className="pl-validity">
        <div>
          <div className="pl-label">{deposit && <span className="pl-required">*</span>}{en ? 'Valid until' : '有效期至'}</div>
          <Input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} style={{ width: 220 }} />
        </div>
        {editingRow && (stopped ? (
          <>
            <Tag bordered={false}>{en ? 'Payments stopped' : '已停止收款'}</Tag>
            <Button onClick={() => setCollecting(false)}>{en ? 'Resume payments' : '恢复收款'}</Button>
          </>
        ) : (
          <Button danger icon={<StopOutlined />} onClick={() => setCollecting(true)}>{en ? 'Stop payments now' : '一键停止收款'}</Button>
        ))}
      </div>
      <Typography.Text type="secondary" className="pl-field-hint">
        {editingRow
          ? (deposit
            ? (en ? '"Stop payments now" sets valid-until to yesterday and takes effect immediately. Resume sets it to 7 days from today; you can also pick another date and save.' : '「一键停止收款」把有效期改成昨天，马上生效；「恢复收款」改成今天起 7 天。也可以直接选日期，保存后生效。')
            : (en ? '"Stop payments now" sets valid-until to yesterday and takes effect immediately. Resume clears it; you can also pick a later date and save.' : '「一键停止收款」把有效期改成昨天，马上生效；「恢复收款」清空有效期。也可以直接选日期，保存后生效。'))
          : deposit
            ? (en ? 'First payment and balance must both be paid by this date. After the first payment, the customer page shows the days left.' : '首款和尾款都要在有效期内付完。首款到账后，用户支付页提示还剩几天；过期后不能再付。')
            : (en ? 'Optional. After this date the customer page shows the link as expired and it cannot be paid.' : '可不填。过了有效期，用户打开链接提示已失效，不能再付款。')}
      </Typography.Text>
    </Card>
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
          {validityCard(++stepNo, mode === 'deposit')}

          {open && (
            <Card size="small" title={step(++stepNo, en ? 'Event / material name' : '活动 / 物料名称', en ? 'Open links only' : '通用支付链接专有')}>
              <div className="pl-field">
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
              </div>
            </Card>
          )}

          <Card size="small" title={step(++stepNo, en ? 'Who pays' : '付款人', open ? (en ? 'Set by default' : '默认，不用配置') : (en ? 'Phone number or User ID' : '手机号或 User ID'))}>
            {open ? (
              <div className="pl-field">
                <div>
                  <div className="pl-label">{en ? 'Payer' : '付款人'}</div>
                  <div className="pl-payer-fixed">{en ? 'Whoever scans logs in to Dino AI first; the payment binds to that account' : '扫码用户先登录 Dino AI 再付款，付款绑定到登录的账号'}</div>
                  <Typography.Text type="secondary" className="pl-field-hint">{en ? 'Fixed for open links. No User ID to pick.' : '通用支付链接固定如此，不用指定 User ID。'}</Typography.Text>
                </div>
              </div>
            ) : (
              <div className="pl-field">
              <div>
                <div className="pl-label">{en ? 'User' : '用户'} <span className="pl-required">*</span></div>
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
              disabled={!!editingId}
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
            ) : null}
            {editingId ? (
              <Typography.Text type="secondary" className="pl-field-hint">{en ? 'The payer cannot change after the link is created. For another user, create a new link.' : '链接生成后不能换付款人，换人请新建链接。'}</Typography.Text>
            ) : !linkedStudent ? (
              <Typography.Text type="secondary" className="pl-field-hint">
                {userQuery.trim().length >= 2
                  ? (en ? 'Pick a user from the matches. The link saves the User ID.' : '请从下拉结果里选中一个用户，链接保存的是 User ID。')
                  : (en ? 'The link is tied to one user. Only that user can pay with it.' : '链接绑定一个用户，只给这个用户付款。')}
              </Typography.Text>
            ) : null}
              </div>
              </div>
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
                  disabled={scopeLocked}
                />
                <Typography.Text type="secondary" className="pl-field-hint">
                  {scopeLocked
                    ? (en ? 'Business line and channel cannot be changed after the link is created.' : '链接生成后，业务线和渠道不能改。')
                    : openPage
                      ? (en ? 'Open links are Korea only in this release.' : '通用链接本期只开放韩国。')
                      : (en ? 'Personal links are open to Malaysia, Thailand, Vietnam and Korea in this release.' : '专属链接本期开放马来西亚、泰国、越南、韩国。')}
                </Typography.Text>
              </div>
              <div>
                <div className="pl-label">{en ? 'Channel' : '渠道'}</div>
                <Select
                  style={{ width: '100%' }}
                  disabled={scopeLocked}
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
                <div className="pl-promo">
                  <div className="pl-label">{en ? 'Use a promo?' : '是否使用优惠'}</div>
                  <Select
                    style={{ width: 360 }}
                    value={hasDiscount && usePromo ? 'yes' : 'no'}
                    disabled={!hasDiscount || firstLocked}
                    onChange={(value) => { setUsePromo(value === 'yes'); setFirstAmount(null) }}
                    options={[
                      ...(hasDiscount ? [{ value: 'yes', label: `${en ? 'Use promo' : '使用优惠'} - ${activeChannel.plan.promoCode}` }] : []),
                      { value: 'no', label: en ? 'No promo, all at list price' : '不使用优惠，全部原价售卖' },
                    ]}
                  />
                  {!hasDiscount && <Typography.Text type="secondary" className="pl-field-hint">{en ? 'This plan has no promo.' : '当前方案没有优惠。'}</Typography.Text>}
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

          {!open && (
            <Card size="small" title={step(++stepNo, en ? 'Split into two payments?' : '是否拆成两笔支付', en ? 'Not split = full payment; split = deposit' : '不拆 = 全款；拆成两笔 = 定金')}>
              <div className="pl-audience">
                {([
                  { value: 'full', title: en ? 'No, pay in full' : '不拆，一次付清', desc: en ? 'Full payment. Every SKU on the plan is offered; the customer picks one.' : '全款支付。方案内的 SKU 都给用户选，用户选一个付清。' },
                  { value: 'deposit', title: en ? 'Split: first payment + balance' : '拆成两笔：首款 + 尾款', desc: en ? 'Deposit. One SKU; the customer pays the first payment now and the balance later with the same link.' : '定金支付。只能选 1 个 SKU；用户先付首款，之后用同一条链接付尾款。' },
                ] as const).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`pl-audience__item${mode === item.value ? ' is-on' : ''}`}
                    disabled={!!editingId && mode !== item.value}
                    onClick={() => {
                      setTab(item.value)
                      setFirstAmount(null)
                      if (editingId) return
                      if (item.value === 'deposit' && !validUntil) setValidUntil(defaultValidity('deposit'))
                      if (item.value === 'full' && validUntil === defaultValidity('deposit')) setValidUntil('')
                    }}
                  >
                    <span className="pl-audience__radio" />
                    <span>
                      <b>{item.title}</b>
                      <Typography.Text type="secondary">{item.desc}</Typography.Text>
                    </span>
                  </button>
                ))}
              </div>
              {editingId && (
                <Typography.Text type="secondary" className="pl-field-hint">{en ? 'Full payment or deposit cannot change after the link is created.' : '链接生成后不能在全款、定金之间切换，要换请新建链接。'}</Typography.Text>
              )}
            </Card>
          )}

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
                  disabled={firstLocked}
                  style={{ width: 260 }}
                />
                {!firstLocked && <Space size={6}>
                  {quickFirst.map((item) => (
                    <Button key={item.label} size="small" onClick={() => setFirstAmount(item.value)}>{item.label}</Button>
                  ))}
                </Space>}
              </div>
              {firstLocked && (
                <Typography.Text type="secondary" className="pl-field-hint">{en ? 'The first payment is paid, so the amount, SKU and promo are fixed.' : '首款已付，首款金额、SKU、优惠都不能再改。'}</Typography.Text>
              )}
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
              <Typography.Text type="secondary" className="pl-field-hint">{en ? 'Manual bank transfer is not offered on open links in this release.' : '通用链接本期不提供手动银行转账。'}</Typography.Text>
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
              {open
                ? <Tag color="cyan" bordered={false}>{en ? 'Open link · reusable' : '通用链接 · 可多次付款'}</Tag>
                : (
                  <Tag color={mode === 'full' ? 'green' : 'blue'} bordered={false}>
                    {mode === 'full' ? (en ? 'Full payment · not split' : '全款 · 不拆分') : (en ? 'Deposit · split into 2 payments' : '定金 · 拆成两笔')}
                  </Tag>
                )}
              {editingId && <Tag bordered={false}>{en ? 'Editing' : '编辑中'} {editingId}</Tag>}
            </div>
            <dl className="pl-summary__list">
              <dt>{en ? 'Customer' : '客户'}</dt>
              <dd>{open ? <>{en ? 'Bound at login' : '登录后绑定'}{eventName.trim() && <><br /><Typography.Text type="secondary">{eventName.trim()}</Typography.Text></>}{validUntil && <><br /><Typography.Text type="secondary">{en ? 'Until' : '有效期至'} {validUntil}</Typography.Text></>}</> : linkedStudent ? <>{linkedStudent.name}<br /><Typography.Text type="secondary">{linkedStudent.studentId}</Typography.Text>{validUntil && <><br /><Typography.Text type="secondary">{en ? 'Until' : '有效期至'} {validUntil}</Typography.Text></>}</> : <Typography.Text type="secondary">{en ? 'Not selected' : '未选择'}</Typography.Text>}</dd>
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
                : (en ? 'One link and one order for both payments, with two transactions under the order. Membership opens after the balance.' : '首款、尾款用同一条链接、同一张订单，订单下两笔交易；尾款到账后开通会员。')}
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

  const paidOf = paidTxn

  const leftText = (due: string) => {
    const left = parseTime(due) - Date.now()
    if (left <= 0) {
      const late = Math.max(1, Math.floor(-left / 86_400_000))
      return en ? `${late} day${late > 1 ? 's' : ''} overdue` : `已逾期 ${late} 天`
    }
    const days = Math.floor(left / 86_400_000)
    const hours = Math.floor(left / 3_600_000) % 24
    if (days) return en ? `${days}d ${hours}h left` : `剩 ${days} 天 ${hours} 小时`
    return en ? `${hours}h ${Math.floor(left / 60_000) % 60}m left` : `剩 ${hours} 小时 ${Math.floor(left / 60_000) % 60} 分`
  }

  const dueLine = (row: PaymentLink) => {
    const orders = txnsOf(row.id)
    if (paidOf(orders, 'DEPOSIT_BALANCE') || isExpired(row)) return null
    const due = balanceDeadline(row, orders)
    if (!due) return null
    const left = parseTime(due) - Date.now()
    const tone = left <= 0 ? 'is-late' : left < 86_400_000 * 2 ? 'is-soon' : ''
    return (
      <span className={`pl-due-line ${tone}`}>
        <ClockCircleOutlined /> {en ? 'Balance by valid-until' : '尾款需在有效期内付清'}
        <b>{leftText(due)}</b>
      </span>
    )
  }

  const linkStatus = (row: PaymentLink): { label: string; color: string } => {
    const orders = txnsOf(row.id)
    const expired = { label: en ? 'Expired' : '已过期', color: 'default' }
    if (row.audience === 'open') return isExpired(row) ? expired : { label: en ? 'Collecting' : '收款中', color: 'cyan' }
    if (row.kind === 'full') {
      if (paidOf(orders, 'FULL')) return { label: en ? 'Paid' : '已支付', color: 'success' }
      if (isExpired(row)) return expired
      return { label: en ? 'Awaiting payment' : '待支付', color: 'processing' }
    }
    if (paidOf(orders, 'DEPOSIT_BALANCE')) return { label: en ? 'Fully paid' : '已付清', color: 'success' }
    if (balanceOverdue(row, orders)) return { label: en ? 'Expired · first payment paid' : '已过期 · 已付首款', color: 'error' }
    if (isExpired(row)) return expired
    if (paidOf(orders, 'DEPOSIT_FIRST')) {
      return { label: en ? 'Balance due' : '待付尾款', color: 'orange' }
    }
    return { label: en ? 'First payment due' : '待付首款', color: 'processing' }
  }

  const collected = (row: PaymentLink) => txnsOf(row.id).filter((txn) => txn.status === 'SUCCESS')

  const txnStatusTag = (txn: LinkTxn) => {
    if (txn.status === 'SUCCESS') return <Tag color="success" bordered={false}>SUCCESS</Tag>
    if (txn.status === 'FAILED') return <Tag color="error" bordered={false}>FAILED</Tag>
    return <Tag color="processing" bordered={false}>PENDING</Tag>
  }

  const orderStateTag = (order: WebOrder) => {
    const { state } = orderState(order, linkTxns)
    const label: Record<string, [string, string, string]> = {
      COMPLETED: ['success', 'Paid', '已支付'],
      PARTIALLY_PAID: ['blue', 'Partially paid', '部分付款'],
      CANCELLED: ['default', 'Cancelled', '已取消'],
      PENDING: ['processing', 'Unpaid', '待支付'],
    }
    const [color, enText, zhText] = label[state]
    return <Tag color={color} bordered={false}>{en ? enText : zhText}</Tag>
  }

  const txnLine = (row: PaymentLink, txn: LinkTxn) => (
    <div key={txn.txnId} className={`pl-order-line is-${txn.status.toLowerCase()}`}>
      <Typography.Text className="pl-order-no" copyable>{txn.txnId}</Typography.Text>
      <span className="pl-order-line__method">{methodName(row, txn.method)}</span>
      {txnStatusTag(txn)}
      <Typography.Text type="secondary" className="pl-order-line__time">
        {txn.status === 'SUCCESS'
          ? `${en ? 'Paid' : '支付'} ${(txn.paidAt || '').slice(0, 16)}`
          : `${en ? 'Started' : '发起'} ${txn.createdAt.slice(0, 16)}`}
      </Typography.Text>
      {txn.status === 'FAILED' && txn.failReason && <Typography.Text type="secondary" className="pl-leg__id">{txn.failReason}</Typography.Text>}
      {txn.status !== 'FAILED' && txn.transferReference && (
        <Typography.Text type="secondary" className="pl-leg__id">{en ? 'Transfer note' : '转账附言'} {txn.transferReference}</Typography.Text>
      )}
    </div>
  )

  const confirmButton = (row: PaymentLink, stage: PayStage) => (
    <Button size="small" type="primary" onClick={() => askConfirm(row)}>
      {stage === 'DEPOSIT_FIRST'
        ? (en ? 'Confirm first transfer' : '确认首款已到账')
        : (en ? 'Confirm transfer & open membership' : '确认到账并开通会员')}
    </Button>
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
      width: 72,
      render: (_: unknown, row: PaymentLink) => (
        row.kind === 'full' ? <Tag color="green">{en ? 'Full' : '全款'}</Tag> : <Tag color="orange">{en ? 'Deposit' : '定金'}</Tag>
      ),
    },
    {
      title: openPage ? (en ? 'Event / Link' : '活动 / 物料 · 链接') : (en ? 'Link / User ID' : '链接 / User ID'),
      width: 210,
      render: (_: unknown, row: PaymentLink) => (
        <div className="pl-two-line">
          {row.audience === 'open' && <a className="pl-link-title" onClick={() => openDetail(row.id)}>{row.eventName || '—'}</a>}
          <a className="pl-link-id" onClick={() => openDetail(row.id)}>{row.id}</a>
          {row.audience === 'open'
            ? <Typography.Text type="secondary">{en ? 'Payer bound at login' : '付款人扫码登录后绑定'}</Typography.Text>
            : (
              <>
                <Typography.Text type="secondary" copyable={!!row.userId}>{row.userId || '—'}</Typography.Text>
                {row.userId && (
                  <Button size="small" type="link" className="pl-member-btn" icon={<CrownOutlined />} onClick={() => { setMemberTarget(row.userId || null); setMemberLink(row.id); setMemberDays(7) }}>
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
      width: 200,
      render: (_: unknown, row: PaymentLink) => (
        <div className="pl-two-line">
          <span>{row.channelName || '—'}</span>
          <Typography.Text type="secondary">{(row.offers || []).map((item) => item.skuName).join(' / ') || row.skuName}</Typography.Text>
        </div>
      ),
    },
    {
      title: en ? 'Status' : '状态',
      width: 180,
      render: (_: unknown, row: PaymentLink) => {
        const status = linkStatus(row)
        const paid = collected(row).length
        return (
          <div className="pl-two-line">
            <span><Tag color={status.color} bordered={false}>{status.label}</Tag></span>
            {row.validUntil && <Typography.Text type="secondary">{en ? 'Until' : '至'} {row.validUntil}</Typography.Text>}
            {row.kind === 'deposit' && row.status === 'ACTIVE' && dueLine(row)}
            {row.audience === 'open' && <Typography.Text type="secondary">{en ? `${paid} paid order${paid === 1 ? '' : 's'}` : `${paid} 张已支付订单`}</Typography.Text>}
          </div>
        )
      },
    },
    {
      title: en ? 'Creator' : '创建人',
      width: 190,
      render: (_: unknown, row: PaymentLink) => row.createdBy || '—',
    },
    {
      title: en ? 'Created / Updated' : '创建 / 更新',
      width: 140,
      render: (_: unknown, row: PaymentLink) => {
        const latest = [row.updatedAt, ...txnsOf(row.id).map((txn) => (txn.paidAt || txn.createdAt).slice(0, 16))].sort().pop()
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
      width: 210,
      fixed: 'right' as const,
      render: (_: unknown, row: PaymentLink) => (
        <Space direction="vertical" size={4}>
          <Button size="small" type="link" icon={<RightOutlined />} className="pl-history-btn" onClick={() => openDetail(row.id)}>{en ? 'Details' : '查看详情'}</Button>
          {linkActions(row)}
          <Space size={4} wrap>
            {editable(row) && <Button size="small" type="link" icon={<EditOutlined />} onClick={() => startEdit(row)}>{en ? 'Edit' : '编辑'}</Button>}
            <Button size="small" type="link" icon={<HistoryOutlined />} className="pl-history-btn" onClick={() => setHistoryOf(row)}>{en ? 'History' : '操作记录'}</Button>
          </Space>
        </Space>
      ),
    },
  ]

  const stageRows = (row: PaymentLink) => {
    const txns = txnsOf(row.id)
    const order = ordersOf(row.id).find((item) => !item.cancelled) || ordersOf(row.id)[0]
    const stages: PayStage[] = row.kind === 'full' ? ['FULL'] : ['DEPOSIT_FIRST', 'DEPOSIT_BALANCE']
    const firstPaid = paidOf(txns, 'DEPOSIT_FIRST')
    const offer = row.offers.find((item) => item.skuId === order?.skuId) || (row.offers.length === 1 ? row.offers[0] : undefined)
    const collectingStage = currentStage(row, txns)
    const paidSum = order ? orderState(order, linkTxns).paid : 0
    return (
      <div className="pl-legs">
        <div className="pl-order-head">
          {order ? (
            <>
              <span className="pl-order-head__label">Web Order</span>
              <Typography.Text className="pl-order-no" copyable>{order.orderNo}</Typography.Text>
              {orderStateTag(order)}
              <Typography.Text type="secondary">
                {order.skuName || (en ? 'SKU picked by customer' : '用户付款时选 SKU')}
                {order.payable ? ` · ${en ? 'Payable' : '应付'} ${formatMoney(order.payable, order.currency)} · ${en ? 'Paid' : '已付'} ${formatMoney(paidSum, order.currency)}` : ''}
              </Typography.Text>
              <Typography.Text type="secondary" className="pl-leg__relation">
                {order.origin === 'link'
                  ? (en ? 'Created with the link (manual bank transfer offered)' : '链接含手动银行转账，创建链接时已生成')
                  : (en ? 'Created when the customer reached the payment page' : '用户进入三方支付页时生成')}
              </Typography.Text>
            </>
          ) : (
            <>
              <span className="pl-order-head__label">Web Order</span>
              <Tag bordered={false}>{en ? 'Not created yet' : '未创建'}</Tag>
              <Typography.Text type="secondary">{en ? 'Third-party methods only: the order is created when the customer reaches the payment page.' : '只挂三方支付：用户进入三方支付页时才创建订单。'}</Typography.Text>
            </>
          )}
        </div>
        {stages.map((stage, index) => {
          const mine = txns.filter((txn) => txn.payStage === stage).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          const paid = mine.find((txn) => txn.status === 'SUCCESS')
          const live = paid || mine.find((txn) => txn.status === 'PENDING')
          const failed = mine.filter((txn) => txn.status === 'FAILED')
          const waiting = stage === 'DEPOSIT_BALANCE' && !firstPaid
          const amount = stage === 'FULL' && !offer ? (live?.amount ?? 0) : stageAmount(row, stage, offer, txns)
          const canConfirm = canConfirmBank && row.status === 'ACTIVE' && collectingStage === stage && stageMethods(row, stage).includes('bank_transfer')
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
                {live ? txnLine(row, live) : (
                  <div className="pl-order-line is-none">
                    <Tag bordered={false}>{waiting ? (en ? 'After first payment' : '首款付清后可付') : (en ? 'No transaction yet' : '暂无交易')}</Tag>
                    <Typography.Text type="secondary">
                      {en ? 'A transaction is created each time the customer reaches the payment step' : '用户每次进入支付页（三方页或转账面板）生成一笔交易'}
                    </Typography.Text>
                  </div>
                )}
                {stage === 'DEPOSIT_BALANCE' && firstPaid && !paid && row.status === 'ACTIVE' && dueLine(row)}
                {failed.length > 0 && (
                  <details className="pl-failed">
                    <summary>{en ? `${failed.length} failed attempt${failed.length > 1 ? 's' : ''}` : `${failed.length} 笔失败交易`}</summary>
                    {failed.map((txn) => txnLine(row, txn))}
                  </details>
                )}
                {canConfirm && <div className="pl-confirm-row">{confirmButton(row, stage)}</div>}
              </div>
              <div className="pl-leg__actions">
                {methodsCell(row, stageMethods(row, stage))}
              </div>
            </div>
          )
        })}
        <div className="pl-legs__note">
          {en
            ? 'Payment link → one web order → two successful transactions (first payment, balance). Membership opens when the order is fully paid.'
            : '支付链接 → 一张 Web Order → 两笔成功交易（首款、尾款）。订单付清后开通会员。'}
        </div>
      </div>
    )
  }

  const fullOrders = (row: PaymentLink) => {
    const collecting = currentStage(row, txnsOf(row.id)) === 'FULL'
    const canConfirm = canConfirmBank && row.status === 'ACTIVE' && collecting && row.methods.includes('bank_transfer')
    return (
      <>
        <div className="pl-detail-orders__bar">
          {methodsCell(row, row.methods)}
          {canConfirm && confirmButton(row, 'FULL')}
        </div>
        {openOrders(row)}
      </>
    )
  }

  const openOrders = (row: PaymentLink) => {
    const txns = txnsOf(row.id)
    const open = row.audience === 'open'
    const orders = [...ordersOf(row.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const paidCount = orders.filter((order) => orderState(order, linkTxns).state === 'COMPLETED').length
    return (
      <Table
        rowKey="orderNo"
        size="middle"
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        dataSource={orders}
        locale={{ emptyText: <Empty description={en ? 'No orders yet. An order is created each time a customer reaches the payment page.' : '还没有订单。用户每次进入三方支付页生成一张订单。'} /> }}
        title={() => (
          <div className="pl-detail-orders__head">
            <span>{en ? `${orders.length} orders · ${paidCount} paid` : `共 ${orders.length} 张订单 · 已支付 ${paidCount} 张`}</span>
          </div>
        )}
        columns={[
          {
            title: en ? 'Order no.' : '订单号',
            dataIndex: 'orderNo',
            width: 200,
            render: (value: string, order: WebOrder) => (
              <div className="pl-two-line">
                <Typography.Text className="pl-order-no" copyable>{value}</Typography.Text>
                {order.origin === 'link' && <Typography.Text type="secondary">{en ? 'Created with the link (manual bank transfer)' : '创建链接时生成（手动银行转账）'}</Typography.Text>}
              </div>
            ),
          },
          ...(open ? [{ title: 'User ID', dataIndex: 'userId', width: 200, render: (value?: string) => <Typography.Text copyable={!!value}>{value || '—'}</Typography.Text> }] : []),
          { title: 'SKU', dataIndex: 'skuName', width: 170, render: (value?: string) => value || '—' },
          { title: en ? 'Payable' : '应付', dataIndex: 'payable', width: 140, render: (value: number, order: WebOrder) => formatMoney(value, order.currency) },
          { title: en ? 'Order status' : '订单状态', key: 'state', width: 110, render: (_: unknown, order: WebOrder) => orderStateTag(order) },
          {
            title: en ? 'Payment' : '支付方式',
            key: 'pay',
            width: 140,
            render: (_: unknown, order: WebOrder) => {
              const pay = txns.find((txn) => txn.orderNo === order.orderNo)
              return pay ? methodName(row, pay.method) : '—'
            },
          },
          {
            title: en ? 'Paid at' : '支付时间',
            key: 'paidAt',
            width: 150,
            render: (_: unknown, order: WebOrder) => orderState(order, linkTxns).paidAt?.slice(0, 16) || '—',
          },
        ]}
      />
    )
  }

  const detailField = (label: string, value: React.ReactNode) => (
    <div className="pl-detail-field">
      <Typography.Text type="secondary">{label}</Typography.Text>
      <div>{value}</div>
    </div>
  )

  const detailPage = (row: PaymentLink) => {
    const status = linkStatus(row)
    const paid = collected(row)
    const open = row.audience === 'open'
    const single = singlePayment(row)
    const promo = row.promoCode ? `${en ? 'Use' : '使用'} ${row.promoCode}` : (en ? 'List price' : '全部原价')
    return (
      <div className="pl-detail">
        <div className="pl-form-head">
          <Button icon={<ArrowLeftOutlined />} onClick={closeDetail}>{en ? 'Back to list' : '返回列表'}</Button>
          <div className="pl-form-head__title">
            <Typography.Title level={5} style={{ margin: 0 }}>
              {open ? (row.eventName || row.id) : row.id}
              <Tag color={status.color} bordered={false} style={{ marginLeft: 8 }}>{status.label}</Tag>
              {!open && (row.kind === 'full' ? <Tag color="green">{en ? 'Full' : '全款'}</Tag> : <Tag color="orange">{en ? 'Deposit' : '定金'}</Tag>)}
            </Typography.Title>
            <Typography.Text type="secondary">
              {open ? `${row.id} · ${en ? 'Open payment link' : '通用支付链接'}` : `${en ? 'Personal payment link' : '专属支付链接'} · User ID ${row.userId || '—'}`}
            </Typography.Text>
          </div>
          <Space wrap className="pl-detail__actions">
            {linkActions(row)}
            {editable(row) && <Button size="small" type="link" icon={<EditOutlined />} onClick={() => startEdit(row)}>{en ? 'Edit' : '编辑'}</Button>}
            <Button size="small" type="link" icon={<HistoryOutlined />} onClick={() => setHistoryOf(row)}>{en ? 'History' : '操作记录'}</Button>
            {!open && row.userId && (
              <Button size="small" type="link" icon={<CrownOutlined />} onClick={() => { setMemberTarget(row.userId || null); setMemberLink(row.id); setMemberDays(7) }}>
                {en ? 'Add membership' : '添加会员'}
              </Button>
            )}
          </Space>
        </div>
        <Card size="small" title={en ? 'Link' : '链接信息'}>
          <div className="pl-detail-grid">
            {open
              ? detailField(en ? 'Payer' : '付款人', en ? 'Bound to the account that logs in' : '扫码登录后绑定')
              : detailField('User ID', <Typography.Text copyable={!!row.userId}>{row.userId || '—'}</Typography.Text>)}
            {detailField(en ? 'Business line' : '业务线', enValue(row.line))}
            {detailField(en ? 'Channel' : '渠道', row.channelName || '—')}
            {detailField('SKU', (row.offers || []).map((item) => item.skuName).join(' / ') || row.skuName)}
            {detailField(en ? 'Promo' : '优惠', promo)}
            {detailField(en ? 'Payment methods' : '支付方式', methodsCell(row, row.methods || []))}
            {detailField(en ? 'Valid until' : '有效期', row.validUntil || (en ? 'No end date' : '不限'))}
            {detailField(en ? 'Collected' : '已收', paid.length
              ? `${formatMoney(paid.reduce((sum, txn) => sum + txn.amount, 0), row.currency || paid[0].currency)} · ${single ? (en ? `${paid.length} paid orders` : `${paid.length} 张已支付订单`) : (en ? `${paid.length} successful` : `${paid.length} 笔成功交易`)}`
              : (en ? 'Nothing yet' : '暂无'))}
            {detailField(en ? 'Creator' : '创建人', row.createdBy || '—')}
            {detailField(en ? 'Created / Updated' : '创建 / 更新', `${row.createdAt} / ${row.updatedAt}`)}
            {detailField(en ? 'Link URL' : '链接地址', <Typography.Text copyable className="pl-detail-url">{row.url}</Typography.Text>)}
          </div>
        </Card>
        <Card size="small" title={single ? (en ? 'Orders' : '订单') : (en ? 'Order and transactions' : '订单与交易')} className="pl-detail-orders">
          {open ? openOrders(row) : single ? fullOrders(row) : stageRows(row)}
        </Card>
      </div>
    )
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
    if (memberLink) {
      logAction(memberLink, '添加会员', `${memberTarget} · ${memberDays} 天`)
      reload()
    }
    message.success(en ? `Added ${memberDays} days for ${memberTarget}` : `已为 ${memberTarget} 添加 ${memberDays} 天会员`)
    setMemberTarget(null)
  }

  const textMatch = (row: PaymentLink) => {
    if (!keyword.trim()) return true
    if (row.audience === 'open') return [row.id, row.eventName].join(' ').toLowerCase().includes(keyword.trim().toLowerCase())
    return [row.id, row.userId].join(' ').toLowerCase().includes(keyword.trim().toLowerCase())
  }
  const sceneMatch = (row: PaymentLink, value: Scene) => {
    const orders = txnsOf(row.id)
    const stage = currentStage(row, orders)
    if (value === 'first') return row.kind === 'deposit' && stage === 'DEPOSIT_FIRST'
    if (value === 'balance') return row.kind === 'deposit' && (stage === 'DEPOSIT_BALANCE')
    if (value === 'full_wait') return row.kind === 'full' && row.audience !== 'open' && stage === 'FULL'
    const settled = !!paidOf(orders, row.kind === 'full' ? 'FULL' : 'DEPOSIT_BALANCE')
    if (value === 'done') return row.audience !== 'open' && settled
    if (value === 'collecting') return !isExpired(row)
    if (value === 'expired') return isExpired(row) && (row.audience === 'open' || !settled)
    return true
  }
  const baseRows = links.filter((row) => {
    if ((row.audience === 'open') !== openPage) return false
    if (!textMatch(row)) return false
    if (lineFilter && row.line !== lineFilter) return false
    if (channelFilter && row.channelId !== channelFilter) return false
    return true
  })
  const rows = baseRows.filter((row) => sceneMatch(row, scene))
  const sceneOptions: { value: Scene; label: string }[] = openPage ? [
    { value: 'all', label: en ? 'All' : '全部' },
    { value: 'collecting', label: en ? 'Collecting' : '收款中' },
    { value: 'expired', label: en ? 'Expired' : '已过期' },
  ] : [
    { value: 'all', label: en ? 'All' : '全部' },
    { value: 'first', label: en ? 'First payment due' : '待付首款' },
    { value: 'balance', label: en ? 'Balance due' : '待付尾款' },
    { value: 'full_wait', label: en ? 'Full payment due' : '全款待支付' },
    { value: 'done', label: en ? 'Completed' : '已完成' },
    { value: 'expired', label: en ? 'Expired' : '已过期' },
  ]
  const scopedLinks = links.filter((row) => (row.audience === 'open') === openPage)
  const lineOptions = Array.from(new Set(scopedLinks.map((row) => row.line).filter(Boolean)))
    .map((value) => ({ value, label: enValue(value) }))
  const channelOptions = Array.from(
    new Map(scopedLinks.filter((row) => !lineFilter || row.line === lineFilter).filter((row) => row.channelId).map((row) => [row.channelId, row.channelName])).entries(),
  ).map(([value, label]) => ({ value, label }))
  const openCreate = (kind: 'full' | 'deposit', who: 'user' | 'open' = 'user') => {
    setEditingId(null)
    resetCustomer()
    setAudience(kind === 'full' ? who : 'user')
    setValidUntil(defaultValidity(kind))
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
              {openPage
                ? (editingId ? (en ? 'Edit open payment link' : '编辑通用支付链接') : (en ? 'New open payment link' : '新建通用支付链接'))
                : (editingId ? (en ? 'Edit personal payment link' : '编辑专属支付链接') : (en ? 'New personal payment link' : '新建专属支付链接'))}
            </Typography.Title>
            <Typography.Text type="secondary">
              {openPage
                ? (en ? 'For expo and printed QR codes. Anyone who scans logs in and pays; each payment is its own order.' : '用于展会 / 物料二维码。任何人扫码登录后付款，每笔付款各生成一张订单。')
                : (en ? 'Tied to one User ID. Pay in full, or split into a first payment and a balance.' : '绑定一个 User ID。可以一次付清，也可以拆成首款 + 尾款两笔。')}
            </Typography.Text>
          </div>
        </div>
        {formCard(tab)}
      </div>
    )
  }

  const detailRow = focusLinkId ? links.find((row) => row.id === focusLinkId && (row.audience === 'open') === openPage) : undefined

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
      {detailRow ? detailPage(detailRow) : (
      <>
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
                  <span className="pl-scene__count">{count}</span>
                </span>
              ),
            }
          })}
        />
        {openPage
          ? ccManager && <Button type="primary" icon={<QrcodeOutlined />} onClick={() => openCreate('full', 'open')}>{en ? 'New open payment link' : '新建通用支付链接'}</Button>
          : <Button type="primary" icon={<LinkOutlined />} onClick={() => openCreate('full')}>{en ? 'New personal payment link' : '新建专属支付链接'}</Button>}
      </div>
      <Space wrap>
        <Input.Search allowClear placeholder={openPage ? (en ? 'Event / link ID' : '活动名 / 链接号') : (en ? 'Link ID / User ID' : '链接号 / User ID')} value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ width: 260 }} />
        <Select allowClear placeholder={en ? 'Business line' : '业务线'} value={lineFilter} style={{ width: 150 }} options={lineOptions}
          onChange={(value) => { setLineFilter(value); setChannelFilter(undefined) }}
        />
        <Select allowClear showSearch optionFilterProp="label" placeholder={en ? 'Channel' : '渠道'} value={channelFilter} onChange={setChannelFilter} style={{ width: 200 }} options={channelOptions} />
      </Space>
      <Alert
        type="info"
        showIcon
        message={openPage
          ? (en
            ? `Each row is one expo or printed QR code. Anyone who scans logs in and pays; each visit to the payment page after login is one order, like the landing page. Click a link to see all its orders. ${ccManager ? 'As a CC manager you can create and edit.' : 'As a CC you can view, copy links and QR codes; ask your CC manager to create or edit.'}`
            : `每一行是一个展会 / 物料二维码。任何人扫码登录后都能付款，和落地页一样登录后每次进入三方支付页生成一张订单；点击链接进入详情查看全部订单。${ccManager ? '当前是 CC 主管：可以新建和编辑。' : '当前是普通 CC：只能查看、复制链接和二维码；新建、编辑需要 CC 主管。'}`)
          : en
          ? `Each row is one personal payment link. Full: like the landing page, each payment is one order (a failed attempt cancels its order). Deposit: one order holding two transactions (first payment, balance). Links that offer manual bank transfer get an order when the link is created, for the manager to confirm the transfer. Valid-until controls when a link stops taking payments; deposits must be fully paid by then. ${ccManager ? 'As a CC manager you can confirm manual bank transfers.' : 'Ask your CC manager to confirm manual bank transfers.'}`
          : `每一行是一条专属支付链接。全款：和落地页一样每次支付一张订单，失败的那张取消；定金：一张订单下两笔交易（首款、尾款）。挂了手动银行转账的链接在创建时就生成一张订单，供主管确认转账。有效期决定链接什么时候停止收款，定金的首款和尾款都要在有效期内付完。${ccManager ? '当前是 CC 主管：可以确认手动银行转账。' : '确认手动银行转账需要 CC 主管操作。'}`}
      />
      <Table
        className="pl-table"
        rowKey="id"
        size="small"
        columns={openPage ? columns.filter((column) => column.key !== 'kind') : columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: openPage ? 1130 : 1202 }}
        rowClassName={(row: PaymentLink) => (linkStatus(row).label === (en ? 'Expired' : '已过期') ? 'pl-row--void' : '')}
        locale={{ emptyText: openPage ? (en ? 'No open payment links yet' : '还没有通用支付链接') : (en ? 'No personal payment links yet' : '还没有专属支付链接') }}
      />
      </>
      )}
      <Drawer
        title={`${historyOf?.id || ''} · ${en ? 'Operation history' : '操作记录'}`}
        open={!!historyOf}
        onClose={() => setHistoryOf(null)}
        width={720}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={en
            ? 'Creating, editing, stopping or resuming payments, confirming transfers and adding membership are logged with the operator.'
            : '新建、编辑、停止 / 恢复收款、确认转账、添加会员都会记录操作人和变更内容。'}
        />
        <Table
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: <Empty description={en ? 'No history yet' : '暂无操作记录'} /> }}
          dataSource={[...((links.find((item) => item.id === historyOf?.id) || historyOf)?.history || [])].reverse()}
          columns={[
            { title: en ? 'Time' : '操作时间', dataIndex: 'at', width: 170, render: (value: string) => value.slice(0, 16) },
            { title: en ? 'Operator' : '操作人', dataIndex: 'actor', width: 170, render: (value: string) => (
              <div className="pl-two-line"><span>{actorName(value)}</span><Typography.Text type="secondary">{value}</Typography.Text></div>
            ) },
            { title: en ? 'Action' : '操作', dataIndex: 'action', width: 120 },
            { title: en ? 'Detail' : '变更内容', dataIndex: 'detail' },
          ] as { title: string; dataIndex: keyof LinkHistoryEntry; width?: number; render?: (value: string) => React.ReactNode }[]}
        />
      </Drawer>
      <Modal
        title={en ? 'Confirm manual bank transfer' : '确认手动银行转账'}
        open={!!confirmTarget}
        onCancel={() => setConfirmTarget(null)}
        onOk={() => { if (!confirmTarget) return; const { link, skuId } = confirmTarget; setConfirmTarget(null); confirmTransferSafely(link, skuId) }}
        okText={en ? 'Confirm' : '确认到账'}
        cancelText={en ? 'Cancel' : '取消'}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary">
          {en ? 'This link offers several SKUs and the customer has not picked one. Choose the SKU the transfer pays for; the order takes its price.' : '这条链接有多个 SKU，用户还没选。请选这笔转账买的 SKU，订单按它的价格记应付。'}
        </Typography.Paragraph>
        <Select
          style={{ width: '100%' }}
          value={confirmTarget?.skuId}
          onChange={(skuId) => setConfirmTarget((current) => (current ? { ...current, skuId } : current))}
          options={(confirmTarget?.link.offers || []).map((item) => ({ value: item.skuId, label: `${item.skuName} · ${formatMoney(item.payable, item.currency)}` }))}
        />
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
