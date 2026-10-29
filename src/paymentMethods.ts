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
  terms: string
  privacy: string
  first: string
  balance: string
  packageDue: string
  installment: string
  forLink: string
  chooseSku: string
  summary: string
  dueNow: string
  paidTag: string
  laterTag: string
  secure: string
  account: string
  dueRule: string
  dueLeft: string
  overdue: string
  fullTag: string
  linkPaid: string
  bindAfterLogin: string
  loginTitle: string
  loginSub: string
  phone: string
  getCode: string
  code: string
  codeHint: string
  login: string
  orWith: string
  confirmTitle: string
  confirmBody: string
  confirmPay: string
  switchAccount: string
  newAccount: string
  paySuccess: string
  expired: string
  balanceNext: string
  notFound: string
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
    terms: '이용약관', privacy: '개인정보 처리방침',
    first: '계약금', balance: '잔금', packageDue: '패키지 결제금액', installment: '', forLink: '이 결제 링크의 고객', chooseSku: '패키지 선택',
    summary: '주문 요약', dueNow: '지금 결제', paidTag: '결제 완료', laterTag: '추후 결제', secure: '안전한 결제', account: '사용자 ID', dueRule: '계약금 결제 후 {days}일 이내에 잔금을 결제해 주세요', dueLeft: '{days}일 이내에 잔금을 결제해 주세요', overdue: '잔금 결제 기간이 지났습니다. 담당 상담사에게 문의해 주세요', fullTag: '일시불', linkPaid: '이 링크는 결제가 완료되었습니다',
    bindAfterLogin: '로그인 후 연결', loginTitle: '로그인하고 결제 계속하기', loginSub: '결제는 로그인한 Dino AI 계정에 연결됩니다', phone: '휴대폰 번호', getCode: '인증번호 받기', code: '인증번호', codeHint: '데모: 아무 6자리 숫자', login: '로그인', orWith: '또는', confirmTitle: '결제 계정 확인', confirmBody: '이 계정으로 결제하고 멤버십을 개통합니다', confirmPay: '확인하고 결제하기', switchAccount: '다른 계정으로 로그인', newAccount: '신규 계정 · 자동 가입됨', paySuccess: '결제가 완료되었습니다', expired: '이 결제 링크는 만료되었습니다', balanceNext: '남은 금액은 같은 링크로 나중에 결제할 수 있습니다', notFound: '결제 링크를 찾을 수 없습니다', dir: 'ltr',
  },
  Vietnam: {
    title: 'Thanh toán', discount: 'Giảm giá', total: 'Tổng cộng', choose: 'Chọn phương thức thanh toán', pay: 'Thanh toán ngay',
    terms: 'Điều khoản dịch vụ', privacy: 'Chính sách bảo mật',
    first: 'Đặt cọc', balance: 'Thanh toán phần còn lại', packageDue: 'Giá gói', installment: 'Thanh toán trả góp cần từ 3.000.000 đồng trở lên.', forLink: 'Liên kết thanh toán của', chooseSku: 'Chọn gói',
    summary: 'Tóm tắt đơn hàng', dueNow: 'Cần thanh toán', paidTag: 'Đã thanh toán', laterTag: 'Thanh toán sau', secure: 'Thanh toán an toàn', account: 'ID người dùng', dueRule: 'Vui lòng thanh toán phần còn lại trong vòng {days} ngày sau khi đặt cọc', dueLeft: 'Vui lòng thanh toán phần còn lại trong vòng {days} ngày', overdue: 'Đã hết thời hạn thanh toán phần còn lại. Vui lòng liên hệ tư vấn viên.', fullTag: 'Thanh toán toàn bộ', linkPaid: 'Liên kết này đã được thanh toán',
    bindAfterLogin: 'Liên kết sau khi đăng nhập', loginTitle: 'Đăng nhập để tiếp tục thanh toán', loginSub: 'Thanh toán sẽ được gắn với tài khoản Dino AI bạn đăng nhập', phone: 'Số điện thoại', getCode: 'Lấy mã', code: 'Mã xác minh', codeHint: 'Demo: nhập 6 chữ số bất kỳ', login: 'Đăng nhập', orWith: 'hoặc', confirmTitle: 'Xác nhận tài khoản thanh toán', confirmBody: 'Thanh toán và mở hội viên cho tài khoản này', confirmPay: 'Xác nhận và thanh toán', switchAccount: 'Đổi tài khoản khác', newAccount: 'Tài khoản mới · đã tự động đăng ký', paySuccess: 'Thanh toán thành công', expired: 'Liên kết thanh toán này đã hết hạn', balanceNext: 'Bạn có thể thanh toán phần còn lại sau bằng chính liên kết này', notFound: 'Không tìm thấy liên kết thanh toán', dir: 'ltr',
  },
  Malaysia: {
    title: 'Pembayaran', discount: 'Diskaun', total: 'Jumlah', choose: 'Pilih kaedah pembayaran', pay: 'Bayar sekarang',
    terms: 'Terma Perkhidmatan', privacy: 'Dasar Privasi',
    first: 'Deposit', balance: 'Baki', packageDue: 'Harga pakej', installment: '', forLink: 'Pelanggan pautan ini', chooseSku: 'Pilih pelan',
    summary: 'Ringkasan pesanan', dueNow: 'Perlu dibayar', paidTag: 'Telah dibayar', laterTag: 'Bayar kemudian', secure: 'Pembayaran selamat', account: 'ID pengguna', dueRule: 'Sila bayar baki dalam {days} hari selepas deposit', dueLeft: 'Sila bayar baki dalam {days} hari', overdue: 'Tempoh bayaran baki telah tamat. Sila hubungi perunding anda.', fullTag: 'Bayaran penuh', linkPaid: 'Pautan ini telah dibayar',
    bindAfterLogin: 'Dipautkan selepas log masuk', loginTitle: 'Log masuk untuk teruskan pembayaran', loginSub: 'Pembayaran akan dipautkan ke akaun Dino AI yang anda log masuk', phone: 'Nombor telefon', getCode: 'Dapatkan kod', code: 'Kod pengesahan', codeHint: 'Demo: mana-mana 6 digit', login: 'Log masuk', orWith: 'atau', confirmTitle: 'Sahkan akaun pembayaran', confirmBody: 'Bayar dan aktifkan keahlian untuk akaun ini', confirmPay: 'Sahkan dan bayar', switchAccount: 'Tukar akaun', newAccount: 'Akaun baharu · didaftarkan secara automatik', paySuccess: 'Pembayaran berjaya', expired: 'Pautan pembayaran ini telah tamat tempoh', balanceNext: 'Baki boleh dibayar kemudian melalui pautan yang sama', notFound: 'Pautan pembayaran tidak dijumpai', dir: 'ltr',
  },
  'Saudi Arabia': {
    title: 'الدفع', discount: 'الخصم', total: 'الإجمالي', choose: 'اختر طريقة الدفع', pay: 'ادفع الآن',
    terms: 'شروط الخدمة', privacy: 'سياسة الخصوصية',
    first: 'الدفعة الأولى', balance: 'الدفعة المتبقية', packageDue: 'سعر الباقة', installment: '', forLink: 'عميل رابط الدفع', chooseSku: 'اختر الباقة',
    summary: 'ملخص الطلب', dueNow: 'المستحق الآن', paidTag: 'تم الدفع', laterTag: 'يدفع لاحقًا', secure: 'دفع آمن', account: 'معرّف المستخدم', dueRule: 'يرجى دفع المبلغ المتبقي خلال {days} أيام بعد الدفعة الأولى', dueLeft: 'يرجى دفع المبلغ المتبقي خلال {days} أيام', overdue: 'انتهت مهلة دفع المبلغ المتبقي. يرجى التواصل مع مستشارك.', fullTag: 'دفع كامل', linkPaid: 'تم دفع هذا الرابط',
    bindAfterLogin: 'يُربط بعد تسجيل الدخول', loginTitle: 'سجّل الدخول لمتابعة الدفع', loginSub: 'سيتم ربط الدفع بحساب Dino AI الذي تسجّل الدخول به', phone: 'رقم الهاتف', getCode: 'إرسال الرمز', code: 'رمز التحقق', codeHint: 'عرض تجريبي: أي 6 أرقام', login: 'تسجيل الدخول', orWith: 'أو', confirmTitle: 'تأكيد حساب الدفع', confirmBody: 'سيتم الدفع وتفعيل العضوية لهذا الحساب', confirmPay: 'تأكيد والدفع', switchAccount: 'تبديل الحساب', newAccount: 'حساب جديد · تم التسجيل تلقائيًا', paySuccess: 'تم الدفع بنجاح', expired: 'انتهت صلاحية رابط الدفع هذا', balanceNext: 'يمكنك دفع المبلغ المتبقي لاحقًا عبر الرابط نفسه', notFound: 'لم يتم العثور على رابط الدفع', dir: 'rtl',
  },
  Thailand: {
    title: 'ชำระเงิน', discount: 'ส่วนลด', total: 'ยอดรวม', choose: 'เลือกวิธีชำระเงิน', pay: 'ชำระเงินตอนนี้',
    terms: 'ข้อกำหนดการให้บริการ', privacy: 'นโยบายความเป็นส่วนตัว',
    first: 'มัดจำ', balance: 'ยอดคงเหลือ', packageDue: 'ราคาแพ็กเกจ', installment: '', forLink: 'ลูกค้าของลิงก์นี้', chooseSku: 'เลือกแพ็กเกจ',
    summary: 'สรุปคำสั่งซื้อ', dueNow: 'ชำระตอนนี้', paidTag: 'ชำระแล้ว', laterTag: 'ชำระภายหลัง', secure: 'ชำระเงินอย่างปลอดภัย', account: 'รหัสผู้ใช้', dueRule: 'กรุณาชำระยอดคงเหลือภายใน {days} วันหลังชำระมัดจำ', dueLeft: 'กรุณาชำระยอดคงเหลือภายใน {days} วัน', overdue: 'เลยกำหนดชำระยอดคงเหลือแล้ว กรุณาติดต่อที่ปรึกษาของคุณ', fullTag: 'ชำระเต็มจำนวน', linkPaid: 'ลิงก์นี้ชำระเงินแล้ว',
    bindAfterLogin: 'เชื่อมหลังเข้าสู่ระบบ', loginTitle: 'เข้าสู่ระบบเพื่อชำระเงินต่อ', loginSub: 'การชำระเงินจะผูกกับบัญชี Dino AI ที่คุณเข้าสู่ระบบ', phone: 'หมายเลขโทรศัพท์', getCode: 'ขอรหัส', code: 'รหัสยืนยัน', codeHint: 'เดโม: ตัวเลข 6 หลักใดก็ได้', login: 'เข้าสู่ระบบ', orWith: 'หรือ', confirmTitle: 'ยืนยันบัญชีที่ชำระเงิน', confirmBody: 'ชำระเงินและเปิดสมาชิกให้บัญชีนี้', confirmPay: 'ยืนยันและชำระเงิน', switchAccount: 'เปลี่ยนบัญชี', newAccount: 'บัญชีใหม่ · สมัครให้อัตโนมัติ', paySuccess: 'ชำระเงินสำเร็จ', expired: 'ลิงก์ชำระเงินนี้หมดอายุแล้ว', balanceNext: 'ชำระยอดคงเหลือภายหลังได้ผ่านลิงก์เดิม', notFound: 'ไม่พบลิงก์ชำระเงิน', dir: 'ltr',
  },
  Indonesia: {
    title: 'Pembayaran', discount: 'Diskon', total: 'Total', choose: 'Pilih metode pembayaran', pay: 'Bayar sekarang',
    terms: 'Ketentuan Layanan', privacy: 'Kebijakan Privasi',
    first: 'Uang muka', balance: 'Sisa pembayaran', packageDue: 'Harga paket', installment: '', forLink: 'Pelanggan tautan ini', chooseSku: 'Pilih paket',
    summary: 'Ringkasan pesanan', dueNow: 'Tagihan saat ini', paidTag: 'Sudah dibayar', laterTag: 'Bayar nanti', secure: 'Pembayaran aman', account: 'ID pengguna', dueRule: 'Harap lunasi sisa pembayaran dalam {days} hari setelah uang muka', dueLeft: 'Harap lunasi sisa pembayaran dalam {days} hari', overdue: 'Batas waktu sisa pembayaran sudah lewat. Silakan hubungi konsultan Anda.', fullTag: 'Pembayaran penuh', linkPaid: 'Tautan ini sudah dibayar',
    bindAfterLogin: 'Ditautkan setelah masuk', loginTitle: 'Masuk untuk melanjutkan pembayaran', loginSub: 'Pembayaran akan ditautkan ke akun Dino AI yang Anda gunakan untuk masuk', phone: 'Nomor telepon', getCode: 'Kirim kode', code: 'Kode verifikasi', codeHint: 'Demo: 6 digit apa saja', login: 'Masuk', orWith: 'atau', confirmTitle: 'Konfirmasi akun pembayaran', confirmBody: 'Bayar dan aktifkan keanggotaan untuk akun ini', confirmPay: 'Konfirmasi dan bayar', switchAccount: 'Ganti akun', newAccount: 'Akun baru · terdaftar otomatis', paySuccess: 'Pembayaran berhasil', expired: 'Tautan pembayaran ini sudah kedaluwarsa', balanceNext: 'Sisa pembayaran bisa dibayar nanti lewat tautan yang sama', notFound: 'Tautan pembayaran tidak ditemukan', dir: 'ltr',
  },
}

