/** Reads the marketing-center prototype catalog (same localStorage the demo page writes). */

export const MARKETING_STORE_KEY = 'dino-marketing-demo-v3'

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
  { id: 'KR-Q-2026', productCode: 'web-kr-pro-1q', name: 'Pro Quarterly', line: 'Korea', price: '99,000 KRW', memberLevel: 'PRO', valid: '90 days after purchase', status: 'Active' },
  { id: 'KR-H-2026', productCode: 'web-kr-max-6m', name: 'Max 6 Months', line: 'Korea', price: '178,000 KRW', memberLevel: 'MAX', valid: '180 days after purchase', status: 'Active' },
  { id: 'KR-Y-2026', productCode: 'web-kr-pro-1y', name: 'Pro Yearly', line: 'Korea', price: '298,000 KRW', memberLevel: 'PRO', valid: '365 days after purchase', status: 'Active' },
  { id: 'KR-MY-2026', productCode: 'web-kr-max-1y', name: 'Max Yearly', line: 'Korea', price: '398,000 KRW', memberLevel: 'MAX', valid: '365 days after purchase', status: 'Active' },
  { id: 'VN-Q-2026', productCode: 'web-vn-pro-1q', name: 'Pro Quarterly', line: 'Vietnam', price: '990,000 VND', memberLevel: 'PRO', valid: '90 days after purchase', status: 'Active' },
  { id: 'VN-H-2026', productCode: 'web-vn-max-6m', name: 'Max 6 Months', line: 'Vietnam', price: '1,790,000 VND', memberLevel: 'MAX', valid: '180 days after purchase', status: 'Active' },
  { id: 'VN-Y-2026', productCode: 'web-vn-pro-1y', name: 'Pro Yearly', line: 'Vietnam', price: '2,990,000 VND', memberLevel: 'PRO', valid: '365 days after purchase', status: 'Active' },
  { id: 'VN-MY-2026', productCode: 'web-vn-max-1y', name: 'Max Yearly', line: 'Vietnam', price: '3,990,000 VND', memberLevel: 'MAX', valid: '365 days after purchase', status: 'Active' },
]

const SEED_CHANNELS: CatalogChannel[] = [
  { id: 'sales_amy_zhang', name: 'Amy Zhang', line: 'Korea', channelCode: 'CH-KR-0001', type: 'Sales', enabled: true },
  { id: 'kol_jisu_mom', name: '@jisu_mom', line: 'Korea', channelCode: 'CH-KR-0002', type: 'KOL', enabled: true },
  { id: 'ad_kr_meta', name: 'Korea Meta Back to School', line: 'Korea', channelCode: 'CH-KR-0003', type: 'Ads', enabled: true },
  { id: 'sales_linh_nguyen', name: 'Linh Nguyen', line: 'Vietnam', channelCode: 'CH-VN-0005', type: 'Sales', enabled: true },
  { id: 'ad_vn_meta', name: 'Vietnam Meta Mid-Autumn', line: 'Vietnam', channelCode: 'CH-VN-0007', type: 'Ads', enabled: true },
]

const SEED_PLANS: CatalogPlan[] = [
  { id: 'CSP-AMY', channelId: 'sales_amy_zhang', promoCode: 'CSP-AMY-PROMO', status: 'Active', rules: [{ skuId: 'KR-Q-2026', mode: 'Percent off', value: '10' }, { skuId: 'KR-H-2026', mode: 'List price', value: '' }, { skuId: 'KR-Y-2026', mode: 'Amount off', value: '50000' }, { skuId: 'KR-MY-2026', mode: 'Percent off', value: '15' }] },
  { id: 'CSP-JISU', channelId: 'kol_jisu_mom', promoCode: 'CSP-JISU-PROMO', status: 'Active', rules: [{ skuId: 'KR-Q-2026', mode: 'Percent off', value: '10' }, { skuId: 'KR-H-2026', mode: 'Percent off', value: '15' }] },
  { id: 'CSP-KR-META', channelId: 'ad_kr_meta', promoCode: 'CSP-KR-META-PROMO', status: 'Active', rules: [{ skuId: 'KR-Y-2026', mode: 'Amount off', value: '59600' }, { skuId: 'KR-H-2026', mode: 'Percent off', value: '10' }] },
  { id: 'CSP-LINH', channelId: 'sales_linh_nguyen', promoCode: 'CSP-LINH-PROMO', status: 'Active', rules: [{ skuId: 'VN-Q-2026', mode: 'Percent off', value: '10' }, { skuId: 'VN-H-2026', mode: 'List price', value: '' }, { skuId: 'VN-Y-2026', mode: 'Percent off', value: '15' }, { skuId: 'VN-MY-2026', mode: 'Amount off', value: '500000' }] },
  { id: 'CSP-VN-META', channelId: 'ad_vn_meta', promoCode: 'CSP-VN-META-PROMO', status: 'Active', rules: [{ skuId: 'VN-Y-2026', mode: 'Amount off', value: '500000' }, { skuId: 'VN-Q-2026', mode: 'Percent off', value: '10' }] },
]

