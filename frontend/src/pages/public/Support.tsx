import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/LanguageContext';

export default function Support() {
  const { t, language } = useI18n();
  const cards = language === 'zh-CN'
    ? [['产品手册与指南', '安装指南、用户手册和技术图纸可由获批的行业合作伙伴在 AURIUS 下载中心获取。'], ['质保与服务', 'AURIUS 智能马桶享有 5 年质保；全屋净水系统主机 2 年质保，滤材 12 个月质保。'], ['安装支持', '建议由持证水管工或电工安装。我们的支持团队会通过服务台为安装人员提供技术指导。']]
    : [['Product Manuals & Guides', 'Installation guides, user manuals and technical drawings are available in the AURIUS download centre for approved trade partners.'], ['Warranty & Service', 'AURIUS smart toilets are covered by a 5-year warranty. Whole-house filtration systems carry a 2-year housing warranty and 12-month filter-media warranty.'], ['Installation Support', 'We recommend installation by a licensed plumber or electrician. Our team provides technical guidance for installers via the support desk.']];
  const faq = language === 'zh-CN'
    ? [['滤芯多久更换一次？', '通常每 6 至 12 个月更换一次，具体取决于家庭用水量和当地水质。'], ['智能马桶需要电源吗？', '需要。加热座圈、温水和暖风功能需要附近的电源插座，建议由持证电工施工。'], ['AURIUS 产品有 WaterMark 认证吗？', '包括适用情况下的 WaterMark 在内，相关认证按具体产品和型号列明。请查看对应型号的产品资料，或联系我们确认其认证范围。'], ['谁应该安装全屋净水系统？', '建议由持证水管工安装。系统连接在主供水管线上，保护家中每个出水口。'], ['如何获取行业价格？', '持证水管工和电工可通过 VIP 门户申请，经销商和分销商可通过 Trade 门户申请。审核通过后即可获得专属价格。'], ['质保流程是什么？', '请携带购买凭证和安装信息联系我们的支持团队，我们会指导评估与更换流程。']]
    : [['How often should I replace the filter cartridges?', 'Replacement cartridges should generally be changed every 6-12 months depending on household water usage and local water quality.'], ['Do AURIUS smart toilets require a power supply?', 'Yes. Smart toilets require a nearby power outlet for heated seat, warm water and air dryer functions.'], ['Are AURIUS products WaterMark certified?', 'Relevant certifications, including WaterMark where applicable, are identified by product and model. Please check the documentation for your specific model or contact our team to confirm its certification scope.'], ['Who should install a whole-house filtration system?', 'We recommend installation by a licensed plumber. The system is installed on the main water line to protect every outlet.'], ['How do I access trade pricing?', 'Licensed plumbers and electricians apply through the VIP portal. Dealers and distributors apply through the Trade portal.'], ['What is the warranty process?', 'Contact our support team with proof of purchase and installation details. We will guide you through assessment and replacement.']];
  return <>
    <section className="page-band"><div className="container"><h1 className="section-title">{t('support.title')}</h1><p className="section-sub">{t('support.sub')}</p></div></section>
    <section className="section"><div className="container">
      <div className="card-grid">{cards.map(([title, text]) => <div className="card" key={title}><div className="card__body"><h3 className="card__title">{title}</h3><p className="card__desc" style={{ margin: 0 }}>{text}</p></div></div>)}</div>
      <div className="mt-3"><h2 className="section-title">{t('support.faq')}</h2><div className="container" style={{ maxWidth: 820 }}>{faq.map(([q, a]) => <details key={q} className="faq" style={{ marginBottom: 10 }}><summary style={{ cursor: 'pointer', fontWeight: 600, padding: '10px 0' }}>{q}</summary><p className="muted" style={{ margin: '0 0 10px' }}>{a}</p></details>)}</div></div>
      <div className="center mt-3"><Link to="/contact" className="btn btn-primary">{t('support.contact')}</Link></div>
    </div></section>
  </>;
}