export type ReviewLang = 'en' | 'zh' | 'local'

const ZH: PayCopy = {
  title: '支付', discount: '优惠', total: '合计', choose: '选择支付方式', pay: '立即支付',
  terms: '服务条款', privacy: '隐私政策',
  first: '定金首款', balance: '定金尾款', packageDue: '套餐应付', installment: '分期支付需要在 3,000,000 越南盾以上。',
  forLink: '这条支付链接的客户', chooseSku: '选择套餐',
    summary: '订单摘要', dueNow: '本次应付', paidTag: '已支付', laterTag: '稍后支付', secure: '安全支付', account: '用户 ID', dueRule: '付首款后需在 {days} 天内付清尾款', dueLeft: '请在 {days} 天内付清尾款', overdue: '尾款支付期限已过，请联系你的课程顾问', fullTag: '全款', linkPaid: '这条支付链接已支付',
    bindAfterLogin: '登录后绑定', loginTitle: '登录后继续支付', loginSub: '付款将绑定到你登录的 Dino AI 账号', phone: '手机号', getCode: '获取验证码', code: '验证码', codeHint: '演示：任意 6 位数字', login: '登录', orWith: '或', confirmTitle: '确认付款账号', confirmBody: '将为这个账号付款并开通会员', confirmPay: '确认并去支付', switchAccount: '换个账号', newAccount: '新账号 · 已自动注册', paySuccess: '支付成功', expired: '这条支付链接已过期', balanceNext: '尾款之后可以通过同一条链接支付', notFound: '找不到这条支付链接', dir: 'ltr',
}

