/** Reads the marketing-center prototype catalog (same localStorage the demo page writes). */

export const MARKETING_STORE_KEY = 'dino-marketing-demo-v2'

export type CatalogSku = {
  id: string
  productCode?: string
  name: string
  line: string
  price: string
  memberLevel?: string
  valid?: string
  status?: string
}

export type CatalogChannel = {
  id: string
  name: string
  line: string
  channelCode?: string
  type?: string
  enabled?: boolean
}

export type CatalogRule = { skuId: string; mode: string; value: string }

export type CatalogPlan = {
  id: string
  channelId: string
  rules?: CatalogRule[]
  promoCode?: string
  status?: string
}

export type PricedSku = {
  sku: CatalogSku
  currency: string
  original: number
}

export type PromoOption = {
  code: string
  channelName: string
  planId: string
  mode: string
  value: string
  finalPrice: number
  label: string
}

const SEED_SKUS: CatalogSku[] = [
  { id: 'KR-Q-2026', productCode: 'web-kr-pro-1q', name: 'Dino English 季度包', line: '韩国', price: '99,000 KRW', memberLevel: 'PRO', valid: '购买后 90 天', status: '上架' },
  { id: 'KR-H-2026', productCode: 'web-kr-max-6m', name: 'Dino English 半年包', line: '韩国', price: '178,000 KRW', memberLevel: 'PRO_MAX', valid: '购买后 180 天', status: '上架' },
  { id: 'KR-Y-2026', productCode: 'web-kr-pro-1y', name: 'Dino English 年度包', line: '韩国', price: '298,000 KRW', memberLevel: 'PRO', valid: '购买后 365 天', status: '上架' },
  { id: 'VN-Q-2026', productCode: 'web-vn-pro-1q', name: 'Dino English 季度包', line: '越南', price: '990,000 VND', memberLevel: 'PRO', valid: '购买后 90 天', status: '上架' },
  { id: 'VN-H-2026', productCode: 'web-vn-pro-6m', name: 'Dino English 半年包', line: '越南', price: '1,790,000 VND', memberLevel: 'PRO', valid: '购买后 180 天', status: '上架' },
  { id: 'VN-Y-2026', productCode: 'web-vn-pro-1y', name: 'Dino English 年度包', line: '越南', price: '2,990,000 VND', memberLevel: 'PRO', valid: '购买后 365 天', status: '上架' },
]

const SEED_CHANNELS: CatalogChannel[] = [
  { id: 'sales_amy_zhang', name: 'Amy Zhang', line: '韩国', channelCode: 'CH-KR-0001', type: '销售', enabled: true },
  { id: 'kol_jisu_mom', name: '@jisu_mom', line: '韩国', channelCode: 'CH-KR-0002', type: 'KOL', enabled: true },
  { id: 'ad_kr_meta', name: '韩国 Meta 开学季投放', line: '韩国', channelCode: 'CH-KR-0003', type: '广告投放', enabled: true },
  { id: 'sales_linh_nguyen', name: 'Linh Nguyen', line: '越南', channelCode: 'CH-VN-0005', type: '销售', enabled: true },
  { id: 'ad_vn_meta', name: '越南 Meta 中秋投放', line: '越南', channelCode: 'CH-VN-0007', type: '广告投放', enabled: true },
]

const SEED_PLANS: CatalogPlan[] = [
  { id: 'CSP-AMY', channelId: 'sales_amy_zhang', promoCode: 'CSP-AMY-PROMO', status: '生效中', rules: [{ skuId: 'KR-Q-2026', mode: '折扣', value: '10' }, { skuId: 'KR-H-2026', mode: '原价售卖', value: '' }, { skuId: 'KR-Y-2026', mode: '立减', value: '50000' }] },
  { id: 'CSP-JISU', channelId: 'kol_jisu_mom', promoCode: 'CSP-JISU-PROMO', status: '生效中', rules: [{ skuId: 'KR-Q-2026', mode: '折扣', value: '10' }, { skuId: 'KR-H-2026', mode: '折扣', value: '15' }] },
  { id: 'CSP-KR-META', channelId: 'ad_kr_meta', promoCode: 'CSP-KR-META-PROMO', status: '生效中', rules: [{ skuId: 'KR-Y-2026', mode: '立减', value: '59600' }, { skuId: 'KR-H-2026', mode: '折扣', value: '10' }] },
  { id: 'CSP-LINH', channelId: 'sales_linh_nguyen', promoCode: 'CSP-LINH-PROMO', status: '生效中', rules: [{ skuId: 'VN-Q-2026', mode: '折扣', value: '10' }, { skuId: 'VN-H-2026', mode: '原价售卖', value: '' }] },
  { id: 'CSP-VN-META', channelId: 'ad_vn_meta', promoCode: 'CSP-VN-META-PROMO', status: '生效中', rules: [{ skuId: 'VN-Y-2026', mode: '立减', value: '500000' }, { skuId: 'VN-Q-2026', mode: '折扣', value: '10' }] },
]

