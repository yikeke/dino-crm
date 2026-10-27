/** Local payment methods already live on each business line's checkout. */

export type PayMethod = {
  code: string
  name: string
  icon: string
  /** redirect leaves this page for the provider; manual stays and shows the transfer form. */
  kind: 'redirect' | 'manual'
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
  forLink: string
  chooseSku: string
  dir: 'ltr' | 'rtl'
}

const icon = (file: string) => `${import.meta.env.BASE_URL}pay/${file}`

export const LINE_PAY_METHODS: Record<string, PayMethod[]> = {
  Korea: [
    { code: 'card', name: 'Card', icon: icon('pay-card-my.png'), kind: 'redirect' },
    { code: 'kakaopay', name: 'Kakao Pay', icon: icon('pay-kakao.png'), kind: 'redirect' },
  ],
  Malaysia: [
    { code: 'fpx', name: 'FPX', icon: icon('pay-fpx.png'), kind: 'redirect' },
    { code: 'card', name: 'Card', icon: icon('pay-card-my.png'), kind: 'redirect' },
    { code: 'atome', name: 'Atome', icon: icon('pay-atome.png'), kind: 'redirect' },
    { code: 'grabpay', name: 'GrabPay', icon: icon('pay-grab.png'), kind: 'redirect' },
    { code: 'tng', name: "Touch 'n Go", icon: icon('pay-tng.png'), kind: 'redirect' },
    { code: 'boost', name: 'Boost', icon: icon('pay-boost.png'), kind: 'redirect' },
    { code: 'spaylater', name: 'SPayLater', icon: icon('pay-spaylater.jpg'), kind: 'redirect' },
  ],
  'Saudi Arabia': [
    { code: 'mada', name: 'mada', icon: icon('pay-mada.png'), kind: 'redirect' },
    { code: 'card', name: 'Card', icon: icon('pay-card-my.png'), kind: 'redirect' },
    { code: 'stcpay', name: 'STC Pay', icon: icon('pay-stc.png'), kind: 'redirect' },
    { code: 'tamara', name: 'Tamara', icon: icon('pay-tamara.png'), kind: 'redirect' },
    { code: 'tabby', name: 'Tabby', icon: icon('pay-tabby.png'), kind: 'redirect' },
  ],
  Vietnam: [
    { code: 'vietqr', name: 'VietQR', icon: icon('pay-vietqr.png'), kind: 'redirect' },
    { code: 'bank_transfer', name: 'Chuyển khoản', icon: icon('pay-bank.png'), kind: 'manual' },
    { code: 'card', name: 'Visa / Mastercard', icon: icon('pay-card-my.png'), kind: 'redirect' },
    { code: 'momo', name: 'MoMo', icon: icon('pay-momo.png'), kind: 'redirect' },
    { code: 'onepay_installment', name: 'Trả góp qua OnePay', icon: icon('pay-onepay-installment.png'), kind: 'redirect', minAmount: 3000000 },
  ],
  Thailand: [
    { code: 'KPLUS', name: 'K PLUS', icon: icon('pay-kplus.png'), kind: 'redirect' },
  ],
  Singapore: [
    { code: 'PAYNOW', name: 'PayNow', icon: icon('pay-paynow.png'), kind: 'redirect' },
  ],
  Indonesia: [
    { code: 'card', name: 'Card', icon: icon('pay-card-my.png'), kind: 'redirect' },
  ],
}

