import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/LanguageContext';
import '../../assets/styles/pages-public.css';

export default function Vision() {
  const { t, language } = useI18n();
  const paragraphs = language === 'zh-CN'
    ? [
      'AURIUS 是一个面向澳大利亚市场的高端品牌，致力于通过智能卫浴解决方案与全屋净水系统提升日常生活品质。我们相信，出色的设计、可靠的品质与用心的创新应当相互融合，共同营造更舒适的家居环境。',
      '我们的产品组合涵盖功能丰富的智能马桶与精致的全屋净水系统。面向现代澳大利亚家庭，AURIUS 将先进功能、精致美学与便捷实用的日常体验融为一体。',
      '我们正在建立一个值得信赖的全国合作网络，涵盖授权区域代理、专业经销商与持证行业合作伙伴。通过明确的市场区域、长期合作、产品知识与及时支持，我们致力于实现可持续增长，并在澳大利亚各地提供一致的 AURIUS 品牌体验。',
    ]
    : [
      'AURIUS is an Australian-focused premium brand dedicated to enhancing everyday living through intelligent bathroom solutions and whole-house water filtration. We believe exceptional design, dependable quality and thoughtful innovation should come together to create a more comfortable home.',
      'Our product portfolio brings together full-featured smart toilets and sophisticated whole-house water filtration systems. Designed for modern Australian homes, AURIUS products combine advanced functionality, refined aesthetics and practical everyday convenience.',
      'We are building a trusted national network of authorised regional distributors, professional dealers and licensed trade partners. Through clear market territories, long-term partnerships, product knowledge and responsive support, we aim to create sustainable growth and deliver a consistent AURIUS experience across Australia.',
    ];
  const values = language === 'zh-CN'
    ? [
      ['澳大利亚标准与品质保障', 'AURIUS 致力于产品品质、安全及符合适用的澳大利亚要求。包括适用情况下的 WaterMark 在内，相关认证按具体产品和型号列明。'],
      ['智能设计与日常舒适', '我们的多功能智能马桶将先进的个人清洁体验、注重舒适的功能与精致设计相结合，提升现代卫浴生活品质。'],
      ['全屋净水系统', '我们的全屋净水解决方案旨在改善家庭整体用水品质，将多级过滤、优质材料与实用性能相结合。'],
      ['全国专业合作伙伴网络', '我们正在澳大利亚建立有序的授权区域代理、经销商与持证专业人员网络，以明确的合作区域、产品资源及长期业务伙伴关系提供支持。'],
    ]
    : [
      ['Australian Standards & Quality Assurance', 'AURIUS is committed to product quality, safety and compliance with applicable Australian requirements. Relevant certifications, including WaterMark where applicable, are identified by product and model.'],
      ['Intelligent Design & Everyday Comfort', 'Our full-featured smart toilets combine advanced personal cleansing, comfort-focused features and refined design to elevate the modern bathroom experience.'],
      ['Whole-House Water Filtration', 'Our whole-house filtration solutions are designed to improve water quality throughout the home, combining multi-stage filtration with premium materials and practical performance.'],
      ['A Nationwide Professional Partner Network', 'We are developing a structured Australian network of authorised regional distributors, dealers and licensed trade professionals, supported by defined territories, product resources and long-term business partnerships.'],
    ];

  return <>
    <section className="page-band vision-hero"><div className="container"><h1 className="section-title">{t('vision.title')}</h1><p className="section-sub vision-statement">{t('vision.sub')}</p></div></section>
    <section className="section vision-body"><div className="container" style={{ maxWidth: 820 }}>{paragraphs.map((p) => <p key={p}>{p}</p>)}</div></section>
    <section className="section section-alt vision-principles"><div className="container">
      <h2 className="section-title">{t('vision.standFor')}</h2>
      <div className="card-grid vision-values">{values.map(([title, text]) => <div className="card" key={title}><div className="card__body"><h3 className="card__title">{title}</h3><p className="card__desc" style={{ margin: 0 }}>{text}</p></div></div>)}</div>
      <div className="vision-actions mt-3"><Link to="/trade?tab=register&partner=regional-distributor" className="btn btn-primary">{t('vision.dealer')}</Link><Link to="/vip?tab=register" className="btn btn-outline">{t('vision.trades')}</Link></div>
    </div></section>
  </>;
}
