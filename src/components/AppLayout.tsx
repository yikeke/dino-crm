import { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Modal, Typography, Button, Tag } from 'antd'
import {
  ApartmentOutlined,
  TeamOutlined,
  ProfileOutlined,
  AppstoreOutlined,
  TagsOutlined,
  LinkOutlined,
  SafetyOutlined,
  LogoutOutlined,
  DownOutlined,
  RedoOutlined,
  GlobalOutlined,
  UserSwitchOutlined,
  ShopOutlined,
  SolutionOutlined,
  HistoryOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  SkinOutlined,
  CreditCardOutlined,
  QrcodeOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logout, useSession } from '../auth'
import { resetState, useStore } from '../store'
import { LOGO } from '../logo'
import { LANGS, useI18n } from '../i18n'
import { setIdentity, useCurrentAccount, usePerm } from '../perm'
import type { ModuleKey } from '../types'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const NAV_MODULE: Record<string, ModuleKey> = {
  '/channels': 'channels',
  '/landing': 'landing',
  '/management-dashboard': 'salesV3',
  '/app-ab-test': 'appABTest',
  '/users': 'users',
  '/sales': 'sales',
  '/sales-v3': 'salesV3',
  '/marketing-center/channels': 'marketingV2_channels',
  '/marketing-center/skus': 'marketingV2_skus',
  '/marketing-center/offers': 'marketingV2_offers',
  '/marketing-center/landing': 'marketingV2_landing',
  '/marketing-center-v5/channels': 'marketingV2_channels',
  '/marketing-center-v5/skus': 'marketingV2_skus',
  '/marketing-center-v5/offers': 'marketingV2_offers',
  '/marketing-center-v5/landing': 'marketingV2_landing',
  '/marketing-center-v5/skins': 'marketingV2_landing',
  '/marketing-backup': 'marketing',
  '/users-v2': 'usersV2',
  '/users-v6': 'usersV2',
  '/orders': 'orders',
  '/orders-v3': 'ordersV3',
  '/packages': 'packages',
  '/coupons': 'coupons',
  '/system': 'system',
}

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>(['marketing-v5'])
  // 取一级路径，保证子路由（如 /users-v2/:id 详情页）也能高亮菜单并显示标题
  const basePath = `/${location.pathname.split('/')[1] ?? ''}`
  const selectedPath = location.pathname.startsWith('/marketing-center') || location.pathname.startsWith('/marketing-backup/') ? location.pathname : basePath
  const session = useSession()
  const { t, lang, setLang } = useI18n()
  const { can } = usePerm()
  const { account, role } = useCurrentAccount()
  const accounts = useStore((s) => s.accounts)
  const roles = useStore((s) => s.roles)
  // Create Payment Link demo only switches between the two CC roles.
  const onPaymentLinks = location.pathname.startsWith('/marketing-center-v5/payment-links') || location.pathname.startsWith('/marketing-center-v5/open-links')
  const ccRoles = [
    { email: 'sales.lead@dinoai.ai', label: lang === 'en' ? 'CC manager' : 'CC 主管' },
    { email: 'sales.kr@dinoai.ai', label: lang === 'en' ? 'CC' : '普通 CC' },
  ].flatMap((item) => {
    const found = accounts.find((a) => a.email === item.email)
    return found ? [{ ...item, account: found }] : []
  })
  const ccCurrent = ccRoles.find((item) => item.account.id === account?.id) || (role?.id === 'role_support' ? ccRoles[1] : ccRoles[0])

  const phaseLabel = (text: string, phaseText: string, color: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {text}
      <Tag color={color} style={{ margin: 0, lineHeight: '16px', fontSize: 11, padding: '0 5px' }}>
        {phaseText}
      </Tag>
    </span>
  )
  const phase2Label = (text: string) => phaseLabel(text, t('app.phase2'), 'orange')
  const phase3Label = (text: string) => phaseLabel(text, t('app.phase3'), 'purple')
  const phase4Label = (text: string) => phaseLabel(text, '四期', 'cyan')
  const dashboardPhaseLabel = (text: string) => phaseLabel(text, lang === 'en' ? 'Phase 4.3' : '4.3期', 'green')

  const appABPhaseLabel = (text: string) => phaseLabel(text, lang === 'en' ? 'Phase 5' : '五期', 'geekblue')

  const visible = (key: string) => can(NAV_MODULE[key]) !== 'none'

  // 一期功能
  const topNav = [
    { key: '/users', icon: <TeamOutlined />, label: t('app.nav.users') },
    { key: '/orders', icon: <ProfileOutlined />, label: t('app.nav.orders') },
  ].filter((n) => visible(n.key))

  const ordersV3Nav = [
    { key: '/orders-v3', icon: <ProfileOutlined />, label: phase3Label(t('app.nav.orders')) },
  ].filter((n) => visible(n.key))

  // 旧营销中心：仅作为备份留存
  const marketingBackupChildren = [
    { key: '/channels', icon: <ApartmentOutlined />, label: t('app.nav.channels') },
    { key: '/landing', icon: <LinkOutlined />, label: t('app.nav.landing') },
    { key: '/packages', icon: <AppstoreOutlined />, label: t('app.nav.packages') },
    { key: '/coupons', icon: <TagsOutlined />, label: t('app.nav.coupons') },
  ].filter((n) => visible(n.key))

  const marketingV2Children = [
    { key: '/marketing-center/channels', icon: <ApartmentOutlined />, label: lang === 'en' ? 'Channel Management' : '渠道管理' },
    { key: '/marketing-center/skus', icon: <AppstoreOutlined />, label: lang === 'en' ? 'SKU Catalog' : 'SKU 管理' },
    { key: '/marketing-center/offers', icon: <TagsOutlined />, label: lang === 'en' ? 'Channel SKU Price Plans' : '渠道 SKU 价格方案' },
    { key: '/marketing-center/landing', icon: <LinkOutlined />, label: lang === 'en' ? 'Landing Page Management' : '落地页管理' },
  ].filter((n) => visible(n.key))

  const marketingV5Children = [
    { key: '/marketing-center-v5/channels', icon: <ApartmentOutlined />, label: lang === 'en' ? 'Channel Management' : '渠道管理' },
    { key: '/marketing-center-v5/skus', icon: <AppstoreOutlined />, label: lang === 'en' ? 'SKU Catalog' : 'SKU 管理' },
    { key: '/marketing-center-v5/offers', icon: <TagsOutlined />, label: lang === 'en' ? 'Channel SKU Price Plans' : '渠道 SKU 价格方案' },
    { key: '/marketing-center-v5/landing', icon: <LinkOutlined />, label: lang === 'en' ? 'Landing Page Management' : '落地页管理' },
    { key: '/marketing-center-v5/skins', icon: <SkinOutlined />, label: lang === 'en' ? 'Landing page skin management' : '落地页皮肤管理' },
    ...((can('salesV3') !== 'none' || can('marketingV2_landing') !== 'none')
      ? [
          { key: '/marketing-center-v5/payment-links', icon: <CreditCardOutlined />, label: 'Create Payment Link' },
          { key: '/marketing-center-v5/open-links', icon: <QrcodeOutlined />, label: lang === 'en' ? 'Open Payment Link' : '通用支付链接' },
        ]
      : []),
  ].filter((n) => n.key === '/marketing-center-v5/payment-links' || n.key === '/marketing-center-v5/open-links' || visible(n.key))

  // 销售中心（二期）
  const salesNav = [
    { key: '/sales', icon: <SolutionOutlined />, label: phase2Label(t('app.nav.sales')) }
  ].filter((n) =>
    visible(n.key),
  )
  const salesV3Nav = [
    { key: '/sales-v3', icon: <SolutionOutlined />, label: phase3Label(t('app.nav.sales')) },
  ].filter((n) => visible(n.key))
  // 用户中心（三期）
  const usersV2Nav = [
    { key: '/users-v2', icon: <TeamOutlined />, label: phase3Label(t('app.nav.users')) },
  ].filter((n) => visible(n.key))
  const usersV6Nav = [
    { key: '/users-v6', icon: <TeamOutlined />, label: phaseLabel(t('app.nav.users'), t('app.phase6'), 'magenta') },
  ].filter((n) => visible(n.key))
  // 系统配置（二期）
  const systemNav = [
    { key: '/system', icon: <SafetyOutlined />, label: phase2Label(t('app.nav.system')) },
  ].filter((n) => visible(n.key))

  const placeholder = (label: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {label}
      <Tag color="default" style={{ margin: 0, lineHeight: '16px', fontSize: 11 }}>{lang === 'en' ? 'Placeholder' : '占位'}</Tag>
    </span>
  )

  const NAV = [
    { key: '/users', icon: <TeamOutlined />, label: lang === 'en' ? 'User Center' : '用户中心' },
    { key: '/sales-v3', icon: <SolutionOutlined />, label: lang === 'en' ? 'Sales Center' : '销售中心' },
    { key: '/orders', icon: <ProfileOutlined />, label: lang === 'en' ? 'Order Center' : '订单中心' },
    {
      key: 'marketing-v5',
      icon: <ShopOutlined />,
      label: lang === 'en' ? 'Marketing Center' : '营销中心',
      children: [
        { key: '/marketing-center-v5/channels', icon: <ApartmentOutlined />, label: lang === 'en' ? 'Channel Management' : '渠道管理' },
        { key: '/marketing-center-v5/skus', icon: <AppstoreOutlined />, label: lang === 'en' ? 'SKU Catalog' : 'SKU 管理' },
        { key: '/marketing-center-v5/offers', icon: <TagsOutlined />, label: lang === 'en' ? 'Channel SKU Price Plans' : '渠道 SKU 价格方案' },
        { key: 'landing-placeholder', icon: <LinkOutlined />, label: placeholder(lang === 'en' ? 'Landing Page Management' : '落地页管理'), disabled: true },
        { key: 'skin-placeholder', icon: <SkinOutlined />, label: placeholder(lang === 'en' ? 'Landing page skin management' : '落地页皮肤管理'), disabled: true },
        { key: '/marketing-center-v5/payment-links', icon: <CreditCardOutlined />, label: 'Create Payment Link' },
        { key: '/marketing-center-v5/open-links', icon: <QrcodeOutlined />, label: lang === 'en' ? 'Open Payment Link' : '通用支付链接' },
      ],
    },
  ]

  const TITLES: Record<string, string> = {
    '/app-ab-test': lang === 'en' ? 'APP A/B test configuration' : 'APP A/B test配置',
    '/management-dashboard': lang === 'en' ? 'Management Dashboard' : '管理看板',
    '/channels': t('app.nav.channels'),
    '/landing': t('app.nav.landing'),
    '/users': t('app.nav.users'),
    '/sales': t('app.nav.sales'),
    '/sales-v3': t('app.nav.sales'),
    '/marketing-center/channels': lang === 'en' ? 'Marketing Center' : '营销中心',
    '/marketing-center/skus': lang === 'en' ? 'Marketing Center' : '营销中心',
    '/marketing-center/offers': lang === 'en' ? 'Marketing Center' : '营销中心',
    '/marketing-center/landing': lang === 'en' ? 'Marketing Center' : '营销中心',
    '/marketing-center-v5/channels': lang === 'en' ? 'Marketing Center' : '营销中心',
    '/marketing-center-v5/skus': lang === 'en' ? 'Marketing Center' : '营销中心',
    '/marketing-center-v5/offers': lang === 'en' ? 'Marketing Center' : '营销中心',
    '/marketing-center-v5/landing': lang === 'en' ? 'Marketing Center' : '营销中心',
    '/marketing-center-v5/skins': lang === 'en' ? 'Landing page skin management' : '落地页皮肤管理',
    '/marketing-center-v5/payment-links': 'Create Payment Link',
    '/marketing-center-v5/open-links': lang === 'en' ? 'Open Payment Link' : '通用支付链接',
    '/marketing-backup': lang === 'en' ? 'Marketing Center Backup' : '营销中心备份',
    '/users-v2': t('app.nav.usersV2'),
    '/users-v6': t('app.nav.usersV6'),
    '/orders': t('app.nav.orders'),
    '/orders-v3': t('app.nav.orders'),
    '/packages': t('app.nav.packages'),
    '/coupons': t('app.nav.coupons'),
    '/system': t('app.nav.system'),
  }

  const onLogout = () => {
    Modal.confirm({
      title: t('app.logout.title'),
      content: t('app.logout.content'),
      okText: t('app.logout.ok'),
      cancelText: t('common.cancel'),
      onOk: () => logout(),
    })
  }

  const onReset = () => {
    Modal.confirm({
      title: t('app.reset.title'),
      content: t('app.reset.content'),
      okText: t('app.reset.ok'),
      cancelText: t('common.cancel'),
      onOk: () => resetState(),
    })
  }

  const currentLang = LANGS.find((l) => l.value === lang)

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark" width={252}>
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 18px',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <img src={LOGO} width={26} height={26} alt="logo" />
          {!collapsed && <span>{t('app.brand')}</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedPath]}
          openKeys={openKeys}
          onOpenChange={(keys) => setOpenKeys(keys as string[])}
          items={NAV}
          onClick={({ key }) => {
            if (String(key).startsWith('/')) navigate(key)
          }}
        />
      </Sider>
      <Layout style={{ minWidth: 0 }}>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
          }}
        >
          <Text strong style={{ fontSize: 18 }}>
            {TITLES[selectedPath] ?? TITLES[basePath] ?? t('app.brand')}
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {onPaymentLinks && ccCurrent ? (
              <Dropdown
                menu={{
                  selectedKeys: [ccCurrent.account.id],
                  items: ccRoles.map((item) => ({
                    key: item.account.id,
                    label: (
                      <span>
                        {item.label} · <Text type="secondary">{item.account.name}</Text>
                      </span>
                    ),
                    onClick: () => setIdentity(item.account.id),
                  })),
                }}
              >
                <Button type="text" icon={<UserSwitchOutlined />}>
                  {ccCurrent.account.name}
                  <Tag color={ccCurrent === ccRoles[0] ? 'gold' : 'geekblue'} style={{ marginLeft: 6 }}>
                    {ccCurrent.label}
                  </Tag>
                  <DownOutlined style={{ fontSize: 10 }} />
                </Button>
              </Dropdown>
            ) : (
            <Dropdown
              menu={{
                selectedKeys: [account?.id ?? '__default__'],
                style: { maxHeight: 360, overflow: 'auto' },
                items: [
                  {
                    key: '__default__',
                    label: t('perm.identity.default'),
                    onClick: () => setIdentity(null),
                  },
                  { type: 'divider' as const },
                  ...accounts.map((a) => {
                    const r = roles.find((x) => x.id === a.roleId)
                    return {
                      key: a.id,
                      label: (
                        <span>
                          {a.name} · <Text type="secondary">{r?.name}</Text>
                        </span>
                      ),
                      onClick: () => setIdentity(a.id),
                    }
                  }),
                ],
              }}
            >
              <Button type="text" icon={<UserSwitchOutlined />}>
                {account ? account.name : t('perm.identity.default')}
                {role && (
                  <Tag color="geekblue" style={{ marginLeft: 6 }}>
                    {role.name}
                  </Tag>
                )}
                <DownOutlined style={{ fontSize: 10 }} />
              </Button>
            </Dropdown>
            )}
            <Dropdown
              menu={{
                selectedKeys: [lang],
                items: LANGS.map((l) => ({
                  key: l.value,
                  label: `${l.flag}  ${l.label}`,
                  onClick: () => setLang(l.value),
                })),
              }}
            >
              <Button type="text" icon={<GlobalOutlined />}>
                {currentLang?.flag} {currentLang?.label} <DownOutlined style={{ fontSize: 10 }} />
              </Button>
            </Dropdown>
            <Dropdown
              menu={{
                items: [
                  { key: 'reset', icon: <RedoOutlined />, label: t('app.menu.resetData'), onClick: onReset },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: t('app.menu.logout'), danger: true, onClick: onLogout },
                ],
              }}
            >
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar style={{ background: '#2F6BFF' }}>{session?.email?.[0]?.toUpperCase()}</Avatar>
                <Text>{session?.email}</Text>
                <DownOutlined style={{ fontSize: 12, color: '#999' }} />
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: 20, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
