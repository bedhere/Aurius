import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/LanguageContext';
import '../../assets/styles/pages-public.css';

export default function Vision() {
  const { t, language } = useI18n();
  const paragraphs = language === 'zh-CN'
    ? [
      'AURIUS 源于一个简单的信念：澳大利亚家庭值得拥有真正高端、可靠并且获得持续支持的卫浴与用水科技。我们打造智能马桶与全屋净水系统，将欧洲灵感设计与澳大利亚严格的质量标准融为一体。',
      '我们的智能马桶提供完整的个人清洁体验，包括座圈与水温加热、臀部与女性清洗、暖风烘干、内置除臭和无线遥控，同时保持安静、高效并且易于安装。全屋净水系统采用三阶段过滤，保护家中每一个出水口。',
      '我们同样重视行业合作伙伴。持证水管工、电工和卫浴经销商是服务网络的核心，我们通过专属价格、技术资料和及时的本地支持帮助合作伙伴成功。',
    ]
    : [
      'AURIUS was founded on a simple belief: Australian households deserve bathroom and water technology that is genuinely premium, reliable and supported. We design smart toilets and whole-house water filtration systems that blend European-inspired aesthetics with rigorous Australian quality standards.',
      'Our smart toilets deliver a complete personal cleansing experience with heated seats and water, posterior and feminine cleaning, warm air drying, integrated deodorising and a wireless remote, while remaining quiet, efficient and easy to install. Our whole-house filtration systems protect every outlet in the home through a three-stage process.',
      'We are equally committed to our trade partners. Licensed plumbers, electricians and bathroom dealers are the backbone of our service network, and we invest in their success through exclusive pricing, technical documentation and responsive local support.',
    ];
  const values = language === 'zh-CN'
    ? [
      ['澳大利亚品质与 WaterMark 认证', '每一款 AURIUS 产品都按照澳大利亚标准设计并通过认证，让安装人员和家庭用户放心使用。'],
      ['智能设计', '从加热座圈、即时温水到无接触操作和暖风烘干，AURIUS 智能马桶将先进功能与精致美学融为一体。'],
      ['全屋用水呵护', '三阶段净水系统从一个低维护设备出发，减少沉淀物、氯、重金属和水垢，保护家中每个水龙头。'],
      ['专业合作网络', '我们与持证水管工、电工和卫浴经销商直接合作，提供行业价格、技术文件和安装指导。'],
    ]
    : [
      ['Australian Quality & WaterMark Certification', 'Every AURIUS product is engineered and certified to meet Australian standards, giving installers and homeowners confidence.'],
      ['Intelligent Design', 'From heated seats and instant warm water to touchless operation and air drying, AURIUS combines advanced function with refined aesthetics.'],
      ['Whole-House Water Care', 'Our three-stage filtration protects every tap in the home by reducing sediment, chlorine, heavy metals and scale.'],
      ['A Professional Partner Network', 'We work directly with licensed plumbers, electricians and bathroom dealers, supporting them with pricing, documents and guidance.'],
    ];

  return <>
    <section className="page-band"><div className="container"><h1 className="section-title">{t('vision.title')}</h1><p className="section-sub">{t('vision.sub')}</p></div></section>
    <section className="section"><div className="container" style={{ maxWidth: 820 }}>{paragraphs.map((p) => <p key={p}>{p}</p>)}</div></section>
    <section className="section section-alt"><div className="container">
      <h2 className="section-title">{t('vision.standFor')}</h2>
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>{values.map(([title, text]) => <div className="card" key={title}><div className="card__body"><h3 className="card__title">{title}</h3><p className="card__desc" style={{ margin: 0 }}>{text}</p></div></div>)}</div>
      <div className="flex gap-2 wrap mt-3" style={{ justifyContent: 'center' }}><Link to="/vip" className="btn btn-primary">{t('vision.trades')}</Link><Link to="/trade" className="btn btn-outline">{t('vision.dealer')}</Link></div>
    </div></section>
  </>;
}
