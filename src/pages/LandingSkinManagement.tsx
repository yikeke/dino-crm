import { useState } from 'react'
import { Alert, Button, Card, Checkbox, Drawer, Empty, Input, Modal, Radio, Select, Space, Switch, Table, Tag, Typography, message } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { usePerm } from '../perm'
import { useI18n } from '../i18n'
import SkinAssetField, { SceneImageField, StickyBarField } from '../components/SkinAssetField'
import ButtonStyleField from '../components/ButtonStyleField'
import {
  followUpOptions,
  PAGE_TYPE_HINT,
  PAGE_TYPE_OPTIONS,
  REGISTER_MODE_OPTIONS,
  SKIN_BUSINESS_LINES,
  THIRD_PARTY_OPTIONS,
  allocateTemplateCode,
  defaultLanguageForLine,
  imageAltPlaceholder,
  languageLabel,
  missingImageAlts,
  seoDescriptionPlaceholder,
  seoLanguageHint,
  seoTitlePlaceholder,
  emptyRegisterField,
  emptySceneImage,
  emptySkin,
  flattenSkinScenes,
  followUpActionForPageType,
  hasRequiredSceneContent,
  DEFAULT_STICKY_CTA_RECT,
  normalizeStickyCtaMode,
  normalizeStickyFlags,
  sceneVideoIncomplete,
  skinTrackButtons,
  loadLandingSkinStore,
  namePlaceholderForLine,
  DEFAULT_REGISTER_BG_COLOR,
  DEFAULT_REGISTER_AREA_BG_COLOR,
  DEFAULT_REGISTER_TITLE_COLOR,
  normalizeTitleColor,
  normalizePageType,
  normalizeRegisterField,
  normalizeCtaStyle,
  normalizeRegisterBgColor,
  normalizeRegisterBgKind,
  normalizeRegisterAreaBgColor,
  normalizeRegisterAreaBgKind,
  normalizeRegisterMode,
  pageTypeLabel,
  previewHref,
  pushSkinHistory,
  registerSummary,
  saveLandingSkinStore,
  skinActionDialog,
  skinHasLiveVersion,
  skinLifecycle,
  skinStatusColor,
  skinStatusLabel,
  writePreviewDraft,
  type LandingSkin,
  type LandingPageKind,
  type RegisterAreaBgKind,
  type RegisterBgKind,
  type SkinAsset,
  type SkinHistoryEntry,
  type ThirdPartyLogin,
} from '../landingSkin'
import './LandingSkinManagement.css'
import '../landingButton.css'

const { Text } = Typography

const GUIDE_STEPS = [
  { target: 'skin-sec-basic', zh: '基本配置', en: 'Basics' },
  { target: 'skin-sec-register', zh: '注册配置', en: 'Register' },
  { target: 'skin-sec-before', zh: '前置图', en: 'Before images' },
  { target: 'skin-sec-after', zh: '后置图', en: 'After images' },
  { target: 'skin-sec-seo', zh: 'SEO', en: 'SEO' },
  { target: 'skin-footer', zh: '预览', en: 'Preview' },
  { target: 'skin-footer', zh: '保存 / 提交', en: 'Save / submit' },
]

