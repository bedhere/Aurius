import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/LanguageContext';
import '../../assets/styles/pages-public.css';

export default function Vision() {
  const { t, language } = useI18n();
  const paragraphs = language === 'zh-CN'
    ? [
      ['为更好的生活而设计', 'AURIUS 将现代美学与实用创新相结合，提供适合现代澳大利亚生活的智能卫浴解决方案和全屋净水系统。'],
      ['建立长期合作关系', '我们相信，可持续增长始于可靠的产品、专业的服务和稳固的合作关系。'],
    ]
    : [
      ['Designed for Better Living', 'AURIUS combines contemporary aesthetics with practical innovation, offering smart bathroom solutions and whole-house water filtration systems designed for modern Australian living.'],
      ['Built for Long-Term Partnerships', 'We believe sustainable growth begins with reliable products, professional service and strong partnerships.'],
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
    <section className="section vision-body"><div className="container" style={{ maxWidth: 820 }}>{paragraphs.map(([title, text]) => <article key={title}><h2>{title}</h2><p>{text}</p></article>)}</div></section>
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
      <div className="vision-actions mt-3"><Link to="/become-a-partner" className="btn btn-primary">{t('vision.dealer')}</Link><Link to="/plumbers-builders" className="btn btn-outline">{t('vision.trades')}</Link></div>
    </div></section>
  </>;
}
