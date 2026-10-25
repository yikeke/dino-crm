/** Local payment methods already live on each business line's checkout. */

export type PayMethod = {
  code: string
  name: string
  icon: string
  minAmount?: number
}

export type PayCopy = {
  title: string
  discount: string
  total: string
  choose: string
  pay: string
  cancel: string
  terms: string
  privacy: string
  first: string
  balance: string
  packageDue: string
  installment: string
  dir: 'ltr' | 'rtl'
}

const icon = (file: string) => `${import.meta.env.BASE_URL}pay/${file}`

export const LINE_PAY_METHODS: Record<string, PayMethod[]> = {
  韩国: [
    { code: 'card', name: 'Card', icon: icon('pay-card-my.png') },
    { code: 'kakaopay', name: 'Kakao Pay', icon: icon('pay-kakao.png') },
  ],
  马来: [
    { code: 'fpx', name: 'FPX', icon: icon('pay-fpx.png') },
    { code: 'card', name: 'Card', icon: icon('pay-card-my.png') },
    { code: 'atome', name: 'Atome', icon: icon('pay-atome.png') },
    { code: 'grabpay', name: 'GrabPay', icon: icon('pay-grab.png') },
    { code: 'tng', name: "Touch 'n Go", icon: icon('pay-tng.png') },
    { code: 'boost', name: 'Boost', icon: icon('pay-boost.png') },
    { code: 'spaylater', name: 'SPayLater', icon: icon('pay-spaylater.jpg') },
  ],
  沙特: [
    { code: 'mada', name: 'mada', icon: icon('pay-mada.png') },
    { code: 'card', name: 'Card', icon: icon('pay-card-my.png') },
    { code: 'stcpay', name: 'STC Pay', icon: icon('pay-stc.png') },
    { code: 'tamara', name: 'Tamara', icon: icon('pay-tamara.png') },
    { code: 'tabby', name: 'Tabby', icon: icon('pay-tabby.png') },
  ],
  越南: [
    { code: 'vietqr', name: 'VietQR', icon: icon('pay-vietqr.png') },
    { code: 'bank_transfer', name: 'Chuyển khoản', icon: icon('pay-bank.png') },
    { code: 'card', name: 'Visa / Mastercard', icon: icon('pay-card-my.png') },
    { code: 'momo', name: 'MoMo', icon: icon('pay-momo.png') },
    { code: 'onepay_installment', name: 'Trả góp qua OnePay', icon: icon('pay-onepay-installment.png'), minAmount: 3000000 },
  ],
  泰国: [
    { code: 'KPLUS', name: 'K PLUS', icon: icon('pay-kplus.png') },
  ],
  新加坡: [
    { code: 'PAYNOW', name: 'PayNow', icon: icon('pay-paynow.png') },
  ],
  印尼: [
    { code: 'card', name: 'Card', icon: icon('pay-card-my.png') },
  ],
}

const COPY: Record<string, PayCopy> = {
  韩国: {
    title: '결제', discount: '할인', total: '합계', choose: '결제 수단 선택', pay: '결제하기',
    cancel: '언제든 취소 가능 · ', terms: '이용약관', privacy: '개인정보 처리방침',
    first: '계약금', balance: '잔금', packageDue: '패키지 결제금액', installment: '', dir: 'ltr',
  },
  越南: {
    title: 'Thanh toán', discount: 'Giảm giá', total: 'Tổng cộng', choose: 'Chọn phương thức thanh toán', pay: 'Thanh toán ngay',
    cancel: 'Hủy bất cứ lúc nào · ', terms: 'Điều khoản dịch vụ', privacy: 'Chính sách bảo mật',
    first: 'Đặt cọc', balance: 'Thanh toán phần còn lại', packageDue: 'Giá gói', installment: 'Thanh toán trả góp cần từ 3.000.000 đồng trở lên.', dir: 'ltr',
  },
  马来: {
    title: 'Pembayaran', discount: 'Diskaun', total: 'Jumlah', choose: 'Pilih kaedah pembayaran', pay: 'Bayar sekarang',
    cancel: 'Batal bila-bila masa · ', terms: 'Terma Perkhidmatan', privacy: 'Dasar Privasi',
    first: 'Deposit', balance: 'Baki', packageDue: 'Harga pakej', installment: '', dir: 'ltr',
  },
  沙特: {
    title: 'الدفع', discount: 'الخصم', total: 'الإجمالي', choose: 'اختر طريقة الدفع', pay: 'ادفع الآن',
    cancel: 'يمكن الإلغاء في أي وقت · ', terms: 'شروط الخدمة', privacy: 'سياسة الخصوصية',
    first: 'الدفعة الأولى', balance: 'الدفعة المتبقية', packageDue: 'سعر الباقة', installment: '', dir: 'rtl',
  },
  泰国: {
    title: 'ชำระเงิน', discount: 'ส่วนลด', total: 'ยอดรวม', choose: 'เลือกวิธีชำระเงิน', pay: 'ชำระเงินตอนนี้',
    cancel: 'ยกเลิกได้ทุกเมื่อ · ', terms: 'ข้อกำหนดการให้บริการ', privacy: 'นโยบายความเป็นส่วนตัว',
    first: 'มัดจำ', balance: 'ยอดคงเหลือ', packageDue: 'ราคาแพ็กเกจ', installment: '', dir: 'ltr',
  },
  印尼: {
    title: 'Pembayaran', discount: 'Diskon', total: 'Total', choose: 'Pilih metode pembayaran', pay: 'Bayar sekarang',
    cancel: 'Batalkan kapan saja · ', terms: 'Ketentuan Layanan', privacy: 'Kebijakan Privasi',
    first: 'Uang muka', balance: 'Sisa pembayaran', packageDue: 'Harga paket', installment: '', dir: 'ltr',
  },
}

const EN: PayCopy = {
  title: 'Payment', discount: 'Discount', total: 'Total', choose: 'Choose Payment Method', pay: 'Pay now',
  cancel: 'Cancel anytime · ', terms: 'Terms of Service', privacy: 'Privacy Policy',
  first: 'Deposit', balance: 'Balance', packageDue: 'Package price', installment: '', dir: 'ltr',
}

export function methodsForLine(line: string): PayMethod[] {
  return LINE_PAY_METHODS[line] || [{ code: 'card', name: 'Card', icon: icon('pay-card-my.png') }]
}

export function payCopy(line: string): PayCopy {
  return COPY[line] || EN
}

export function findMethods(line: string, codes: string[]): PayMethod[] {
  const catalog = methodsForLine(line)
  const picked = codes.map((code) => catalog.find((item) => item.code === code)).filter((item): item is PayMethod => !!item)
  return picked.length ? picked : catalog
}