function SkinCreateGuide({ en }: { en: boolean }) {
  const jump = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <div className="skin-guide">
      <div className="skin-guide-title">{en ? 'How to create a skin' : '操作指引'}</div>
      <ol className="skin-guide-flow">
        {GUIDE_STEPS.map((step, i) => (
          <li key={`${step.target}-${i}`}>
            {i > 0 ? <span className="skin-guide-arrow" aria-hidden>→</span> : null}
            <button type="button" onClick={() => jump(step.target)}>
              <em>{i + 1}</em>
              {en ? step.en : step.zh}
            </button>
          </li>
        ))}
      </ol>
      <p className="skin-guide-essence">
        {en
          ? <>Basics (line + type) → register → images above / below the form (at least one; first before-image is the first screen) → SEO title & description. Preview, then save a draft or submit to publish. After submit, pick the template ID in Landing Page Management → Skin type.</>
          : <>基本配置（业务线、类型）→ 注册配置 → 前置图 / 后置图（表单上 / 下，至少一张；前置第 1 张即首屏）→ SEO 主副标题。配完先预览；暂时保存不上线，提交后发布并生成模板 ID。到「落地页管理 → 皮肤类型」选用。</>}
      </p>
    </div>
  )
}

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
  const [historyOf, setHistoryOf] = useState<LandingSkin | null>(null)
  const [lineFilter, setLineFilter] = useState<string>()
  const [keywordQuery, setKeywordQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<LandingPageKind>()
  const [statusFilter, setStatusFilter] = useState<'new_draft' | 'published' | 'published_editing'>()

  const persist = (skins: LandingSkin[]) => {
    const next = { version: 6 as const, skins }
    saveLandingSkinStore(next)
    setStore(next)
  }

  const openPreview = (skin: LandingSkin, useDraft = false) => {
    const next = flattenSkinScenes({ ...skin, ...normalizeStickyFlags(skin) })
    // Unpublished / no template_code skins always preview via the draft slot.
    const viaDraft = useDraft || !next.code
    if (viaDraft) writePreviewDraft(next)
    window.open(previewHref(viaDraft ? 'draft' : next.code), '_blank', 'noopener')
  }

  const leaveEditor = () => {
    setEditing(null)
    setCreating(false)
  }

  const confirmLeave = () => {
    if (!editing) return
    const dlg = skinActionDialog(editing, 'cancel', en)
    Modal.confirm({
      title: dlg.title,
      content: dlg.content,
      okText: dlg.okText,
      cancelText: dlg.cancelText,
      okButtonProps: { danger: true },
      onOk: leaveEditor,
    })
  }

  /** Returns false and shows an error toast when the form cannot be saved. */
  const validateForSave = (publish: boolean) => {
    if (!editing) return false
    if (!editing.line) {
      message.error(en ? 'Select a business line first' : '请先选择业务线')
      return false
    }
    if (!editing.name.trim()) {
      message.error(en ? 'Enter a skin name' : '请填写落地页皮肤名称')
      return false
    }
    // Full checks only on submit; temporary save only needs line + name.
    if (!publish) return true
    if (!hasRequiredSceneContent(editing)) {
      message.error(en
        ? 'Add at least one before-register or after-register image'
        : '注册模块前置图、注册模块后置图至少上传一张')
      return false
    }
    if (!editing.seoTitle?.trim() || !editing.seoDescription?.trim()) {
      message.error(en ? 'Fill in the SEO title and SEO description before submitting' : '请填写页面 SEO 的主标题和副标题后再提交')
      return false
    }
    if (sceneVideoIncomplete(editing.registerBefore) || sceneVideoIncomplete(editing.registerAfter)) {
      message.error(en ? 'Upload a loop video for each scene that has a video window' : '已打开视频窗口的配图需要上传循环视频')
      return false
    }
    if (normalizeRegisterBgKind(editing.registerBgKind) === 'image' && !editing.registerBgImage?.src) {
      message.error(en ? 'Upload a register form background image' : '请上传注册表单背景图')
      return false
    }
    if (normalizeRegisterAreaBgKind(editing.registerAreaBgKind) === 'image' && !editing.registerAreaBgImage?.src) {
      message.error(en ? 'Upload a register area background image' : '请上传注册区域背景图')
      return false
    }
    if (editing.stickyImageEnabled && !editing.stickyBar?.src) {
      message.error(en ? 'Upload a sticky bottom image, or turn the switch off' : '已开启吸底图，请上传图片或关闭开关')
      return false
    }
    const missingAlt = missingImageAlts(editing)
    if (missingAlt.length) {
      message.error(en
        ? `Add alt text for: ${missingAlt.map((s) => s.en).join(', ')}`
        : `请填写图片描述（alt）：${missingAlt.map((s) => s.zh).join('、')}`)
      return false
    }
    return true
  }

  const runSave = (publish: boolean) => {
    if (!editing) return
    if (!validateForSave(publish)) return
    const life = skinLifecycle(editing)
    const hasLive = skinHasLiveVersion(editing)
    const pageType = normalizePageType(editing.pageType, editing.afterRegisterAction)
    const peers = store.skins.filter((s) => s.id !== editing.id)
    const at = stamp()
    const liveRev = editing.lastPublishedRevision
    let nextRevision = Math.max(1, editing.revision || 1)
    let nextLastPublished = liveRev
    let nextStatus: LandingSkin['status'] = editing.status

    if (publish) {
      if (!hasLive) {
        nextRevision = 1
        nextLastPublished = 1
        nextStatus = 'published'
      } else if (life === 'published_editing') {
        nextLastPublished = nextRevision
        nextStatus = 'published'
      } else {
        // Direct submit from live published → bump to next Vn
        nextRevision = (liveRev ?? nextRevision) + 1
        nextLastPublished = nextRevision
        nextStatus = 'published'
      }
    } else if (!hasLive) {
      nextStatus = 'draft'
    } else if (life === 'published_editing') {
      nextStatus = 'published_draft'
    } else {
      // First temp-save off a live published skin → open next revision as draft
      nextRevision = (liveRev ?? nextRevision) + 1
      nextStatus = 'published_draft'
    }

    // Once live, identity fields stay locked — except skin name, which remains editable.
    const lockedBasics = hasLive
      ? {
          line: editing.line,
          code: editing.code,
          pageType: normalizePageType(editing.pageType, editing.afterRegisterAction),
          afterRegisterAction: followUpActionForPageType(
            normalizePageType(editing.pageType, editing.afterRegisterAction),
            editing.afterRegisterAction,
            editing.line,
          ),
          language: editing.language || defaultLanguageForLine(editing.line),
        }
      : null
    const nextPageType = lockedBasics?.pageType ?? pageType
    let record: LandingSkin = flattenSkinScenes({
      ...editing,
      ...(lockedBasics || {}),
      registerMode: normalizeRegisterMode(editing.registerMode),
      extraFields: (editing.extraFields ?? []).map(normalizeRegisterField),
      language: lockedBasics?.language ?? defaultLanguageForLine(editing.line),
      pageType: nextPageType,
      afterRegisterAction: lockedBasics?.afterRegisterAction
        ?? followUpActionForPageType(nextPageType, editing.afterRegisterAction, editing.line),
      registerBgKind: normalizeRegisterBgKind(editing.registerBgKind),
      registerBgColor: normalizeRegisterBgColor(editing.registerBgColor),
      registerAreaBgKind: normalizeRegisterAreaBgKind(editing.registerAreaBgKind),
      registerAreaBgColor: normalizeRegisterAreaBgColor(editing.registerAreaBgColor),
      registerTitle: editing.registerTitle?.trim() || undefined,
      registerSubtitle: editing.registerSubtitle?.trim() || undefined,
      registerTitleColor: normalizeTitleColor(editing.registerTitleColor),
      seoTitle: editing.seoTitle?.trim() || undefined,
      seoDescription: editing.seoDescription?.trim() || undefined,
      ctaStyle: normalizeCtaStyle(editing.ctaStyle),
      stickyCtaStyle: normalizeCtaStyle(editing.stickyCtaStyle),
      stickyImageEnabled: !!editing.stickyImageEnabled,
      stickyButtonEnabled: !!editing.stickyButtonEnabled,
      stickyCtaMode: normalizeStickyCtaMode(editing.stickyCtaMode),
      stickyCtaRect: editing.stickyCtaRect || { ...DEFAULT_STICKY_CTA_RECT },
      stickyBarCta: editing.stickyBarCta?.trim() || undefined,
      // template_code is issued on first submit; later edits keep the same code.
      code: publish
        ? (lockedBasics?.code || allocateTemplateCode(editing.line || '', peers, editing.code))
        : (editing.code || ''),
      status: nextStatus,
      revision: nextRevision,
      lastPublishedRevision: nextLastPublished,
      updatedAt: at,
      updatedBy: actor,
    })
    const action = publish
      ? (hasLive ? `更新发布 · V${nextRevision}` : '提交发布 · V1')
      : (hasLive ? `暂时保存 · V${nextRevision} 草稿` : '暂时保存')
    const detail = publish
      ? (hasLive
        ? `覆盖线上 V${liveRev ?? 1} → V${nextRevision}；模板 ID ${record.code}（不支持回退）`
        : `发布成功，模板 ID ${record.code}`)
      : (hasLive
        ? `已保存 V${nextRevision} 草稿；线上仍为 V${liveRev ?? 1}`
        : '保存草稿，素材未配齐也可继续编辑')
    record = pushSkinHistory(record, actor, action, detail, at)
    const skins = store.skins.some((s) => s.id === record.id)
      ? store.skins.map((s) => (s.id === record.id ? record : s))
      : [record, ...store.skins]
    persist(skins)
    // 暂时保存 / 提交成功后都退出编辑页回到列表（与取消一致）
    leaveEditor()
    if (publish) {
      message.success(en
        ? `Submitted · V${nextRevision}. template_code = ${record.code}`
        : `已提交 · V${nextRevision}，模板 ID（template_code）为 ${record.code}`)
    } else {
      message.success(en
        ? hasLive
          ? `Draft V${nextRevision} saved. Live stays at V${liveRev}. Come back anytime.`
          : 'Draft saved. You can continue later from the list. Submit when ready to publish.'
        : hasLive
          ? `已暂时保存 V${nextRevision} 草稿，线上仍为 V${liveRev}；可随时从列表回来继续编辑。`
          : '已暂时保存为草稿，可从列表再进编辑；配齐后点提交才会发布并生成模板 ID。')
    }
  }

  const requestSave = (publish: boolean) => {
    if (!editing) return
    // Validate before the confirm dialog so a failed submit does not look like it succeeded.
    if (!validateForSave(publish)) return
    const dlg = skinActionDialog(editing, publish ? 'submit' : 'temp_save', en)
    Modal.confirm({
      title: dlg.title,
      content: dlg.content,
      okText: dlg.okText,
      cancelText: dlg.cancelText,
      onOk: () => runSave(publish),
    })
  }

  const columns: ColumnsType<LandingSkin> = [
    { title: en ? 'Line' : '业务线', dataIndex: 'line', width: 90 },
    { title: en ? 'Skin name' : '落地页皮肤名称', dataIndex: 'name', render: (v: string) => <b>{v}</b> },
    { title: en ? 'template_code' : '模板 ID', dataIndex: 'code', width: 140, render: (v: string) => <span className="skin-code">{v || '—'}</span> },
    { title: en ? 'Landing type' : '落地页类型', dataIndex: 'pageType', render: (v) => pageTypeLabel(v, en) },
    { title: en ? 'Register' : '注册方式', render: (_, row) => registerSummary(row, en) },
    {
      title: en ? 'Status' : '状态',
      dataIndex: 'status',
      width: 168,
      render: (_: LandingSkin['status'], row) => (
        <Tag color={skinStatusColor(row)}>{skinStatusLabel(row, en)}</Tag>
      ),
    },
    { title: en ? 'Operator' : '操作人', dataIndex: 'updatedBy', width: 160, render: (v: string) => v || '—' },
    { title: en ? 'Updated' : '更新时间', dataIndex: 'updatedAt', width: 170 },
    {
      title: en ? 'Actions' : '操作',
      key: 'op',
      width: 240,
      render: (_, row) => (
        <Space wrap>
          {canPreview ? <Button type="link" onClick={() => openPreview(row)}>{en ? 'Preview' : '预览'}</Button> : null}
          {canEdit ? <Button type="link" onClick={() => { setCreating(false); setEditing(flattenSkinScenes({ ...row, ...normalizeStickyFlags(row) })) }}>{en ? 'Edit' : '编辑'}</Button> : null}
          <Button type="link" onClick={() => setHistoryOf(row)}>{en ? 'History' : '操作记录'}</Button>
        </Space>
      ),
    },
  ]

  if (editing) {
    const pageType = normalizePageType(editing.pageType, editing.afterRegisterAction)
    const basicsLocked = skinHasLiveVersion(editing)
    const life = skinLifecycle(editing)
    const addAsset = (key: 'registerBefore' | 'registerAfter') =>
      setEditing({ ...editing, [key]: [...editing[key], emptySceneImage()] })
    const patchAsset = (key: 'registerBefore' | 'registerAfter', index: number, item?: SkinAsset) => {
      const next = editing[key].slice()
      if (!item) next.splice(index, 1)
      else next[index] = item
      setEditing({ ...editing, [key]: next })
    }

    return (
      <div className="skin-admin page-card">
        <div className="skin-admin-head">
          <div>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={confirmLeave}>
              {en ? 'Back to list' : '返回列表'}
            </Button>
            <h2>{creating ? (en ? 'New landing skin' : '新建落地页皮肤') : (en ? 'Edit landing skin' : '编辑落地页皮肤')}</h2>
            <Text type="secondary">{en
              ? 'Save draft anytime with line + name. Submit runs full checks and publishes. Cancel / save / submit ask for confirmation.'
              : '可随时「暂时保存」（需业务线 + 名称）。「提交」会做完整校验并发布。取消 / 暂时保存 / 提交都会先确认。'}</Text>
          </div>
          <Tag color={skinStatusColor(editing)}>{skinStatusLabel(editing, en)}</Tag>
        </div>

        {creating ? <SkinCreateGuide en={en} /> : null}

        <Card id="skin-sec-basic" className="skin-card" title={en ? 'Basic settings' : '基本配置'}>
          {basicsLocked ? (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16, maxWidth: 640 }}
              message={en
                ? life === 'published_editing'
                  ? `Live V${editing.lastPublishedRevision} is online. Line, template ID, landing type and follow-up stay locked; skin name can still be edited. This draft is V${editing.revision} — submit to overwrite live.`
                  : 'Published: line, template ID, landing type and follow-up are locked. Skin name can still be edited. Register / assets / sticky / SEO can be changed; temp-save keeps a draft without overwriting live.'
                : life === 'published_editing'
                  ? `线上 V${editing.lastPublishedRevision} 仍在服务。业务线、模板 ID、落地页类型、后续交互不可改；落地页皮肤名称仍可改。当前为 V${editing.revision} 草稿，提交后会覆盖线上版本。`
                  : '已发布：业务线、模板 ID、落地页类型、后续交互不可改；落地页皮肤名称仍可改。注册 / 素材 / 吸底 / SEO 可继续调整；「暂时保存」会保存草稿且不立刻覆盖线上。'}
            />
          ) : null}
          <div className="skin-form-row">
            <label><em>*</em>{en ? 'Business line' : '业务线'}</label>
            <Select
              disabled={basicsLocked}
              placeholder={en ? 'Select a business line first' : '请先选择业务线'}
              value={editing.line || undefined}
              style={{ width: 220 }}
              options={SKIN_BUSINESS_LINES.map((v) => ({ value: v, label: v }))}
              onChange={(line) => setEditing({
                ...editing,
                line,
                code: creating ? '' : editing.code,
                language: defaultLanguageForLine(line),
                afterRegisterAction: followUpActionForPageType(
                  normalizePageType(editing.pageType, editing.afterRegisterAction),
                  editing.afterRegisterAction,
                  line,
                ),
                extraFields: creating && line === '马来' && !(editing.extraFields?.length)
                  ? [emptyRegisterField('Name')]
                  : editing.extraFields,
              })}
            />
          </div>
          <div className="skin-form-row">
            <label><em>*</em>{en ? 'Skin name' : '落地页皮肤名称'}</label>
            <Input disabled={!editing.line} value={editing.name} maxLength={80} placeholder={namePlaceholderForLine(editing.line, en)} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div className="skin-form-row">
            <label>{en ? 'template_code' : '模板 ID'}</label>
            <div>
              <Input readOnly value={editing.code || (en ? 'Auto-issued after submit (not on draft save)' : '提交后自动生成（暂时保存不会发号）')} className="skin-code" />
              <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                {en ? 'Not user-editable. Landing Page Management → Skin type uses this template_code.' : '用户不可填写。落地页管理「皮肤类型」读取的就是这个 template_code（tem_id），按业务线自动编号，如 KR_SKIN_A。'}
              </Text>
            </div>
          </div>
          <div className="skin-form-row">
            <label><em>*</em>{en ? 'Landing type' : '落地页类型'}</label>
            <div>
              <Radio.Group
                disabled={basicsLocked || !editing.line}
                value={pageType}
                onChange={(e) => {
                  const next = e.target.value as LandingPageKind
                  setEditing({
                    ...editing,
                    pageType: next,
                    afterRegisterAction: followUpActionForPageType(next, editing.afterRegisterAction, editing.line),
                  })
                }}
                options={PAGE_TYPE_OPTIONS.map((x) => ({ value: x.value, label: en ? x.en : x.zh }))}
              />
              <Text type="secondary" style={{ display: 'block', marginTop: 6, maxWidth: 560 }}>
                {en ? PAGE_TYPE_HINT[pageType].en : PAGE_TYPE_HINT[pageType].zh}
              </Text>
            </div>
          </div>
          <div className="skin-form-row">
            <label><em>*</em>{en ? 'Next interaction' : '后续交互页面'}</label>
            <div>
              <Radio.Group
                className="skin-radio-stack"
                disabled={basicsLocked || !editing.line}
                value={followUpActionForPageType(pageType, editing.afterRegisterAction, editing.line)}
                onChange={(e) => setEditing({ ...editing, afterRegisterAction: e.target.value })}
                options={followUpOptions(pageType, editing.line).map((x) => ({ value: x.value, label: en ? x.en : x.zh }))}
              />
              <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                {pageType === 'pay'
                  ? (en ? 'Fixed by the landing type.' : '由落地页类型决定，无需选择。')
                  : (en
                    ? 'Fixed by the business line. Vietnam: two lead pages. Malaysia: four lead pages. Other lines: download-app popup.'
                    : '由业务线决定，无需选择。越南是收集两个留资页面，马来是收集四个留资页面，其他业务线是直接出下载 App 弹窗。')}
              </Text>
            </div>
          </div>
        </Card>

        <Card id="skin-sec-register" className={`skin-card ${editing.line ? '' : 'skin-rest-locked'}`} title={en ? 'Register settings' : '注册配置'}>
          <Text type="secondary" className="skin-reg-lead">
            {en
              ? 'Four steps, in the same order as the form: how people register, the title, the button, then the background.'
              : '按表单从上到下，分四步来配：先定怎么注册，再写标题，再定按钮，最后铺背景。'}
          </Text>
          <div className="skin-reg-block">
            <div className="skin-reg-head">
              <em>1</em>
              <b>{en ? 'How to register' : '注册方式'}</b>
              <span>{en ? 'Whether there is a form, and what it collects' : '先决定有没有表单，再决定表单里收什么'}</span>
            </div>
          <div className="skin-form-row">
            <label><em>*</em>{en ? 'Register type' : '注册类型'}</label>
            <div>
              <Radio.Group
                disabled={!editing.line}
                value={normalizeRegisterMode(editing.registerMode)}
                onChange={(e) => setEditing({
                  ...editing,
                  registerMode: e.target.value,
                  verifyEnabled: e.target.value === 'none' ? false : editing.verifyEnabled,
                })}
                options={REGISTER_MODE_OPTIONS.map((x) => ({ value: x.value, label: en ? x.en : x.zh }))}
              />
              <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
                {en
                  ? 'No register hides the form. Phone register always creates an account, with or without OTP. OTP and extra fields are configured below.'
                  : '无注册则不展示表单。手机号注册成账号：无论有验证还是无验证，提交后都会创建账号。验证码和额外字段在这一步里配。'}
              </Text>
            </div>
          </div>
          {normalizeRegisterMode(editing.registerMode) !== 'none' ? (
            <div className="skin-form-row">
              <label>{en ? 'Verification' : '是否验证'}</label>
              <Radio.Group
                disabled={!editing.line}
                value={editing.verifyEnabled ? 'otp' : 'none'}
                onChange={(e) => setEditing({ ...editing, verifyEnabled: e.target.value === 'otp' })}
                options={[
                  { value: 'otp', label: en ? 'With OTP' : '有验证' },
                  { value: 'none', label: en ? 'No OTP' : '无验证' },
                ]}
              />
            </div>
          ) : null}
          {normalizeRegisterMode(editing.registerMode) !== 'none' ? (
            <div className="skin-form-row">
              <label>{en ? 'Extra fields' : '其他字段'}</label>
              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  {en
                    ? 'Add custom fields (label + required/optional) shown above the phone number. Collected only for this landing form, not written into the user profile.'
                    : '可自定义增删字段（文案 + 必选 / 非必选），展示在手机号上方。仅用于本次落地页留资收集，不会写入用户个人资料。'}
                </Text>
                {(editing.extraFields ?? []).map((field, index) => (
                  <Space key={field.id} style={{ display: 'flex', marginBottom: 8, flexWrap: 'wrap' }} align="center">
                    <Input
                      value={field.label}
                      placeholder={en ? 'Field label' : '字段文案，如 Name'}
                      style={{ width: 200 }}
                      onChange={(e) => {
                        const extraFields = editing.extraFields.slice()
                        extraFields[index] = { ...field, label: e.target.value }
                        setEditing({ ...editing, extraFields })
                      }}
                    />
                    <Radio.Group
                      value={field.required !== false ? 'required' : 'optional'}
                      onChange={(e) => {
                        const extraFields = editing.extraFields.slice()
                        extraFields[index] = { ...field, required: e.target.value === 'required' }
                        setEditing({ ...editing, extraFields })
                      }}
                      options={[
                        { value: 'required', label: en ? 'Required' : '必选' },
                        { value: 'optional', label: en ? 'Optional' : '非必选' },
                      ]}
                    />
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={() => setEditing({ ...editing, extraFields: editing.extraFields.filter((x) => x.id !== field.id) })}
                    />
                  </Space>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => setEditing({ ...editing, extraFields: [...(editing.extraFields ?? []), emptyRegisterField(en ? 'Name' : 'Name')] })}>
                  {en ? 'Add field' : '新增字段'}
                </Button>
              </div>
            </div>
          ) : null}
          <div className="skin-form-row">
            <label>{en ? 'Third-party login' : '三方登录'}</label>
            <div>
              <Checkbox.Group
                disabled={!editing.line}
                value={editing.thirdPartyLogins}
                options={THIRD_PARTY_OPTIONS.map((x) => ({ value: x.value, label: x.zh }))}
                onChange={(vals) => setEditing({ ...editing, thirdPartyLogins: vals as ThirdPartyLogin[] })}
              />
              <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
                {en ? 'Checked providers appear as icons under the register form.' : '勾选后展示在注册区域下方，作为快捷登录入口。'}
              </Text>
            </div>
          </div>
          </div>
          <div className="skin-reg-block">
            <div className="skin-reg-head">
              <em>2</em>
              <b>{en ? 'Form title' : '表单标题'}</b>
              <span>{en ? 'Under the logo, above the fields' : 'Logo 下方、输入框上方'}</span>
            </div>
            <div className="skin-form-row">
              <label>{en ? 'Form title' : '注册表单标题'}</label>
              <div className="skin-title-fields">
                <Input
                  disabled={!editing.line}
                  value={editing.registerTitle}
                  maxLength={30}
                  showCount
                  placeholder={en ? 'Title, e.g. Try 7 days free' : '主标题，如：7 天免费体验'}
                  onChange={(e) => setEditing({ ...editing, registerTitle: e.target.value })}
                />
                <Input
                  disabled={!editing.line}
                  value={editing.registerSubtitle}
                  maxLength={60}
                  showCount
                  placeholder={en ? 'Subtitle (optional)' : '副标题（选填），如：只需手机号，马上开始'}
                  onChange={(e) => setEditing({ ...editing, registerSubtitle: e.target.value })}
                />
                <span className="skin-color-chip">
                  <input
                    type="color"
                    disabled={!editing.line}
                    value={normalizeTitleColor(editing.registerTitleColor)}
                    onChange={(e) => setEditing({ ...editing, registerTitleColor: e.target.value })}
                  />
                  <Input
                    style={{ width: 120 }}
                    disabled={!editing.line}
                    value={editing.registerTitleColor || DEFAULT_REGISTER_TITLE_COLOR}
                    onChange={(e) => setEditing({ ...editing, registerTitleColor: e.target.value })}
                  />
                  <Text type="secondary">{en ? 'Text color' : '文字色'}</Text>
                </span>
                <Text type="secondary" style={{ display: 'block' }}>
                  {en
                    ? 'Leave both empty to hide this block. Change the text color when the form background is dark or a photo.'
                    : '两项都不填则不展示。表单背景换成深色或图片时，记得改文字色。'}
                </Text>
              </div>
            </div>
          </div>
          <div className="skin-reg-block">
            <div className="skin-reg-head">
              <em>3</em>
              <b>{en ? 'Register button' : '注册按钮'}</b>
              <span>{en ? 'The main button at the bottom of the form' : '表单底部的主按钮'}</span>
            </div>
          <div className="skin-form-row">
            <label>{en ? 'CTA text' : '注册按钮文案'}</label>
            <Input disabled={!editing.line} value={editing.ctaText} placeholder={en ? 'e.g. Log in / Start now' : '例如：立即开始 / 바로 시작하기'} onChange={(e) => setEditing({ ...editing, ctaText: e.target.value })} />
          </div>
          <div className="skin-form-row skin-form-row-wide">
            <label>{en ? 'Register button style' : '注册按钮样式'}</label>
            <ButtonStyleField
              en={en}
              value={editing.ctaStyle}
              sample={editing.ctaText || (en ? 'Log in' : '立即开始')}
              onChange={(ctaStyle) => setEditing({ ...editing, ctaStyle })}
            />
          </div>
          </div>
          <div className="skin-reg-block">
            <div className="skin-reg-head">
              <em>4</em>
              <b>{en ? 'Background' : '背景'}</b>
              <span>{en ? 'The full-width area first, then the form card' : '先铺整段区域，再铺表单卡片'}</span>
            </div>
          <div className="skin-form-row skin-form-row-wide">
            <label>{en ? 'Register area background' : '注册区域背景'}</label>
            <div>
            <Radio.Group
              value={normalizeRegisterAreaBgKind(editing.registerAreaBgKind)}
              onChange={(e) => setEditing({ ...editing, registerAreaBgKind: e.target.value as RegisterAreaBgKind })}
            >
              <Radio value="none">{en ? 'None' : '无'}</Radio>
              <Radio value="color">{en ? 'Background color' : '背景色'}</Radio>
              <Radio value="image">{en ? 'Background image' : '背景图'}</Radio>
            </Radio.Group>
            <Text type="secondary" style={{ display: 'block', margin: '8px 0 12px' }}>
              {en
                ? 'Full-bleed section behind the register form — spans the whole screen width. Height follows the form.'
                : '注册表单背后的整段区域背景，左右占满屏幕宽度。高度跟随表单自适应。'}
            </Text>
            {normalizeRegisterAreaBgKind(editing.registerAreaBgKind) === 'color' ? (
              <span className="skin-color-chip">
                <input
                  type="color"
                  value={normalizeRegisterAreaBgColor(editing.registerAreaBgColor)}
                  onChange={(e) => setEditing({ ...editing, registerAreaBgColor: e.target.value })}
                />
                <Input
                  style={{ width: 120 }}
                  value={editing.registerAreaBgColor || DEFAULT_REGISTER_AREA_BG_COLOR}
                  onChange={(e) => setEditing({ ...editing, registerAreaBgColor: e.target.value })}
                />
              </span>
            ) : null}
            {normalizeRegisterAreaBgKind(editing.registerAreaBgKind) === 'image' ? (
              <SkinAssetField
                label={en ? 'Area background image' : '区域背景图'}
                hint={en ? 'JPEG / PNG. Covers the full-width register section; the form card sits on top.' : 'JPEG / PNG。铺满整段注册区域（全宽），表单卡片叠在上面。'}
                budget="background"
                value={editing.registerAreaBgImage}
                onChange={(registerAreaBgImage) => setEditing({ ...editing, registerAreaBgImage })}
              />
            ) : null}
            </div>
          </div>
          <div className="skin-form-row skin-form-row-wide">
            <label>{en ? 'Register form background' : '注册表单背景'}</label>
            <div>
            <Radio.Group
              value={normalizeRegisterBgKind(editing.registerBgKind)}
              onChange={(e) => setEditing({ ...editing, registerBgKind: e.target.value as RegisterBgKind })}
            >
              <Radio value="color">{en ? 'Background color' : '背景色'}</Radio>
              <Radio value="image">{en ? 'Background image' : '背景图'}</Radio>
            </Radio.Group>
            <Text type="secondary" style={{ display: 'block', margin: '8px 0 12px' }}>
              {en
                ? 'Choose one: a solid color, or an image that covers the form card itself (inside the register area).'
                : '二选一：纯色铺底，或用一张图铺满表单卡片本身（在注册区域里面）。'}
            </Text>
            {normalizeRegisterBgKind(editing.registerBgKind) === 'color' ? (
              <span className="skin-color-chip">
                <input
                  type="color"
                  value={normalizeRegisterBgColor(editing.registerBgColor)}
                  onChange={(e) => setEditing({ ...editing, registerBgColor: e.target.value })}
                />
                <Input
                  style={{ width: 120 }}
                  value={editing.registerBgColor || DEFAULT_REGISTER_BG_COLOR}
                  onChange={(e) => setEditing({ ...editing, registerBgColor: e.target.value })}
                />
              </span>
            ) : (
              <SkinAssetField
                label={en ? 'Form background image' : '表单背景图'}
                hint={en ? 'JPEG / PNG / WebP. Covers the form card.' : '支持 JPEG / PNG / WebP，铺满表单卡片。'}
                budget="background"
                value={editing.registerBgImage}
                onChange={(registerBgImage) => setEditing({ ...editing, registerBgImage })}
              />
            )}
            </div>
          </div>
          </div>
        </Card>

        <Card
          id="skin-sec-before"
          className={`skin-card ${editing.line ? '' : 'skin-rest-locked'}`}
          title={<>{en ? 'Images before register module' : '注册模块前置图'} <Text type="secondary" className="skin-card-sub">{en ? 'Above the register form' : '注册表单上方'}</Text></>}
          extra={(
            <Button type="primary" ghost icon={<PlusOutlined />} onClick={() => addAsset('registerBefore')}>
              {en ? 'Add before image' : '新增前置配图'}
            </Button>
          )}
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            {en
              ? 'Stacked above the register form. Image 1 is the first screen. At least one before or after image.'
              : '排在注册表单上方。第 1 张即首屏。前置图和后置图至少一张。'}
          </Text>
          <div className="skin-asset-list">
            {editing.registerBefore.map((item, i) => (
              <SceneImageField
                key={item.id}
                en={en}
                title={`${en ? 'Before image' : '前置配图'} ${i + 1}`}
                defaultCtaText={editing.ctaText || (en ? 'Start free trial' : '立即免费体验')}
                line={editing.line}
                value={item}
                onChange={(next) => patchAsset('registerBefore', i, next)}
                onRemove={() => patchAsset('registerBefore', i)}
              />
            ))}
          </div>
        </Card>

        <Card
          id="skin-sec-after"
          className={`skin-card ${editing.line ? '' : 'skin-rest-locked'}`}
          title={<>{en ? 'Images after register module' : '注册模块后置图'} <Text type="secondary" className="skin-card-sub">{en ? 'Below the register form' : '注册表单下方'}</Text></>}
          extra={(
            <Button type="primary" ghost icon={<PlusOutlined />} onClick={() => addAsset('registerAfter')}>
              {en ? 'Add after image' : '新增后置配图'}
            </Button>
          )}
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            {en
              ? 'Stacked below the register form. Use for course intro or testimonials.'
              : '排在注册表单下方，适合课程介绍、口碑。'}
          </Text>
          <div className="skin-asset-list">
            {editing.registerAfter.map((item, i) => (
              <SceneImageField
                key={item.id}
                en={en}
                title={`${en ? 'After image' : '后置配图'} ${i + 1}`}
                defaultCtaText={editing.ctaText || (en ? 'Start free trial' : '立即免费体验')}
                line={editing.line}
                value={item}
                onChange={(next) => patchAsset('registerAfter', i, next)}
                onRemove={() => patchAsset('registerAfter', i)}
              />
            ))}
          </div>
        </Card>

        <Card
          id="skin-sec-sticky"
          className={`skin-card ${editing.line ? '' : 'skin-rest-locked'}`}
          title={en ? 'Sticky bottom bar' : '吸底栏'}
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, maxWidth: 720 }}>
            {en
              ? 'Stays pinned to the bottom while the page scrolls, for a sticky image and a sticky button.'
              : '用户滚动页面时始终贴在底部，用来放吸底图和吸底按钮。'}
          </Text>
          <StickyBarField
            en={en}
            line={editing.line}
            imageEnabled={!!editing.stickyImageEnabled}
            onImageEnabled={(stickyImageEnabled) => setEditing({ ...editing, stickyImageEnabled })}
            image={editing.stickyBar}
            onImage={(stickyBar) => setEditing({ ...editing, stickyBar, stickyImageEnabled: stickyBar ? true : editing.stickyImageEnabled })}
            buttonEnabled={!!editing.stickyButtonEnabled}
            onButtonEnabled={(stickyButtonEnabled) => setEditing({
              ...editing,
              stickyButtonEnabled,
              stickyCtaMode: 'custom',
              stickyCtaRect: editing.stickyCtaRect || { ...DEFAULT_STICKY_CTA_RECT },
            })}
            ctaText={editing.stickyBarCta || ''}
            onCtaText={(stickyBarCta) => setEditing({ ...editing, stickyBarCta })}
            ctaStyle={editing.stickyCtaStyle}
            onCtaStyle={(stickyCtaStyle) => setEditing({ ...editing, stickyCtaStyle })}
            ctaRect={editing.stickyCtaRect || DEFAULT_STICKY_CTA_RECT}
            onCtaRect={(stickyCtaRect) => setEditing({ ...editing, stickyCtaRect })}
            sampleText={editing.stickyBarCta || editing.ctaText || (en ? 'Join now' : '立即报名')}
          />
        </Card>

        <Card
          id="skin-sec-seo"
          className={`skin-card ${editing.line ? '' : 'skin-rest-locked'}`}
          title={en ? 'Page SEO' : '页面 SEO'}
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, maxWidth: 640 }}>
            {en
              ? `Title and description for the whole page (search result blue title + the line under it). Both are required before submit. ${seoLanguageHint(editing.line, true)} Image alt sits to the right of each before, after, and sticky image.`
              : `整页的主标题和副标题，会出现在搜索结果里（蓝色标题 + 下面那一行说明），提交前必须填写。${seoLanguageHint(editing.line)} 单张图的描述（alt）在前置图、后置图、吸底图的右侧填写，有图必填。`}
          </Text>
          <div className="skin-form-row">
            <label><em>*</em>{en ? 'SEO title' : 'SEO 主标题'}</label>
            <div>
              <Input
                value={editing.seoTitle}
                maxLength={60}
                showCount
                placeholder={seoTitlePlaceholder(editing.line)}
                onChange={(e) => setEditing({ ...editing, seoTitle: e.target.value })}
              />
              <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                {en
                  ? `Recommended language: ${languageLabel(defaultLanguageForLine(editing.line))}. Required before submit.`
                  : `推荐语言：${languageLabel(defaultLanguageForLine(editing.line))}。提交前必填。`}
              </Text>
            </div>
          </div>
          <div className="skin-form-row">
            <label><em>*</em>{en ? 'SEO description' : 'SEO 副标题'}</label>
            <div>
              <Input.TextArea
                value={editing.seoDescription}
                maxLength={160}
                showCount
                autoSize={{ minRows: 2, maxRows: 4 }}
                placeholder={seoDescriptionPlaceholder(editing.line)}
                onChange={(e) => setEditing({ ...editing, seoDescription: e.target.value })}
              />
              <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                {en
                  ? `Recommended language: ${languageLabel(defaultLanguageForLine(editing.line))}. One or two sentences: who it is for, what they learn, what the offer is. Required before submit.`
                  : `推荐语言：${languageLabel(defaultLanguageForLine(editing.line))}。一两句话写清：适合谁、学什么、有什么优惠。提交前必填。`}
              </Text>
            </div>
          </div>
        </Card>

        <Card
          id="skin-sec-track"
          className={`skin-card skin-track-card ${editing.line ? '' : 'skin-rest-locked'}`}
          title={<>{en ? 'Tracking' : '埋点'} <Text type="secondary" className="skin-card-sub">{en ? 'Reference' : '参考'}</Text></>}
        >
          <Text type="secondary" className="skin-track-note">
            {en
              ? 'Reference only. Each button gets a button ID automatically. You cannot type or edit it. Changing the label, color, or position keeps the same ID. Turning a button off stops that ID. The register click is not the sign-up result. Firebase auto events stay on the SDK.'
              : '仅供对照，不用在这里填写。每个按钮自动分配 button ID，不能手填，也不能改。改文案、颜色、位置都不换 ID。关掉按钮后不再上报。点注册按钮只记点击。Firebase 自动采集仍由 SDK 上报。'}
          </Text>
          <table className="skin-track">
            <thead>
              <tr>
                <th>{en ? 'Button' : '按钮'}</th>
                <th>button ID</th>
              </tr>
            </thead>
            <tbody>
              {skinTrackButtons(editing).map((row) => (
                <tr key={row.key}>
                  <td>{en ? row.en : row.zh}</td>
                  <td><code>{row.eventId}</code></td>
                </tr>
              ))}
              {!skinTrackButtons(editing).length ? (
                <tr>
                  <td colSpan={2}>{en ? 'No buttons yet.' : '还没有按钮。打开注册、叠按钮或吸底按钮后，这里会出现对应的 ID。'}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {editing.registerMode === 'full' ? (
            <Text type="secondary" className="skin-track-note">
              {en
                ? 'After the phone number is accepted: a new account reports signup_result; an existing account reports login_success. Failures are reported too. Extra-field answers go to the landing-page form table, not into these events or Firebase.'
                : '手机号被服务端收下之后：新账号报 signup_result，老账号报 login_success。失败也要报。其他字段的填写值写入落地页单独的表，不放进这些事件，也不进 Firebase。'}
            </Text>
          ) : null}
        </Card>

        <div id="skin-footer" className="skin-footer">
          <Button onClick={confirmLeave}>{en ? 'Cancel' : '取消'}</Button>
          {canPreview ? (
            <Button icon={<EyeOutlined />} onClick={() => openPreview(editing, true)}>
              {en ? 'Preview' : '预览'}
            </Button>
          ) : null}
          {canEdit ? (
            <>
              <Button onClick={() => requestSave(false)}>
                {en ? 'Save draft' : '暂时保存'}
              </Button>
              <Button type="primary" onClick={() => requestSave(true)}>
                {en ? 'Submit' : '提交'}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="page-card">
      <div className="skin-admin-head">
        <div>
          <div className="section-title">{en ? 'Landing page skin management' : '落地页皮肤管理'}</div>
          <Text type="secondary">
            {en
              ? 'Configure landing skins by business line. After publish, use the template ID in Landing Page Management → Skin type.'
              : '按业务线配置落地页皮肤。提交发布后，可在落地页管理的「皮肤类型」中选择对应模板 ID。'}
          </Text>
        </div>
        {canEdit ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreating(true); setEditing(emptySkin(actor)) }}>
            {en ? 'New skin' : '新建皮肤'}
          </Button>
        ) : null}
      </div>
      <div className="skin-filter-bar">
        <Select
          allowClear
          placeholder={en ? 'Line' : '业务线'}
          aria-label={en ? 'Line' : '业务线'}
          value={lineFilter}
          onChange={setLineFilter}
          options={SKIN_BUSINESS_LINES.map((value) => ({ value, label: value }))}
          style={{ width: 140 }}
        />
        <Input
          allowClear
          placeholder={en ? 'Template ID / skin name' : '模板 ID / 皮肤名称'}
          aria-label={en ? 'Template ID / skin name' : '模板 ID / 皮肤名称'}
          value={keywordQuery}
          onChange={(e) => setKeywordQuery(e.target.value)}
          style={{ width: 240 }}
        />
        <Select
          allowClear
          placeholder={en ? 'Landing type' : '落地页类型'}
          aria-label={en ? 'Landing type' : '落地页类型'}
          value={typeFilter}
          onChange={setTypeFilter}
          options={PAGE_TYPE_OPTIONS.map((x) => ({ value: x.value, label: en ? x.en : x.zh }))}
          style={{ width: 150 }}
        />
        <Select
          allowClear
          placeholder={en ? 'Status' : '状态'}
          aria-label={en ? 'Status' : '状态'}
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'new_draft', label: en ? 'Draft' : '草稿（未发布）' },
            { value: 'published', label: en ? 'Published' : '已发布' },
            { value: 'published_editing', label: en ? 'Draft · editing' : '草稿 · 修改中' },
          ]}
          style={{ width: 170 }}
        />
        <Button
          type="link"
          onClick={() => {
            setLineFilter(undefined)
            setKeywordQuery('')
            setTypeFilter(undefined)
            setStatusFilter(undefined)
          }}
        >
          {en ? 'Reset' : '重置'}
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        pagination={false}
        scroll={{ x: 1200 }}
        locale={{ emptyText: <Empty description={en ? 'No skins match these filters.' : '没有符合筛选条件的皮肤'} /> }}
        dataSource={store.skins.filter((row) => {
          if (lineFilter && row.line !== lineFilter) return false
          const keyword = keywordQuery.trim().toLowerCase()
          if (keyword) {
            const code = (row.code || '').toLowerCase()
            const name = (row.name || '').toLowerCase()
            const slash = keyword.indexOf('/')
            if (slash >= 0) {
              const codeNeedle = keyword.slice(0, slash).trim()
              const nameNeedle = keyword.slice(slash + 1).trim()
              if (codeNeedle && !code.includes(codeNeedle)) return false
              if (nameNeedle && !name.includes(nameNeedle)) return false
            } else if (!code.includes(keyword) && !name.includes(keyword)) {
              return false
            }
          }
          if (typeFilter && normalizePageType(row.pageType, row.afterRegisterAction) !== typeFilter) return false
          if (statusFilter) {
            const life = skinLifecycle(row)
            if (statusFilter === 'published') {
              if (life !== 'published_v1' && life !== 'published_vn') return false
            } else if (life !== statusFilter) return false
          }
          return true
        })}
      />
      <Drawer
        title={historyOf ? `${historyOf.name || (en ? 'Untitled' : '未命名')} · ${en ? 'Operation history' : '操作记录'}` : (en ? 'Operation history' : '操作记录')}
        open={!!historyOf}
        onClose={() => setHistoryOf(null)}
        width={720}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={en
            ? 'Temporary save, submit, and republish are logged with version and operator.'
            : '暂时保存、提交发布、再次发布都会记录操作人与版本信息。'}
        />
        <Table
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: <Empty description={en ? 'No history yet' : '暂无操作记录'} /> }}
          dataSource={[...(historyOf?.history || [])].slice().reverse()}
          columns={[
            { title: en ? 'Time' : '操作时间', dataIndex: 'at', width: 170 },
            { title: en ? 'Operator' : '操作人', dataIndex: 'actor', width: 150 },
            { title: en ? 'Action' : '操作', dataIndex: 'action', width: 150 },
            { title: en ? 'Detail' : '变更内容', dataIndex: 'detail' },
          ] satisfies ColumnsType<SkinHistoryEntry>}
        />
      </Drawer>
    </div>
  )
}