const EN: PayCopy = {
  title: 'Payment', discount: 'Discount', total: 'Total', choose: 'Choose Payment Method', pay: 'Pay now',
  terms: 'Terms of Service', privacy: 'Privacy Policy',
  first: 'Deposit', balance: 'Balance', packageDue: 'Package price', installment: 'Instalments require at least 3,000,000 VND.',
  forLink: 'Payment link for', chooseSku: 'Choose a plan',
    summary: 'Order summary', dueNow: 'Due now', paidTag: 'Paid', laterTag: 'Pay later', secure: 'Secure payment', account: 'User ID', dueRule: 'Please pay the balance within {days} days after the deposit', dueLeft: 'Please pay the balance within {days} days', overdue: 'The balance payment period has ended. Please contact your advisor.', fullTag: 'Full payment', linkPaid: 'This payment link has been paid',
    bindAfterLogin: 'Linked after login', loginTitle: 'Log in to continue', loginSub: 'The payment is linked to the Dino AI account you log in with', phone: 'Phone number', getCode: 'Get code', code: 'Verification code', codeHint: 'Demo: any 6 digits', login: 'Log in', orWith: 'or', confirmTitle: 'Confirm the paying account', confirmBody: 'You will pay for this account and its membership opens', confirmPay: 'Confirm and pay', switchAccount: 'Use another account', newAccount: 'New account · signed up automatically', paySuccess: 'Payment successful', expired: 'This payment link has expired', balanceNext: 'You can pay the balance later with the same link', notFound: 'Payment link not found', dir: 'ltr',
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