export const PAY_HOST: Record<string, string> = {
  Korea: 'kr.dinoai.ai',
  Vietnam: 'vn.dinoai.ai',
  Malaysia: 'ma.dinoai.ai',
  'Saudi Arabia': 'sa.dinoai.ai',
  Japan: 'jp.dinoai.ai',
  Indonesia: 'id.dinoai.ai',
  Thailand: 'th.dinoai.ai',
  Singapore: 'sg.dinoai.ai',
}

export function parseSkuPrice(price: string): { value: number; currency: string } {
  const matched = String(price).replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([A-Za-z]{3})?/)
  return {
    value: matched ? Number(matched[1]) : 0,
    currency: (matched?.[2] || '').toUpperCase(),
  }
}

/** Percent off subtracts n% of list price. Amount off subtracts n. */
export function applyRule(original: number, mode: string, value: string): number {
  if (mode === 'List price' || mode === '原价售卖' || !mode) return original
  const n = Number(value || 0)
  const discount = mode === 'Percent off' || mode === '折扣' ? (original * n) / 100 : n
  return Math.max(0, Math.round(original - discount))
}

export function ruleLabel(mode: string, value: string, currency: string): string {
  if (mode === 'List price' || mode === '原价售卖' || !mode) return 'List price'
  if (mode === 'Percent off' || mode === '折扣') return `${value}% off`
  return `Amount off ${Number(value || 0).toLocaleString('en-US')} ${currency}`
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
  const savedSkus = Array.isArray(saved?.skus) ? saved.skus : []
  const skus = savedSkus.length
    ? [...savedSkus, ...SEED_SKUS.filter((sku) => !savedSkus.some((item) => item.id === sku.id))]
    : SEED_SKUS
  const channels = Array.isArray(saved?.distributors) && saved.distributors.length ? saved.distributors : SEED_CHANNELS
  const savedPlans = Array.isArray(saved?.channelSkuPlans) ? saved.channelSkuPlans : []
  const savedHasMax = savedPlans.some((plan) => (plan.rules || []).some((rule) => memberTier(skus.find((sku) => sku.id === rule.skuId)?.memberLevel) === 'Max'))
  const plans = savedPlans.length && savedHasMax ? savedPlans : SEED_PLANS
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
    if (plan.status && plan.status !== 'Active' && plan.status !== '生效中') continue
    if (!plan.promoCode) continue
    const channel = channels.find((item) => item.id === plan.channelId)
    if (!channel || channel.line !== sku.line || channel.enabled === false) continue
    const rule = (plan.rules || []).find((item) => item.skuId === sku.id)
    if (!rule || rule.mode === 'List price' || rule.mode === '原价售卖') continue
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

export type LinkOffer = {
  skuId: string
  skuName: string
  memberLevel: 'Pro' | 'Max'
  listPrice: number
  payable: number
  currency: string
  ruleLabel: string
}

export function memberTier(level?: string): 'Pro' | 'Max' {
  const value = (level || '').toUpperCase()
  return value === 'MAX' || value === 'PRO_MAX' ? 'Max' : 'Pro'
}

export function offersOnPlan(plan: CatalogPlan | undefined, skus: CatalogSku[]): LinkOffer[] {
  if (!plan) return []
  return (plan.rules || []).flatMap((rule) => {
    const sku = skus.find((item) => item.id === rule.skuId)
    if (!sku) return []
    const priced = pricedSku(sku)
    const discounted = rule.mode !== 'List price' && rule.mode !== '原价售卖'
    return [{
      skuId: sku.id,
      skuName: sku.name,
      memberLevel: memberTier(sku.memberLevel),
      listPrice: priced.original,
      payable: discounted ? applyRule(priced.original, rule.mode, rule.value) : priced.original,
      currency: priced.currency,
      ruleLabel: discounted ? ruleLabel(rule.mode, rule.value, priced.currency) : 'List price',
    }]
  })
}

export function channelsOnLine(line: string, channels: CatalogChannel[], plans: CatalogPlan[]) {
  return channels
    .filter((channel) => channel.line === line && channel.enabled !== false)
    .map((channel) => ({
      channel,
      plan: plans.find((plan) => plan.channelId === channel.id && (!plan.status || plan.status === 'Active' || plan.status === '生效中')),
    }))
    .sort((a, b) => Number(a.channel.type !== 'Sales' && a.channel.type !== '销售') - Number(b.channel.type !== 'Sales' && b.channel.type !== '销售'))
}

export function linesInCatalog(skus: CatalogSku[], channels: CatalogChannel[] = []): string[] {
  const seen: string[] = []
  for (const name of [...channels.map((item) => item.line), ...skus.map((item) => item.line)]) {
    if (name && !seen.includes(name)) seen.push(name)
  }
  return seen
}
