import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Drawer, Switch, Tag, Typography } from 'antd'
import { ExperimentOutlined } from '@ant-design/icons'
import { setUpstream, upstreamOn, type UpstreamId } from '../paymentLinkCatalog'

type Jump = { label: string; to: string }
type Scenario = {
  id: UpstreamId
  group: string
  title: string
  change: string
  effects: [string, string][]
  jumps: Jump[]
}

const editPersonal = (id: string) => `/marketing-center-v5/personal-links?edit=${id}`
const editOpen = (id: string) => `/marketing-center-v5/open-links?edit=${id}`
const page = (id: string) => `/pay-link?link=${id}`

const SCENARIOS: Scenario[] = [
  {
    id: 'sku_price',
    group: 'SKU 目录',
    title: 'SKU 原价上调 10%',
    change: 'SKU 目录里韩国、越南的 Pro Quarterly 原价 ×1.1（99,000 → 108,900 KRW；990,000 → 1,089,000 VND）。渠道方案的折扣规则不变，应付跟着涨。',
    effects: [
      ['专属 · 全款 / 定金首款前', '不保存仍按原快照价卖；编辑页提示差异，CC 保存后按新价'],
      ['专属 · 定金首款已到账', '价格已冻结，不受影响'],
      ['通用链接', '马上按新价卖，不用保存；编辑页不提示'],
      ['已付、支付中的订单', '按订单快照，不变'],
    ],
    jumps: [
      { label: '专属全款 PL-FULL-WAIT · 编辑页', to: editPersonal('PL-FULL-WAIT') },
      { label: '专属定金首款前 PL-DEP-NEW · 编辑页', to: editPersonal('PL-DEP-NEW') },
      { label: '专属定金首款已到账 PL-DEP-READY · 编辑页', to: editPersonal('PL-DEP-READY') },
      { label: '通用链接 PL-OPEN-KR · C 端', to: page('PL-OPEN-KR') },
    ],
  },
  {
    id: 'sku_off',
    group: 'SKU 目录',
    title: 'SKU 下架（越南 Pro Quarterly）',
    change: 'SKU 目录里越南 Pro Quarterly 改为下架，渠道方案里随之不再出现。',
    effects: [
      ['专属 · 全款', '不保存照常可买，按快照价和权益开通；CC 保存后这个 SKU 从链接里去掉'],
      ['专属 · 定金首款前', '保存也保留原快照，编辑页提示「该 SKU 已下架，价格保持原快照」'],
      ['专属 · 定金首款已到账', '不受影响，照常付尾款'],
      ['通用链接', '本例无越南通用链接；SKU 下架时 C 端是否同样消失，待罗老师确认'],
    ],
    jumps: [
      { label: '专属全款 PL-FULL-BANK · 编辑页', to: editPersonal('PL-FULL-BANK') },
      { label: '专属定金首款前 PL-DEP-NEW · 编辑页', to: editPersonal('PL-DEP-NEW') },
      { label: '专属全款 PL-FULL-BANK · C 端', to: page('PL-FULL-BANK') },
    ],
  },
  {
    id: 'promo_rate',
    group: '渠道价格方案',
    title: '优惠力度调整（10% → 20%）',
    change: '各渠道方案里 Pro Quarterly 的「Percent off 10」改成 20。',
    effects: [
      ['专属 · 全款 / 定金首款前', '不保存仍按原快照优惠；保存后按新优惠'],
      ['专属 · 定金首款已到账', '价格已冻结，不受影响'],
      ['通用链接', '马上按新优惠卖，不用保存'],
    ],
    jumps: [
      { label: '专属全款 PL-FULL-WAIT · 编辑页', to: editPersonal('PL-FULL-WAIT') },
      { label: '通用链接 PL-OPEN-KR · C 端', to: page('PL-OPEN-KR') },
      { label: '通用链接 PL-OPEN-KR · 编辑页（不提示改价）', to: editOpen('PL-OPEN-KR') },
    ],
  },
  {
    id: 'plan_add',
    group: '渠道价格方案',
    title: '渠道新加 SKU（展会渠道加 Pro Yearly）',
    change: '韩国展会渠道的方案 CSP-KR-EXPO 新加 Pro Yearly（减 50,000 KRW）。',
    effects: [
      ['专属链接', '链接里没有；全款保存后加进链接，定金只有 1 个 SKU 不变'],
      ['通用链接', '链接里没有，C 端不显示；编辑页提示「渠道新增了 SKU，保存后加入这条链接」，保存后才出现'],
    ],
    jumps: [
      { label: '通用链接 PL-OPEN-KR · 编辑页', to: editOpen('PL-OPEN-KR') },
      { label: '通用链接 PL-OPEN-KR · C 端', to: page('PL-OPEN-KR') },
    ],
  },
  {
    id: 'plan_remove',
    group: '渠道价格方案',
    title: '渠道去掉 SKU（Max 6 Months）',
    change: '所有渠道方案去掉 Max 6 Months（韩国、越南）。',
    effects: [
      ['专属 · 全款', '不保存照常可买，按快照价；CC 保存后从链接里去掉'],
      ['专属 · 定金', '首款前保存也保留原快照并提示；首款后不受影响'],
      ['通用链接', '马上从 C 端消失，不用保存；CRM 仍可按历史快照回显'],
    ],
    jumps: [
      { label: '专属全款 PL-FULL-WAIT · C 端（仍可买）', to: page('PL-FULL-WAIT') },
      { label: '专属全款 PL-FULL-WAIT · 编辑页', to: editPersonal('PL-FULL-WAIT') },
      { label: '通用链接 PL-OPEN-KR · C 端（已消失）', to: page('PL-OPEN-KR') },
    ],
  },
  {
    id: 'promo_off',
    group: '渠道价格方案',
    title: '取消优惠（方案不再带优惠码）',
    change: '各渠道方案的优惠码清空，所有 SKU 回到原价。',
    effects: [
      ['专属 · 全款 / 定金首款前', '不保存仍按原快照优惠；编辑页「是否使用优惠」只剩「全部原价」，保存后按原价'],
      ['专属 · 定金首款已到账', '不受影响'],
      ['通用链接', '马上按原价卖，不用保存'],
    ],
    jumps: [
      { label: '专属全款 PL-FULL-WAIT · 编辑页', to: editPersonal('PL-FULL-WAIT') },
      { label: '通用链接 PL-OPEN-KR · C 端', to: page('PL-OPEN-KR') },
    ],
  },
  {
    id: 'plan_switch',
    group: '渠道价格方案',
    title: '渠道换了另一套价格方案（方案 ID 变了）',
    change: 'Amy Zhang（韩国）、Linh Nguyen（越南）两个渠道停用原方案，启用新方案 CSP-AMY-V2 / CSP-LINH-V2（规则相同，只是 ID 变了）。',
    effects: [
      ['专属 · 全款 / 定金首款前', '编辑页报错「渠道已更换价格方案，这条链接不能更新价格，请新建链接」，保存按钮置灰；不新建的话仍按原快照卖'],
      ['专属 · 定金首款已到账', '不受影响，保存只更新支付方式和有效期'],
      ['通用链接', '本例未模拟（展会渠道方案没换）；通用链接换方案 ID 怎么处理，待罗老师确认'],
    ],
    jumps: [
      { label: '专属全款 PL-FULL-WAIT · 编辑页', to: editPersonal('PL-FULL-WAIT') },
      { label: '专属定金首款前 PL-DEP-NEW · 编辑页', to: editPersonal('PL-DEP-NEW') },
      { label: '专属定金首款已到账 PL-DEP-READY · 编辑页', to: editPersonal('PL-DEP-READY') },
    ],
  },
  {
    id: 'method_off',
    group: '支付方式',
    title: '支付方式全局下架（Kakao Pay）',
    change: '支付配置里韩国的 Kakao Pay 全局下架。',
    effects: [
      ['专属链接', '实时生效，不用保存：C 端不再显示 Kakao Pay'],
      ['通用链接', '同上，实时不显示'],
      ['CRM 新建 / 编辑', 'Kakao Pay 不出现，不能再勾'],
    ],
    jumps: [
      { label: '专属全款 PL-FULL-WAIT · C 端', to: page('PL-FULL-WAIT') },
      { label: '通用链接 PL-OPEN-KR · C 端', to: page('PL-OPEN-KR') },
    ],
  },
]

