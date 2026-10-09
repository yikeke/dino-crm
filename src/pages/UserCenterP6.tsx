import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
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
import { PlusCircleOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { setState, useStore } from '../store'
import type { CoursePackage, Student } from '../types'
import { useI18n } from '../i18n'
import { usePerm } from '../perm'
import { resolveUserStatus } from '../lessons'
import { inUserCenter } from '../funnel'
import { maskPhone } from '../export'
import LocalTime from '../components/LocalTime'

const { Text } = Typography

type MembershipLevel = 'pro' | 'max'

function packageLevel(pkg?: CoursePackage): MembershipLevel | undefined {
  if (!pkg) return undefined
  const value = `${pkg.id} ${pkg.name}`.toLowerCase()
  if (value.includes('max')) return 'max'
  if (value.includes('pro')) return 'pro'
  return undefined
}

function membershipOf(student?: Student) {
  if (!student) return { level: undefined, active: false, expired: false, days: 0 }
  const level =
    student.membershipLevel ??
    (student.status === '付费' || student.status === '付费逾期' ? 'pro' : undefined)
  if (!level || !student.expireTime) return { level, active: false, expired: false, days: 0 }
  const minutes = dayjs(student.expireTime).diff(dayjs(), 'minute')
  return {
    level,
    active: minutes > 0,
    expired: minutes <= 0,
    days: Math.max(1, Math.ceil(Math.abs(minutes) / (24 * 60))),
  }
}

function skuDays(pkg?: CoursePackage) {
  if (!pkg) return 30
  if (pkg.validDays && pkg.validDays > 0) return pkg.validDays
  const n = pkg.name
  if (n.includes('年')) return 365
  if (n.includes('半年')) return 180
  if (n.includes('季')) return 90
  return 30
}

function grantExpiry(student: Student, days: number) {
  const now = dayjs()
  const current = student.expireTime ? dayjs(student.expireTime) : now
  const base = current.isAfter(now) ? current : now
  return base.add(days, 'day').format('YYYY-MM-DD HH:mm:ss')
}

export default function UserCenterP6() {
  const { t } = useI18n()
  const students = useStore((s) => s.students)
  const packages = useStore((s) => s.packages)
  const lessons = useStore((s) => s.lessons ?? [])
  const { can, actor } = usePerm()
  const canEdit = can('usersV2_edit') === 'operate'
  const canViewPhone = can('usersV2_phone_view') !== 'none'
  const [tab, setTab] = useState('bank')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [financeFilter, setFinanceFilter] = useState<'pending' | 'confirmed' | undefined>()
  const [openFilter, setOpenFilter] = useState<'pending' | 'opened' | undefined>()
  const [grantFilter, setGrantFilter] = useState<'days' | 'sku' | undefined>()
  const [adding, setAdding] = useState<Student | null>(null)
  const [form] = Form.useForm()
  const grantMode = Form.useWatch('mode', form)
  const currentMembership = membershipOf(adding ?? undefined)

  const skuOptions = useMemo(() => {
    const line = adding?.businessLine
    const listed = packages.filter((p) => p.status === '上架')
    const preferred = line ? listed.filter((p) => p.businessLine === line) : listed
    const source = preferred.length ? preferred : listed
    return source.map((p) => {
      const level = packageLevel(p)
      const disabled =
        !!currentMembership.active &&
        !!currentMembership.level &&
        !!level &&
        level !== currentMembership.level
      return {
        label: `${p.id} · ${p.name}（${p.currency} ${p.price.toLocaleString()} · ${skuDays(p)}天）${disabled ? ' · 暂不支持升降级' : ''}`,
        value: p.id,
        disabled,
      }
    })
  }, [packages, adding])

  const bankUsers = useMemo(
    () => students.filter((s) => s.bankTransfer),
    [students],
  )

  const allUsers = useMemo(
    () =>
      students.filter((s) => {
        if (!inUserCenter(s, lessons)) return false
        const kw = keyword.trim().toLowerCase()
        const matchKw =
          !kw ||
          s.studentId.toLowerCase().includes(kw) ||
          (s.localName ?? s.name).toLowerCase().includes(kw) ||
          s.account.toLowerCase().includes(kw)
        const membership = membershipOf(s)
        const membershipStatus = membership.level
          ? `${membership.level}_${membership.active ? 'active' : 'expired'}`
          : resolveUserStatus(s, lessons)
        const matchStatus = !statusFilter || membershipStatus === statusFilter
        return matchKw && matchStatus
      }),
    [students, lessons, keyword, statusFilter],
  )

  const bankFiltered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return bankUsers.filter((s) => {
      const bt = s.bankTransfer
      if (!bt) return false
      const matchKw =
        !kw ||
        s.studentId.toLowerCase().includes(kw) ||
        (s.localName ?? s.name).toLowerCase().includes(kw) ||
        s.account.toLowerCase().includes(kw) ||
        (bt.remark ?? '').toLowerCase().includes(kw)
      const matchFinance =
        !financeFilter || (financeFilter === 'confirmed' ? bt.financeConfirmed : !bt.financeConfirmed)
      const matchOpen = !openFilter || (openFilter === 'opened' ? bt.opened : !bt.opened)
      const matchGrant =
        !grantFilter || (bt.opened && bt.grantMode === grantFilter)
      return matchKw && matchFinance && matchOpen && matchGrant
    })
  }, [bankUsers, keyword, financeFilter, openFilter, grantFilter])

  const rows = tab === 'bank' ? bankFiltered : allUsers

  const openAdd = (s: Student) => {
    setAdding(s)
    form.resetFields()
    form.setFieldsValue({ mode: 'sku', days: 30 })
  }

  const submitGrant = async () => {
    if (!adding) return
    const bt = adding.bankTransfer
    if (bt && !bt.financeConfirmed) {
      message.warning(t('user.addMembership.needFinance'))
      return
    }
    if (bt?.opened) {
      message.warning(t('user.addMembership.alreadyOpen'))
      return
    }
    const v = await form.validateFields()
    const pkg = v.mode === 'sku' ? packages.find((p) => p.id === v.skuId) : undefined
    const membership = membershipOf(adding)
    const targetLevel =
      v.mode === 'sku'
        ? packageLevel(pkg)
        : membership.active && membership.level
          ? membership.level
          : 'pro'
    if (membership.active && membership.level && targetLevel && targetLevel !== membership.level) {
      message.warning(
        t('user.addMembership.sameTierOnly', { level: membership.level === 'max' ? 'Max' : 'Pro' }),
      )
      return
    }
    const days = v.mode === 'sku' ? skuDays(pkg) : v.days
    if (typeof days !== 'number' || days <= 0) return
    const expireTime = grantExpiry(adding, days)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    setState((prev) => ({
      ...prev,
      students: prev.students.map((student) => {
        if (student.studentId !== adding.studentId) return student
        const nextBt = student.bankTransfer
          ? {
              ...student.bankTransfer,
              opened: true,
              openedAt: now,
              openedBy: actor,
              grantMode: v.mode as 'days' | 'sku',
              grantDays: days,
              skuId: pkg?.id,
              skuName: pkg?.name,
            }
          : student.bankTransfer
        return {
          ...student,
          membershipLevel: targetLevel,
          expireTime,
          lastModifier: actor,
          status: '付费' as const,
          paymentStatusStr: '已付费',
          bankTransfer: nextBt,
        }
      }),
    }))
    message.success(t('user.addMembership'))
    setAdding(null)
  }

  const bankBlocked = !!adding?.bankTransfer && (!adding.bankTransfer.financeConfirmed || adding.bankTransfer.opened)

  const renderMembership = (student: Student) => {
    const membership = membershipOf(student)
    if (!membership.level) return <Tag>{t('user.membership.none')}</Tag>
    const level = membership.level === 'max' ? 'Max' : 'Pro'
    const label = membership.active
      ? level
      : t(membership.level === 'max' ? 'user.membership.maxExpired' : 'user.membership.proExpired')
    return <Tag color={membership.active ? (membership.level === 'max' ? 'purple' : 'blue') : 'default'}>{label}</Tag>
  }

  const renderValidity = (student: Student) => {
    const membership = membershipOf(student)
    if (!membership.level || !student.expireTime) return <Text type="secondary">—</Text>
    return (
      <Space direction="vertical" size={0}>
        <Text type={membership.active ? undefined : 'secondary'}>
          {t(membership.active ? 'user.membership.remainingDays' : 'user.membership.expiredDays', {
            days: membership.days,
          })}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <LocalTime time={student.expireTime} country={student.country || student.businessLine} />
        </Text>
      </Space>
    )
  }

  const allColumns: ColumnsType<Student> = [
    {
      title: t('user.col.id'),
      dataIndex: 'studentId',
      width: 190,
      fixed: 'left',
      render: (v: string) => <Link to={`/users-v6/${v}`}>{v}</Link>,
    },
    { title: t('user.col.name'), dataIndex: 'localName', width: 140, render: (_, r) => r.localName || r.name },
    {
      title: t('user.col.phone'),
      dataIndex: 'phone',
      width: 150,
      render: (v?: string) => (canViewPhone ? v || '—' : maskPhone(v)),
    },
    { title: t('user.col.line'), dataIndex: 'businessLine', width: 90 },
    {
      title: t('user.col.status'),
      dataIndex: 'status',
      width: 140,
      render: (_, r) => renderMembership(r),
    },
    {
      title: t('user.membership.validity'),
      dataIndex: 'expireTime',
      width: 190,
      render: (_, r) => renderValidity(r),
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, r) =>
        canEdit ? (
          <Button type="link" icon={<PlusCircleOutlined />} onClick={() => openAdd(r)}>
            {t('user.addMembership')}
          </Button>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ]

  const bankColumns: ColumnsType<Student> = [
    {
      title: t('user.col.id'),
      dataIndex: 'studentId',
      width: 190,
      fixed: 'left',
      render: (v: string) => <Link to={`/users-v6/${v}`}>{v}</Link>,
    },
    { title: t('user.col.name'), dataIndex: 'localName', width: 140, render: (_, r) => r.localName || r.name },
    {
      title: t('user.col.phone'),
      dataIndex: 'phone',
      width: 150,
      render: (v?: string) => (canViewPhone ? v || '—' : maskPhone(v)),
    },
    {
      title: t('user.membership.level'),
      width: 120,
      render: (_, r) => renderMembership(r),
    },
    {
      title: t('user.membership.validity'),
      width: 190,
      render: (_, r) => renderValidity(r),
    },
    { title: t('user.bank.remark'), width: 120, render: (_, r) => <Text code>{r.bankTransfer?.remark}</Text> },
    {
      title: t('user.bank.amount'),
      width: 130,
      render: (_, r) => (r.bankTransfer ? `₫ ${r.bankTransfer.amountVnd.toLocaleString()}` : '—'),
    },
    {
      title: t('user.bank.finance'),
      width: 120,
      render: (_, r) =>
        r.bankTransfer?.financeConfirmed ? (
          <Tag color="green">{t('user.bank.financeOk')}</Tag>
        ) : (
          <Tag>{t('user.bank.waitingFinance')}</Tag>
        ),
    },
    {
      title: t('user.bank.openStatus'),
      width: 140,
      render: (_, r) =>
        r.bankTransfer?.opened ? (
          <Tag color="blue">{t('user.bank.opened')}</Tag>
        ) : (
          <Tag color="gold">{t('user.bank.pendingOpen')}</Tag>
        ),
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 130,
      fixed: 'right',
      render: (_, r) => {
        const bt = r.bankTransfer
        const disabled = !canEdit || !bt?.financeConfirmed || bt.opened
        return (
          <Button type="link" icon={<PlusCircleOutlined />} disabled={disabled} onClick={() => openAdd(r)}>
            {t('user.addMembership')}
          </Button>
        )
      },
    },
  ]

  return (
    <Card className="page-card" bordered={false} title={<span className="section-title">{t('app.nav.usersV6')}</span>}>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'all', label: t('user.tab.all') },
          { key: 'bank', label: `${t('user.tab.bank')} (${bankUsers.length})` },
        ]}
      />
      {tab === 'bank' && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} message={t('user.bank.intro')} />
      )}
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('user.searchPlaceholder')}
          style={{ width: 280 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        {tab === 'bank' && (
          <>
            <Select
              allowClear
              placeholder={t('user.bank.finance')}
              style={{ width: 160 }}
              value={financeFilter}
              onChange={setFinanceFilter}
              options={[
                { label: t('user.bank.waitingFinanceShort'), value: 'pending' },
                { label: t('user.bank.financeOkShort'), value: 'confirmed' },
              ]}
            />
            <Select
              allowClear
              placeholder={t('user.bank.openStatus')}
              style={{ width: 160 }}
              value={openFilter}
              onChange={setOpenFilter}
              options={[
                { label: t('user.bank.pendingOpen'), value: 'pending' },
                { label: t('user.bank.opened'), value: 'opened' },
              ]}
            />
            <Select
              allowClear
              placeholder={t('user.addMembership.mode')}
              style={{ width: 160 }}
              value={grantFilter}
              onChange={setGrantFilter}
              options={[
                { label: t('user.addMembership.mode.days'), value: 'days' },
                { label: t('user.addMembership.mode.sku'), value: 'sku' },
              ]}
            />
          </>
        )}
        {tab === 'all' && (
          <Select
            allowClear
            placeholder={t('user.filterStatus')}
            style={{ width: 150 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: t('enum.status.未付费-未体验'), value: '未付费-未体验' },
              { label: t('enum.status.未付费-体验中'), value: '未付费-体验中' },
              { label: t('enum.status.未付费-已体验'), value: '未付费-已体验' },
              { label: t('user.membership.pro'), value: 'pro_active' },
              { label: t('user.membership.proExpired'), value: 'pro_expired' },
              { label: t('user.membership.max'), value: 'max_active' },
              { label: t('user.membership.maxExpired'), value: 'max_expired' },
            ]}
          />
        )}
      </Space>
      <Table
        rowKey="studentId"
        columns={tab === 'bank' ? bankColumns : allColumns}
        dataSource={rows}
        scroll={{ x: tab === 'bank' ? 1200 : 1100 }}
        pagination={{ showTotal: (n) => t('common.total', { n }), showSizeChanger: true }}
      />

      <Modal
        open={!!adding}
        title={`${t('user.addMembership.title')} · ${adding?.studentId ?? ''}`}
        onCancel={() => setAdding(null)}
        onOk={submitGrant}
        okButtonProps={{ disabled: bankBlocked }}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        {adding?.bankTransfer && !adding.bankTransfer.financeConfirmed && (
          <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={t('user.addMembership.needFinance')} />
        )}
        {adding?.bankTransfer?.opened && (
          <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={t('user.addMembership.alreadyOpen')} />
        )}
        {adding && currentMembership.level && (
          <Alert
            type={currentMembership.active ? 'info' : 'warning'}
            showIcon
            style={{ marginBottom: 12 }}
            message={t('user.addMembership.currentMembership', {
              level: currentMembership.level === 'max' ? 'Max' : 'Pro',
              expiry: adding.expireTime ?? '—',
            })}
            description={
              currentMembership.active
                ? t('user.addMembership.sameTierOnly', {
                    level: currentMembership.level === 'max' ? 'Max' : 'Pro',
                  })
                : undefined
            }
          />
        )}
        <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 8 }} initialValues={{ mode: 'sku', days: 30 }}>
          <Form.Item name="mode" label={t('user.addMembership.mode')} rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value="days">{t('user.addMembership.mode.days')}</Radio.Button>
              <Radio.Button value="sku">{t('user.addMembership.mode.sku')}</Radio.Button>
            </Radio.Group>
          </Form.Item>
          {grantMode !== 'sku' && (
            <Form.Item
              name="days"
              label={t('user.addMembership.days')}
              extra={t('user.addMembership.daysHint')}
              rules={[{ required: true, message: t('user.addMembership.days') }]}
            >
              <InputNumber min={1} max={1095} addonAfter="天" style={{ width: '100%' }} />
            </Form.Item>
          )}
          {grantMode === 'sku' && (
            <Form.Item
              name="skuId"
              label={t('user.addMembership.sku')}
              extra={t('user.addMembership.skuHint')}
              rules={[{ required: true, message: t('user.addMembership.sku') }]}
            >
              <Select showSearch optionFilterProp="label" options={skuOptions} placeholder={t('common.pleaseSelect')} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  )
}
