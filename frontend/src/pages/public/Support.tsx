import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/LanguageContext';

export default function Support() {
  const { t, language } = useI18n();
  const cards = language === 'zh-CN'
    ? [['产品手册与指南', '获取产品手册、安装指南和技术规格，帮助正确安装、操作和维护。请联系 AURIUS 获取相应型号的资料。'], ['质保与服务', 'AURIUS 产品针对制造缺陷提供三年品质质保，具体适用范围以相应质保条款为准。净水系统质保不含滤芯耗材。本质保不影响消费者依据澳大利亚消费者法享有的权利。'], ['安装支持', '建议由具备相应执照的专业人员安装。AURIUS 提供技术指导和产品支持，协助完成安装。']]
    : [['Product Manuals & Guides', 'Access product manuals, installation guides and technical specifications to support correct installation, operation and maintenance. Contact AURIUS for documentation for your model.'], ['Warranty & Service', 'AURIUS products are backed by a 3-year quality warranty against manufacturing defects, subject to the applicable warranty terms and conditions. Filtration warranty excludes replacement filter cartridges. This warranty does not affect your rights under Australian Consumer Law.'], ['Installation Support', 'Professional installation by appropriately licensed tradespeople is recommended. AURIUS provides technical guidance and product support to assist with installation.']];
  const faq = language === 'zh-CN'
    ? [['滤芯多久更换一次？', '更换周期取决于滤芯型号、用水量和当地水质。请参考对应型号的维护说明，或联系 AURIUS 确认更换建议。'], ['智能马桶需要电源吗？', '智能功能需要合适的电源。具体要求请查看型号安装说明，并由具备相应资质的人员处理电气安装。'], ['AURIUS 产品有 WaterMark 认证吗？', '认证状态及范围按具体产品型号确认。请联系 AURIUS 获取所选型号的认证资料。'], ['谁应该安装全屋净水系统？', '建议由具备相应执照的水管工按照产品说明及当地要求进行安装。'], ['如何获取行业价格？', '水工与建筑商通过 Plumbers & Builders 入口申请，代理商与分销商通过 Trade 入口申请。AURIUS 审核并手动开通账户后，方可查看采购价格和下单。'], ['质保流程是什么？', '请提供购买凭证、产品型号和安装信息，联系支持团队。我们将依据适用条款协助评估和处理。']]
    : [['How often should I replace the filter cartridges?', 'Replacement intervals depend on the cartridge model, water usage and local water quality. Follow the maintenance guidance for your model or contact AURIUS for advice.'], ['Do AURIUS smart toilets require a power supply?', 'Smart functions require a suitable power supply. Check the installation guide for your model and use appropriately licensed tradespeople for electrical work.'], ['Are AURIUS products WaterMark certified?', 'Certification status and scope must be confirmed for the specific product model. Contact AURIUS for certification information for your selected model.'], ['Who should install a whole-house filtration system?', 'An appropriately licensed plumber should install the system in accordance with the product instructions and local requirements.'], ['How do I access trade pricing?', 'Plumbers and builders apply through the Plumbers & Builders Portal. Distributors and channel partners apply through the Trade Partner Portal. Trade pricing and ordering become available only after AURIUS reviews and manually activates the account.'], ['What is the warranty process?', 'Contact our support team with proof of purchase, your product model and installation details. We will assist with assessment and service under the applicable warranty terms.']];
  return <>
    <section className="page-band"><div className="container"><h1 className="section-title">{t('support.title')}</h1><p className="section-sub">{t('support.sub')}</p></div></section>
    <section className="section"><div className="container">
      <div className="card-grid">{cards.map(([title, text]) => <div className="card" key={title}><div className="card__body"><h3 className="card__title">{title}</h3><p className="card__desc" style={{ margin: 0 }}>{text}</p></div></div>)}</div>
      <div className="mt-3"><h2 className="section-title">{t('support.faq')}</h2><div className="container" style={{ maxWidth: 820 }}>{faq.map(([q, a]) => <details key={q} className="faq" style={{ marginBottom: 10 }}><summary style={{ cursor: 'pointer', fontWeight: 600, padding: '10px 0' }}>{q}</summary><p className="muted" style={{ margin: '0 0 10px' }}>{a}</p></details>)}</div></div>
      <div className="center mt-3"><Link to="/contact" className="btn btn-primary">{t('support.contact')}</Link></div>
    </div></section>
  </>;
}
