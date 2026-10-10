import '../../assets/styles/pages-public.css';
import { useI18n } from '../../i18n/LanguageContext';

export default function DealerAgreement() {
  const { language } = useI18n();
  if (language === 'zh-CN') {
    return <section className="section"><div className="container legal-page" style={{ maxWidth: 820 }}>
      <h1>经销商 / 行业合作协议</h1><p className="muted">最后更新：2026 年 8 月</p>
      <h3>1. 合作任命</h3><p>本协议规定经销商、分销商或持证技师购买 AURIUS 产品用于转售或安装时适用的条款。</p>
      <h3>2. 会员等级</h3><ul><li><strong>一级：区域独家代理</strong>：最低行业采购价、区域分销权及年度返利资格。</li><li><strong>二级：持证技师</strong>：为持证水管工和电工提供安装供货价格。</li><li><strong>三级：次级经销商</strong>：无区域独家权的分销商享受次级批发价格。</li></ul>
      <h3>3. 资质核验</h3><p>合作伙伴须提供有效 ABN；持证技师还须提供有效行业执照。AURIUS 会核验资料，无法确认时可拒绝或撤销权限。</p>
      <h3>4. 价格保密</h3><p>行业价格严格保密，不得向消费者或其他方发布、分享或宣传采购价格。</p>
      <h3>5. 订单与付款</h3><p>订单通过行业门户提交，可通过银行转账、信用卡或 PayPal 付款，确认收款后安排发货。</p>
      <h3>6. 区域与独家权</h3><p>获授区域独家权的内容另行记录，不延伸至约定区域以外的市场。</p>
      <h3>7. 期限与终止</h3><p>任一方可书面通知终止协议；违反条款或疑似欺诈时，AURIUS 可立即暂停交易。</p>
      <h3>8. 其他</h3><p>本协议适用澳大利亚新南威尔士州法律。AURIUS 可不时更新协议，继续使用门户即表示接受更新内容。</p>
    </div></section>;
  }
  return (
    <section className="section">
      <div className="container legal-page" style={{ maxWidth: 820 }}>
        <h1>Dealer / Trade Agreement</h1>
        <p className="muted">Last updated: August 2026</p>

        <h3>1. Appointment</h3>
        <p>
          This agreement sets out the terms under which a dealer, distributor or licensed tradesperson
          ("Partner") is authorised to purchase AURIUS products for the purposes of resale or
          installation.
        </p>

        <h3>2. Membership tiers</h3>
        <ul>
          <li>
            <strong>Level 1 — Regional Exclusive Agent:</strong> the lowest trade purchase price with
            regional distribution rights and annual volume rebate eligibility.
          </li>
          <li>
            <strong>Level 2 — Licensed Tradesman:</strong> trade pricing for licensed plumbers and
            electricians for installation supply.
          </li>
          <li>
            <strong>Level 3 — Sub-dealer:</strong> secondary wholesale pricing for distributors without
            exclusive territory rights.
          </li>
        </ul>

        <h3>3. Verification</h3>
        <p>
          Partners must provide a valid ABN. Licensed tradesmen must additionally provide a current
          trade licence. AURIUS verifies these details and may refuse or revoke access where
          information cannot be confirmed.
        </p>

        <h3>4. Pricing confidentiality</h3>
        <p>
          Trade pricing is strictly confidential. Partners must not publish, share or advertise their
          trade purchase prices to consumers or other parties.
        </p>

        <h3>5. Orders and payment</h3>
        <p>
          Orders are placed through the trade portal. Payment may be made by bank transfer, credit card
          or PayPal. Goods are released for dispatch once payment is confirmed.
        </p>

        <h3>6. Territory and exclusivity</h3>
        <p>
          Regional exclusivity, where granted, is documented separately in a territory schedule. It
          does not confer rights to markets outside the agreed region.
        </p>

        <h3>7. Term and termination</h3>
        <p>
          Either party may terminate this agreement on written notice. AURIUS may suspend trading
          immediately for breach of these terms or suspected fraud. Termination does not relieve
          liability for amounts already due.
        </p>

        <h3>8. General</h3>
        <p>
          This agreement is governed by the laws of New South Wales, Australia. AURIUS may update this
          agreement from time to time; continued use of the portal constitutes acceptance.
        </p>
      </div>
    </section>
  );
}
