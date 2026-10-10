import '../../assets/styles/pages-public.css';
import { useI18n } from '../../i18n/LanguageContext';

export default function Terms() {
  const { language } = useI18n();
  if (language === 'zh-CN') {
    return <section className="section"><div className="container legal-page" style={{ maxWidth: 820 }}>
      <h1>服务条款</h1><p className="muted">最后更新：2026 年 8 月</p>
      <h3>1. 条款接受</h3><p>访问 AURIUS 网站或行业门户即表示您同意本服务条款。如不同意，请停止使用本服务。</p>
      <h3>2. 账户</h3><p>您应妥善保管账户凭证，提供真实注册信息并及时更新。对于违反条款的账户，AURIUS 可暂停或终止服务。</p>
      <h3>3. 行业价格保密</h3><p>获批会员看到的行业价格属于保密信息，不得向公众披露。违反保密义务时，AURIUS 有权撤销行业访问权限。</p>
      <h3>4. 订单与付款</h3><p>所有订单须经 AURIUS 接受。价格以订购时为准，除非另有书面约定，货物发出前须完成付款。</p>
      <h3>5. 配送</h3><p>配送时间仅为预计时间。因承运商或合理控制范围之外的事件造成的延误，AURIUS 不承担责任。货物风险在交付时转移。</p>
      <h3>6. 退货与质保</h3><p>质保申请按照购买时适用的产品质保政策评估，请保留购买凭证。</p>
      <h3>7. 合理使用</h3><p>不得绕过安全控制、访问未获授权的价格或数据，或干扰服务运行。</p>
      <h3>8. 责任限制</h3><p>在法律允许的最大范围内，AURIUS 不承担因使用本服务产生的间接或后果性损失。</p>
      <h3>9. 适用法律</h3><p>本条款适用澳大利亚新南威尔士州法律。</p>
    </div></section>;
  }
  return (
    <section className="section">
      <div className="container legal-page" style={{ maxWidth: 820 }}>
        <h1>Terms of Service</h1>
        <p className="muted">Last updated: August 2026</p>

        <h3>1. Acceptance of terms</h3>
        <p>
          By accessing the AURIUS website or trade portal you agree to these Terms of Service. If you
          do not agree, please do not use the service.
        </p>

        <h3>2. Accounts</h3>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials. You
          must provide accurate registration information and update it as required. AURIUS may suspend
          accounts that violate these terms.
        </p>

        <h3>3. Trade pricing confidentiality</h3>
        <p>
          Trade pricing shown to approved members is confidential and must not be disclosed to the
          public. AURIUS reserves the right to revoke trade access for breaches of confidentiality.
        </p>

        <h3>4. Orders and payment</h3>
        <p>
          All orders are subject to acceptance by AURIUS. Prices are calculated at the point of
          ordering. Payment is required before goods are dispatched unless alternative terms have been
          agreed in writing.
        </p>

        <h3>5. Delivery</h3>
        <p>
          Delivery times are estimates. AURIUS is not liable for delays caused by carriers or events
          outside our reasonable control. Risk in goods passes on delivery.
        </p>

        <h3>6. Returns and warranty</h3>
        <p>
          Warranty claims are assessed in accordance with the product warranty applicable at the time
          of purchase. Please retain proof of purchase.
        </p>

        <h3>7. Acceptable use</h3>
        <p>
          You must not attempt to bypass security controls, access pricing or data you are not
          authorised to view, or interfere with the operation of the service.
        </p>

        <h3>8. Liability</h3>
        <p>
          To the maximum extent permitted by law, AURIUS excludes liability for indirect or
          consequential loss arising from use of the service.
        </p>

        <h3>9. Governing law</h3>
        <p>These terms are governed by the laws of New South Wales, Australia.</p>
      </div>
    </section>
  );
}
