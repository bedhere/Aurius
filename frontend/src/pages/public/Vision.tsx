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
      ['品质与标准', '我们致力于提供精心设计的产品，重视品质、可靠性以及符合适用的澳大利亚标准。通过关注每一个细节，建立客户长期的信任。'],
      ['智慧生活', 'AURIUS智能马桶融合精致设计与实用创新，提升日常生活的舒适性和便利性。专为现代澳大利亚住宅打造，实现科技、功能与优雅设计的平衡。'],
      ['高端全屋净水', 'AURIUS全屋净水系统融合可靠的过滤技术与精致设计，为现代澳大利亚住宅提供高品质的全屋净水解决方案，与现代高端住宅环境相得益彰。'],
      ['长期渠道合作', '我们正在澳大利亚建立结构清晰的分销网络，通过明确的区域划分、紧密的合作关系和长期业务发展战略，为有实力、有共同理念的渠道合作伙伴创造可持续的发展机会。'],
    ]
    : [
      ['QUALITY & STANDARDS', 'We are committed to delivering thoughtfully engineered products with a strong focus on quality, reliability and compliance with applicable Australian standards. Our approach is built on attention to detail and long-term customer confidence.'],
      ['SMART LIVING', 'Combining refined design with practical innovation, AURIUS smart toilets are created to enhance everyday comfort and convenience. Designed for modern Australian homes, they bring a considered balance of technology, functionality and elegance.'],
      ['PREMIUM WATER FILTRATION', 'AURIUS whole-house water filtration systems combine reliable filtration technology with sophisticated design. Created for modern Australian homes, they offer a premium water filtration solution that complements contemporary residential environments.'],
      ['STRONGER PARTNERSHIPS', 'We are building a structured distribution network across Australia, supported by clearly defined territories, collaborative relationships and a long-term approach to business development. Our goal is to create sustainable opportunities for committed distribution partners.'],
    ];

  return <>
    <section className="page-band vision-hero"><div className="container"><h1 className="section-title">{t('vision.title')}</h1><p className="section-sub vision-statement">{t('vision.sub')}</p></div></section>
    <section className="section vision-body"><div className="container" style={{ maxWidth: 820 }}>{paragraphs.map((p) => <p key={p}>{p}</p>)}</div></section>
    <section className="section section-alt vision-principles" aria-labelledby="vision-values-title"><div className="container">
      <h2 className="section-title" id="vision-values-title">{t('vision.standFor')}</h2>
      <p className="section-sub vision-values-subtitle">{t('vision.valuesSubtitle')}</p>
      <div className="card-grid vision-values">
        {values.map(([title, text]) => (
          <article className="card" key={title}>
            <div className="card__body">
              <h3 className="card__title">{title}</h3>
              <p className="card__desc">{text}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="vision-actions mt-3"><Link to="/trade?tab=register&partner=regional-distributor" className="btn btn-primary">{t('vision.dealer')}</Link><Link to="/vip?tab=register" className="btn btn-outline">{t('vision.trades')}</Link></div>
    </div></section>
  </>;
}
