import '../../assets/styles/pages-public.css';
import { useI18n } from '../../i18n/LanguageContext';

export default function PrivacyPolicy() {
  const { language } = useI18n();
  if (language === 'zh-CN') {
    return <section className="section"><div className="container legal-page" style={{ maxWidth: 820 }}>
      <h1>隐私政策</h1><p className="muted">最后更新：2026 年 8 月</p>
      <h3>1. 关于我们</h3><p>AURIUS Australia Pty Ltd（“AURIUS”“我们”）运营 AURIUS 网站和 B2B 行业门户，并依据《澳大利亚隐私法 1988》和澳大利亚隐私原则保护您的个人信息。</p>
      <h3>2. 我们收集的信息</h3><p>注册行业账户或下单时，我们会收集联系方式、公司资料、执照资料以及账户和订单信息。</p>
      <h3>3. 信息用途</h3><p>我们使用这些信息来核验资质、审批行业账户、提供分级价格、处理订单、发送通知并履行法律和会计义务。</p>
      <h3>4. 存储与安全</h3><p>ABN 和执照号码等敏感信息采用 AES-256 加密存储，密码使用单向加密哈希保存，不以明文存储。</p>
      <h3>5. 信息披露</h3><p>我们不会出售个人信息。为提供服务或遵守法律，我们可能向支付服务商、承运商和专业顾问披露必要的有限信息。</p>
      <h3>6. 您的权利</h3><p>您可以随时联系我们，申请访问、更正或删除个人信息；如删除与法律义务冲突，我们会限制处理。</p>
      <h3>7. 联系方式</h3><p>如有隐私问题，请通过联系我们页面或直接发送邮件与团队联系。</p>
    </div></section>;
  }
  return (
    <section className="section">
      <div className="container legal-page" style={{ maxWidth: 820 }}>
        <h1>Privacy Policy</h1>
        <p className="muted">Last updated: August 2026</p>

        <h3>1. Who we are</h3>
        <p>
          AURIUS Australia Pty Ltd ("AURIUS", "we", "us") operates the AURIUS website and B2B trade
          portal. We are committed to protecting your personal information in accordance with the
          Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles.
        </p>

        <h3>2. Information we collect</h3>
        <p>When you register as a trade partner or place an order, we collect:</p>
        <ul>
          <li>Contact details: name, email address, phone number, business address.</li>
          <li>Company details: company name, ABN, website and social media.</li>
          <li>Licence details: trade type, licence type, licence number and licence documents.</li>
          <li>Account and order data: member ID, order history, payment references and shipping details.</li>
        </ul>

        <h3>3. How we use your information</h3>
        <ul>
          <li>To verify your qualifications and approve your trade account.</li>
          <li>To provide tiered trade pricing and process your orders.</li>
          <li>To send order, payment and shipment notifications.</li>
          <li>To comply with legal and accounting obligations.</li>
        </ul>

        <h3>4. Storage and security</h3>
        <p>
          Sensitive information such as ABN and licence numbers is encrypted at rest using AES-256
          encryption. Passwords are stored as one-way cryptographic hashes and are never stored in
          plain text. Access to personal information is restricted to authorised personnel.
        </p>

        <h3>5. Disclosure</h3>
        <p>
          We do not sell your personal information. We may disclose limited information to payment
          providers, shipping carriers and professional advisers strictly as required to provide our
          services, or where required by law.
        </p>

        <h3>6. Marketing</h3>
        <p>
          We only send marketing communications where you have explicitly opted in. You may withdraw
          your marketing consent at any time.
        </p>

        <h3>7. Your rights</h3>
        <p>
          You may request access to, correction of, or deletion of your personal information at any
          time by contacting us. Where deletion would conflict with our legal obligations, we will
          restrict processing instead.
        </p>

        <h3>8. Contact</h3>
        <p>
          For privacy enquiries, please contact our team via the contact page or email us directly.
        </p>
      </div>
    </section>
  );
}
