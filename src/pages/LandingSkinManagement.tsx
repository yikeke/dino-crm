import { useState } from 'react'
import { Alert, Button, Card, Checkbox, Input, Radio, Select, Space, Table, Tag, Typography, message } from 'antd'
import { ArrowLeftOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { usePerm } from '../perm'
import { useI18n } from '../i18n'
import SkinAssetField from '../components/SkinAssetField'
import {
  LANGUAGE_OPTIONS,
  PAGE_TYPE_OPTIONS,
  REGISTER_MODE_OPTIONS,
  THIRD_PARTY_OPTIONS,
  emptySkin,
  loadLandingSkinStore,
  pageTypeLabel,
  previewHref,
  registerModeLabel,
  saveLandingSkinStore,
  writePreviewDraft,
  type LandingSkin,
  type RegisterMode,
  type SkinAsset,
  type ThirdPartyLogin,
} from '../landingSkin'
import './LandingSkinManagement.css'

const { Text } = Typography

function stamp() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export default function LandingSkinManagement() {
  const { lang } = useI18n()
  const en = lang === 'en'
  const { actor, can } = usePerm()
  const canEdit = can('marketingV2_landing_edit') === 'operate' || can('marketingV2_landing') === 'operate'
  const canPreview = can('marketingV2_landing_preview') !== 'none' || can('marketingV2_landing') !== 'none'
  const [store, setStore] = useState(loadLandingSkinStore)
  const [editing, setEditing] = useState<LandingSkin | null>(null)
  const [creating, setCreating] = useState(false)

  const persist = (skins: LandingSkin[]) => {
    const next = { version: 1 as const, skins }
    saveLandingSkinStore(next)
    setStore(next)
  }

  const openPreview = (skin: LandingSkin, useDraft = false) => {
    if (useDraft) writePreviewDraft(skin)
    window.open(previewHref(useDraft ? 'draft' : skin.code || 'draft'), '_blank', 'noopener')
  }

  const save = (publish: boolean) => {
    if (!editing) return
    if (!editing.name.trim()) return message.error(en ? 'Enter a page name' : '请填写活动页名称')
    if (!editing.title.trim()) return message.error(en ? 'Enter a title' : '请填写主标题')
    if (!editing.hero?.src) return message.error(en ? 'Upload a header image' : '请上传默认头图')
    const record: LandingSkin = {
      ...editing,
      code: editing.code.trim() || Math.random().toString(36).slice(2, 5),
      status: publish ? 'published' : editing.status,
      updatedAt: stamp(),
      updatedBy: actor,
    }
    const skins = store.skins.some((s) => s.id === record.id)
      ? store.skins.map((s) => (s.id === record.id ? record : s))
      : [record, ...store.skins]
    persist(skins)
    setEditing(record)
    setCreating(false)
    message.success(en ? 'Skin saved' : '皮肤已保存，落地页可选择该样式')
  }

  const columns: ColumnsType<LandingSkin> = [
    { title: en ? 'Name' : '活动页名称', dataIndex: 'name', render: (v, row) => <><b>{v}</b><div className="skin-code">{row.code}</div></> },
    { title: en ? 'Type' : '落地页类型', dataIndex: 'pageType', render: (v) => pageTypeLabel(v, en) },
    { title: en ? 'Language' : '语言', dataIndex: 'language', width: 90, render: (v) => LANGUAGE_OPTIONS.find((x) => x.value === v)?.label ?? v },
    { title: en ? 'Register' : '注册方式', dataIndex: 'registerMode', render: (v: RegisterMode) => registerModeLabel(v, en) },
    { title: en ? 'Status' : '状态', dataIndex: 'status', width: 90, render: (v) => <Tag color={v === 'published' ? 'green' : 'default'}>{v === 'published' ? (en ? 'Published' : '已发布') : (en ? 'Draft' : '草稿')}</Tag> },
    { title: en ? 'Updated' : '更新时间', dataIndex: 'updatedAt', width: 170 },
    {
      title: en ? 'Actions' : '操作',
      key: 'op',
      width: 180,
      render: (_, row) => (
        <Space>
          {canPreview ? <Button type="link" onClick={() => openPreview(row)}>{en ? 'Preview' : '预览'}</Button> : null}
          {canEdit ? <Button type="link" onClick={() => { setCreating(false); setEditing({ ...row }) }}>{en ? 'Edit' : '编辑'}</Button> : null}
        </Space>
      ),
    },
  ]

  if (editing) {
    const addAsset = (key: 'registerBefore' | 'registerAfter' | 'campaignAssets', item: SkinAsset) =>
      setEditing({ ...editing, [key]: [...editing[key], item] })
    const patchAsset = (key: 'registerBefore' | 'registerAfter' | 'campaignAssets', index: number, item?: SkinAsset) => {
      const next = editing[key].slice()
      if (!item) next.splice(index, 1)
      else next[index] = item
      setEditing({ ...editing, [key]: next })
    }

    return (
      <div className="skin-admin page-card">
        <div className="skin-admin-head">
          <div>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => { setEditing(null); setCreating(false) }}>
              {en ? 'Back to list' : '返回列表'}
            </Button>
            <h2>{creating ? (en ? 'New landing skin' : '新建活动页皮肤') : (en ? 'Edit landing skin' : '编辑活动页皮肤')}</h2>
            <Text type="secondary">{en ? 'Configure copy, register module and assets used by the public register landing page.' : '配置注册落地页的文案、注册模块和素材。落地页管理里的「页面样式」会读取这里已发布的皮肤。'}</Text>
          </div>
        </div>

        <Card className="skin-card" title={en ? 'Basic settings' : '基本配置'}>
          <div className="skin-form-row">
            <label><em>*</em>{en ? 'Page name' : '活动页名称'}</label>
            <Input value={editing.name} maxLength={80} placeholder={en ? 'e.g. Korea summer trial' : '例如：韩国暑期体验课'} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div className="skin-form-row">
            <label>{en ? 'Skin code' : '皮肤 Code'}</label>
            <Input value={editing.code} maxLength={12} addonBefore="code=" onChange={(e) => setEditing({ ...editing, code: e.target.value.trim() })} />
          </div>
          <div className="skin-form-row">
            <label>{en ? 'SEO image' : 'SEO 图片'}</label>
            <SkinAssetField label="" hint={en ? 'Recommended 1200×630' : '建议尺寸 1200×630'} value={editing.seoImage} onChange={(seoImage) => setEditing({ ...editing, seoImage })} />
          </div>
          <div className="skin-form-row">
            <label><em>*</em>{en ? 'Title' : '主标题'}</label>
            <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          </div>
          <div className="skin-form-row">
            <label>{en ? 'Subtitle' : '副标题'}</label>
            <Input.TextArea rows={2} value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
          </div>
          <div className="skin-form-row">
            <label><em>*</em>{en ? 'Landing type' : '落地页类型'}</label>
            <Radio.Group
              value={editing.pageType}
              onChange={(e) => setEditing({ ...editing, pageType: e.target.value })}
              options={PAGE_TYPE_OPTIONS.map((x) => ({ value: x.value, label: en ? x.en : x.zh }))}
            />
          </div>
          <div className="skin-form-row">
            <label><em>*</em>{en ? 'Language' : '语言'}</label>
            <Radio.Group
              value={editing.language}
              onChange={(e) => setEditing({ ...editing, language: e.target.value })}
              options={LANGUAGE_OPTIONS}
            />
          </div>
          <div className="skin-form-row">
            <label>{en ? 'Business line' : '业务线'}</label>
            <Select
              value={editing.line}
              style={{ width: 220 }}
              options={['韩国', '越南', '马来', '泰国', '印尼', '新加坡', '其他'].map((v) => ({ value: v, label: v }))}
              onChange={(line) => setEditing({ ...editing, line })}
            />
          </div>
        </Card>

        <Card className="skin-card" title={en ? 'Register settings' : '注册配置'}>
          <div className="skin-form-row">
            <label><em>*</em>{en ? 'Register type' : '注册类型'}</label>
            <Radio.Group
              value={editing.registerMode}
              onChange={(e) => setEditing({ ...editing, registerMode: e.target.value })}
              options={REGISTER_MODE_OPTIONS.map((x) => ({ value: x.value, label: en ? x.en : x.zh }))}
            />
          </div>
          <div className="skin-form-row">
            <label>{en ? 'Third-party login' : '三方登录'}</label>
            <Checkbox.Group
              value={editing.thirdPartyLogins}
              options={THIRD_PARTY_OPTIONS.map((x) => ({ value: x.value, label: x.zh }))}
              onChange={(vals) => setEditing({ ...editing, thirdPartyLogins: vals as ThirdPartyLogin[] })}
            />
          </div>
        </Card>

        <Card
          className="skin-card"
          title={en ? 'Assets & style' : '素材和样式'}
          extra={<Text type="secondary">{en ? 'A/B tests are not included yet.' : '暂不支持 A/B 实验开关'}</Text>}
        >
          <SkinAssetField
            required
            acceptVideo
            label={en ? 'Header / hero' : '默认素材头图'}
            hint={en ? 'Supports image or short video. Japanese campaign pages can use a looping clip.' : '支持图片或短视频；日本活动页可放循环动效视频'}
            value={editing.hero}
            onChange={(hero) => setEditing({ ...editing, hero })}
          />
          <div style={{ height: 20 }} />
          <div className="skin-field-label">{en ? 'Images before register module' : '注册模块前置图'}</div>
          <div className="skin-asset-list">
            {editing.registerBefore.map((item, i) => (
              <SkinAssetField key={item.id} label="" value={item} onChange={(next) => patchAsset('registerBefore', i, next)} />
            ))}
            <Button type="dashed" onClick={() => addAsset('registerBefore', { id: crypto.randomUUID(), kind: 'image', src: '', name: '' })}>
              {en ? 'Add before-image' : '新增前置图'}
            </Button>
          </div>
          <div style={{ height: 20 }} />
          <div className="skin-field-label">{en ? 'Images after register module' : '注册模块后置图'}</div>
          <div className="skin-asset-list">
            {editing.registerAfter.map((item, i) => (
              <SkinAssetField key={item.id} label="" value={item} onChange={(next) => patchAsset('registerAfter', i, next)} />
            ))}
            <Button type="dashed" onClick={() => addAsset('registerAfter', { id: crypto.randomUUID(), kind: 'image', src: '', name: '' })}>
              {en ? 'Add after-image' : '新增后置图'}
            </Button>
          </div>
          <div style={{ height: 20 }} />
          <SkinAssetField
            label={en ? 'Sticky bottom bar (one only)' : '吸底图（仅一张）'}
            hint={en ? 'Fixed to the bottom of the landing page, like VIPKID.' : '固定在落地页底部，参考 VIPKID 吸底条'}
            value={editing.stickyBar}
            onChange={(stickyBar) => setEditing({ ...editing, stickyBar })}
          />
          <div className="skin-form-row" style={{ marginTop: 12 }}>
            <label>{en ? 'Sticky CTA' : '吸底按钮文案'}</label>
            <Input value={editing.stickyBarCta} onChange={(e) => setEditing({ ...editing, stickyBarCta: e.target.value })} />
          </div>
          <div className="skin-field-label">{en ? 'Campaign carousel / motion assets' : '活动内容素材（轮播，可选）'}</div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>{en ? 'Inspired by the Todo English JP landing carousel.' : '可参考日本 Todo English 活动页的轮播与游戏动效。'}</Text>
          <div className="skin-asset-list">
            {editing.campaignAssets.map((item, i) => (
              <SkinAssetField key={item.id} acceptVideo label="" value={item} onChange={(next) => patchAsset('campaignAssets', i, next)} />
            ))}
            <Button type="dashed" onClick={() => addAsset('campaignAssets', { id: crypto.randomUUID(), kind: 'image', src: '', name: '' })}>
              {en ? 'Add carousel asset' : '新增轮播素材'}
            </Button>
          </div>
          <div style={{ marginTop: 16 }}>
            <Checkbox
              checked={editing.effects.includes('curtain')}
              onChange={(e) => setEditing({ ...editing, effects: e.target.checked ? [...editing.effects.filter((x) => x !== 'curtain'), 'curtain'] : editing.effects.filter((x) => x !== 'curtain') })}
            >
              {en ? 'Opening curtain motion' : '开场幕布动效'}
            </Checkbox>
            <Checkbox
              checked={editing.effects.includes('carousel') || editing.campaignAssets.length > 1}
              onChange={(e) => setEditing({ ...editing, effects: e.target.checked ? [...editing.effects.filter((x) => x !== 'carousel'), 'carousel'] : editing.effects.filter((x) => x !== 'carousel') })}
            >
              {en ? 'Show as carousel' : '以轮播展示活动素材'}
            </Checkbox>
          </div>
        </Card>

        <div className="skin-footer">
          <Button onClick={() => { setEditing(null); setCreating(false) }}>{en ? 'Cancel' : '取消'}</Button>
          {canPreview ? (
            <Button icon={<EyeOutlined />} onClick={() => openPreview(editing, true)}>
              {en ? 'Preview' : '预览'}
            </Button>
          ) : null}
          {canEdit ? (
            <Button type="primary" onClick={() => save(true)}>
              {en ? 'Submit' : '提交'}
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="page-card">
      <div className="skin-admin-head">
        <div>
          <div className="section-title">{en ? 'Landing page skin management' : '活动页皮肤管理'}</div>
          <Text type="secondary">
            {en
              ? 'Every register / home landing page can switch hero, copy, register flow, extra assets and a sticky bottom bar.'
              : '所有注册页（首页）都可通过皮肤切换头图、文案、注册流程、前置/后置素材和吸底图。点击预览会打开与 VIPKID 类似的预览链接。'}
          </Text>
        </div>
        {canEdit ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreating(true); setEditing(emptySkin(actor)) }}>
            {en ? 'New skin' : '新建皮肤'}
          </Button>
        ) : null}
      </div>
      <Alert
        showIcon
        style={{ marginBottom: 16 }}
        message={en ? 'Preview URL format' : '预览链接格式'}
        description={<span className="skin-preview-link">{typeof location !== 'undefined' ? previewHref('1mw') : ''}</span>}
      />
      <Table rowKey="id" columns={columns} dataSource={store.skins} pagination={false} />
    </div>
  )
}
