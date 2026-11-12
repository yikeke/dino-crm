import { Tag } from 'antd'
import type { Order } from '../types'
import { useI18n } from '../i18n'
import { orderSourceOf } from '../paymentLinkStore'

export default function OrderSourceTag({ order }: { order: Pick<Order, 'orderSource' | 'payMethod' | 'paymentLinkType'> }) {
  const { lang } = useI18n()
  const en = lang === 'en'
  const source = orderSourceOf(order)
  if (source === 'APP') return <Tag>App</Tag>
  if (source === 'LANDING_PAGE') return <Tag color="blue">Landing Page</Tag>
  const kind = order.paymentLinkType === 'OPEN' ? (en ? 'Open' : '通用') : (en ? 'Personal' : '专属')
  return <Tag color="purple">Payment Link · {kind}</Tag>
}