const COPY: Record<string, PayCopy> = {
  Korea: {
    title: '결제', discount: '할인', total: '합계', choose: '결제 수단 선택', pay: '결제하기',
    cancel: '언제든 취소 가능 · ', terms: '이용약관', privacy: '개인정보 처리방침',
    first: '계약금', balance: '잔금', packageDue: '패키지 결제금액', installment: '', forLink: '이 결제 링크의 고객', chooseSku: '패키지 선택', dir: 'ltr',
  },
  Vietnam: {
    title: 'Thanh toán', discount: 'Giảm giá', total: 'Tổng cộng', choose: 'Chọn phương thức thanh toán', pay: 'Thanh toán ngay',
    cancel: 'Hủy bất cứ lúc nào · ', terms: 'Điều khoản dịch vụ', privacy: 'Chính sách bảo mật',
    first: 'Đặt cọc', balance: 'Thanh toán phần còn lại', packageDue: 'Giá gói', installment: 'Thanh toán trả góp cần từ 3.000.000 đồng trở lên.', forLink: 'Liên kết thanh toán của', chooseSku: 'Chọn gói', dir: 'ltr',
  },
  Malaysia: {
    title: 'Pembayaran', discount: 'Diskaun', total: 'Jumlah', choose: 'Pilih kaedah pembayaran', pay: 'Bayar sekarang',
    cancel: 'Batal bila-bila masa · ', terms: 'Terma Perkhidmatan', privacy: 'Dasar Privasi',
    first: 'Deposit', balance: 'Baki', packageDue: 'Harga pakej', installment: '', forLink: 'Pelanggan pautan ini', chooseSku: 'Pilih pelan', dir: 'ltr',
  },
  'Saudi Arabia': {
    title: 'الدفع', discount: 'الخصم', total: 'الإجمالي', choose: 'اختر طريقة الدفع', pay: 'ادفع الآن',
    cancel: 'يمكن الإلغاء في أي وقت · ', terms: 'شروط الخدمة', privacy: 'سياسة الخصوصية',
    first: 'الدفعة الأولى', balance: 'الدفعة المتبقية', packageDue: 'سعر الباقة', installment: '', forLink: 'عميل رابط الدفع', chooseSku: 'اختر الباقة', dir: 'rtl',
  },
  Thailand: {
    title: 'ชำระเงิน', discount: 'ส่วนลด', total: 'ยอดรวม', choose: 'เลือกวิธีชำระเงิน', pay: 'ชำระเงินตอนนี้',
    cancel: 'ยกเลิกได้ทุกเมื่อ · ', terms: 'ข้อกำหนดการให้บริการ', privacy: 'นโยบายความเป็นส่วนตัว',
    first: 'มัดจำ', balance: 'ยอดคงเหลือ', packageDue: 'ราคาแพ็กเกจ', installment: '', forLink: 'ลูกค้าของลิงก์นี้', chooseSku: 'เลือกแพ็กเกจ', dir: 'ltr',
  },
  Indonesia: {
    title: 'Pembayaran', discount: 'Diskon', total: 'Total', choose: 'Pilih metode pembayaran', pay: 'Bayar sekarang',
    cancel: 'Batalkan kapan saja · ', terms: 'Ketentuan Layanan', privacy: 'Kebijakan Privasi',
    first: 'Uang muka', balance: 'Sisa pembayaran', packageDue: 'Harga paket', installment: '', forLink: 'Pelanggan tautan ini', chooseSku: 'Pilih paket', dir: 'ltr',
  },
}

export type ReviewLang = 'en' | 'zh' | 'local'

const ZH: PayCopy = {
  title: '支付', discount: '优惠', total: '合计', choose: '选择支付方式', pay: '立即支付',
  cancel: '可随时取消 · ', terms: '服务条款', privacy: '隐私政策',
  first: '定金首款', balance: '定金尾款', packageDue: '套餐应付', installment: '分期支付需要在 3,000,000 越南盾以上。',
  forLink: '这条支付链接的客户', chooseSku: '选择套餐', dir: 'ltr',
}

const EN: PayCopy = {
  title: 'Payment', discount: 'Discount', total: 'Total', choose: 'Choose Payment Method', pay: 'Pay now',
  cancel: 'Cancel anytime · ', terms: 'Terms of Service', privacy: 'Privacy Policy',
  first: 'Deposit', balance: 'Balance', packageDue: 'Package price', installment: 'Instalments require at least 3,000,000 VND.',
  forLink: 'Payment link for', chooseSku: 'Choose a plan', dir: 'ltr',
}

export function methodsForLine(line: string): PayMethod[] {
  return LINE_PAY_METHODS[line] || [{ code: 'card', name: 'Card', icon: icon('pay-card-my.png'), kind: 'redirect' }]
}

export function payCopy(line: string, lang: ReviewLang = 'local'): PayCopy {
  if (lang === 'en') return EN
  if (lang === 'zh') return ZH
  return COPY[line] || EN
}