export default function UpstreamSimulator({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [on, setOn] = useState<UpstreamId[]>(() => upstreamOn())

  const apply = (next: UpstreamId[], to?: string) => {
    setUpstream(next)
    setOn(next)
    if (to) navigate(to)
    window.location.reload()
  }
  const toggle = (id: UpstreamId, value: boolean) => apply(value ? [...on, id] : on.filter((item) => item !== id))
  const groups = Array.from(new Set(SCENARIOS.map((item) => item.group)))

  return (
    <>
      <Badge count={on.length} size="small" offset={[-4, 4]}>
        <Button
          type={on.length ? 'primary' : 'default'}
          ghost={!!on.length}
          size={compact ? 'small' : 'middle'}
          icon={<ExperimentOutlined />}
          onClick={() => setOpen(true)}
        >
          上游变更模拟
        </Button>
      </Badge>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        width={compact ? 'min(520px, 100vw)' : 520}
        title={<>上游变更模拟 <Tag color="orange" bordered={false}>仅评审用</Tag></>}
        extra={<Button size="small" disabled={!on.length} onClick={() => apply([])}>全部还原</Button>}
      >
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          模拟上游（SKU 目录、渠道价格方案、支付配置）改了之后，已发出的专属链接和通用链接怎么变。打开开关后页面会刷新，可以叠加多个；点下面的链接直接去看对应页面。只改浏览器里的演示数据，不影响别人。
        </Typography.Paragraph>
        {groups.map((group) => (
          <div key={group} style={{ marginBottom: 20 }}>
            <Typography.Title level={5} style={{ marginBottom: 8 }}>{group}</Typography.Title>
            {SCENARIOS.filter((item) => item.group === group).map((item) => {
              const active = on.includes(item.id)
              return (
                <div
                  key={item.id}
                  style={{
                    border: `1px solid ${active ? '#91caff' : '#f0f0f0'}`,
                    background: active ? '#f0f7ff' : '#fff',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <Typography.Text strong>{item.title}</Typography.Text>
                    <Switch size="small" checked={active} onChange={(value) => toggle(item.id, value)} />
                  </div>
                  <Typography.Paragraph type="secondary" style={{ margin: '6px 0 8px', fontSize: 13 }}>{item.change}</Typography.Paragraph>
                  <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                    {item.effects.map(([who, what]) => (
                      <div key={who}><Typography.Text strong style={{ fontSize: 13 }}>{who}：</Typography.Text>{what}</div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {item.jumps.map((jump) => (
                      <Button
                        key={jump.to}
                        size="small"
                        type="link"
                        style={{ padding: 0, height: 'auto' }}
                        onClick={() => (active ? (navigate(jump.to), setOpen(false)) : apply([...on, item.id], jump.to))}
                      >
                        {jump.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </Drawer>
    </>
  )
}