export const PAY_HOST: Record<string, string> = {
  韩国: 'kr.dinoai.ai',
  越南: 'vn.dinoai.ai',
  马来: 'ma.dinoai.ai',
  沙特: 'sa.dinoai.ai',
  日本: 'jp.dinoai.ai',
  印尼: 'id.dinoai.ai',
  泰国: 'th.dinoai.ai',
  新加坡: 'sg.dinoai.ai',
}

export function parseSkuPrice(price: string): { value: number; currency: string } {
  const matched = String(price).replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([A-Za-z]{3})?/)
  return {
    value: matched ? Number(matched[1]) : 0,
    currency: (matched?.[2] || '').toUpperCase(),
  }
}

/** Same rule as the marketing-center demo: 折扣 subtracts n% of list price; 立减 subtracts n. */
export function applyRule(original: number, mode: string, value: string): number {
  if (mode === '原价售卖' || !mode) return original
  const n = Number(value || 0)
  const discount = mode === '折扣' ? (original * n) / 100 : n
  return Math.max(0, Math.round(original - discount))
}

export function ruleLabel(mode: string, value: string, currency: string): string {
  if (mode === '原价售卖' || !mode) return '原价'
  if (mode === '折扣') return `折扣 ${value}%`
  return `立减 ${Number(value || 0).toLocaleString('en-US')} ${currency}`
}

export function formatMoney(amount: number, currency: string): string {
  return `${Math.round(amount).toLocaleString('en-US')} ${currency}`.trim()
}

export function loadMarketingCatalog(): { skus: CatalogSku[]; channels: CatalogChannel[]; plans: CatalogPlan[] } {
  let saved: { skus?: CatalogSku[]; distributors?: CatalogChannel[]; channelSkuPlans?: CatalogPlan[] } | null = null
  try {
    saved = JSON.parse(localStorage.getItem(MARKETING_STORE_KEY) || 'null')
  } catch {
    saved = null
  }
  const skus = Array.isArray(saved?.skus) && saved.skus.length ? saved.skus : SEED_SKUS
  const channels = Array.isArray(saved?.distributors) && saved.distributors.length ? saved.distributors : SEED_CHANNELS
  const plans = Array.isArray(saved?.channelSkuPlans) && saved.channelSkuPlans.length ? saved.channelSkuPlans : SEED_PLANS
  return {
    skus: skus.filter((sku) => sku.status !== '下架'),
    channels,
    plans,
  }
}

export function pricedSku(sku: CatalogSku): PricedSku {
  const parsed = parseSkuPrice(sku.price)
  return { sku, currency: parsed.currency, original: parsed.value }
}

export function promosForSku(sku: CatalogSku, plans: CatalogPlan[], channels: CatalogChannel[]): PromoOption[] {
  const priced = pricedSku(sku)
  const options: PromoOption[] = []
  for (const plan of plans) {
    if (plan.status && plan.status !== '生效中') continue
    if (!plan.promoCode) continue
    const channel = channels.find((item) => item.id === plan.channelId)
    if (!channel || channel.line !== sku.line || channel.enabled === false) continue
    const rule = (plan.rules || []).find((item) => item.skuId === sku.id)
    if (!rule || rule.mode === '原价售卖') continue
    const finalPrice = applyRule(priced.original, rule.mode, rule.value)
    options.push({
      code: plan.promoCode,
      channelName: channel.name,
      planId: plan.id,
      mode: rule.mode,
      value: rule.value,
      finalPrice,
      label: `${plan.promoCode} · ${channel.name} · ${ruleLabel(rule.mode, rule.value, priced.currency)} → ${formatMoney(finalPrice, priced.currency)}`,
    })
  }
  return options
}

export function linesInCatalog(skus: CatalogSku[]): string[] {
  const seen: string[] = []
  for (const sku of skus) {
    if (sku.line && !seen.includes(sku.line)) seen.push(sku.line)
  }
  return seen
}