const LOCAL_LANG_LABEL: Record<string, string> = {
  Korea: '한국어',
  Vietnam: 'Tiếng Việt',
  Malaysia: 'Bahasa Melayu',
  'Saudi Arabia': 'العربية',
  Thailand: 'ไทย',
  Indonesia: 'Bahasa Indonesia',
  Singapore: 'English',
}

export function localLangLabel(line: string): string {
  return LOCAL_LANG_LABEL[line] || 'Local'
}

export type BankCopy = {
  instruction: string
  amount: string
  note: string
  mandatory: string
  warning: string
  qrHint: string
  bank: string
  accountName: string
  accountNumber: string
  transferred: string
  notedTitle: string
  notedBody: string
  copied: string
  methodName: string
}

const BANK_LOCAL: BankCopy = {
  instruction: 'Mở ứng dụng ngân hàng. Chuyển đúng số tiền này và giữ nguyên nội dung bên dưới.',
  amount: 'Số tiền cần chuyển',
  note: 'Nội dung chuyển khoản',
  mandatory: 'Bắt buộc',
  warning: 'Nhập đúng nội dung này khi chuyển khoản. Nếu thiếu hoặc sai, chúng tôi không thể mở hội viên cho bạn.',
  qrHint: 'Dùng điện thoại? Chụp màn hình rồi chọn ảnh này trong ứng dụng ngân hàng.',
  bank: 'Ngân hàng',
  accountName: 'Tên tài khoản',
  accountNumber: 'Số tài khoản',
  transferred: 'Tôi đã chuyển khoản',
  notedTitle: 'Chúng tôi đã ghi nhận thông báo chuyển khoản',
  notedBody: 'Chúng tôi chỉ mở hội viên sau khi xác nhận đã nhận thanh toán. Vào ngày làm việc, việc này thường xong trong vòng 1 giờ.',
  copied: 'Đã sao chép',
  methodName: 'Chuyển khoản',
}

const BANK_EN: BankCopy = {
  instruction: 'Open your banking app. Transfer this exact amount and keep the note below unchanged.',
  amount: 'Amount to transfer',
  note: 'Transfer note',
  mandatory: 'Required',
  warning: 'Enter this note exactly. If it is missing or wrong, we cannot open the membership.',
  qrHint: 'On a phone, take a screenshot and choose that image in your banking app.',
  bank: 'Bank',
  accountName: 'Account name',
  accountNumber: 'Account number',
  transferred: 'I have transferred',
  notedTitle: 'We have recorded your transfer notice',
  notedBody: 'Membership opens after the payment is confirmed. On business days this usually takes about an hour.',
  copied: 'Copied',
  methodName: 'Bank transfer',
}

const BANK_ZH: BankCopy = {
  instruction: '打开银行 App，按这个金额转账，并原样填写下面的附言。',
  amount: '需转金额',
  note: '转账附言',
  mandatory: '必填',
  warning: '附言必须一字不差。少了或错了，就无法开通会员。',
  qrHint: '用手机的话，先截图，再在银行 App 里选择这张图。',
  bank: '银行',
  accountName: '户名',
  accountNumber: '账号',
  transferred: '我已转账',
  notedTitle: '已记下你的转账申报',
  notedBody: '确认到账后才会开通会员。工作日通常大约 1 小时内完成。',
  copied: '已复制',
  methodName: '银行转账',
}

export function bankCopy(lang: ReviewLang): BankCopy {
  if (lang === 'en') return BANK_EN
  if (lang === 'zh') return BANK_ZH
  return BANK_LOCAL
}

export function methodDisplayName(method: PayMethod, lang: ReviewLang): string {
  if (method.code === 'bank_transfer') return bankCopy(lang).methodName
  if (method.code === 'onepay_installment' && lang === 'en') return 'OnePay instalment'
  if (method.code === 'onepay_installment' && lang === 'zh') return 'OnePay 分期'
  return method.name
}

export function findMethods(line: string, codes: string[]): PayMethod[] {
  const catalog = methodsForLine(line)
  const picked = codes.map((code) => catalog.find((item) => item.code === code)).filter((item): item is PayMethod => !!item)
  return picked.length ? picked : catalog
}
