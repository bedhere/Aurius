import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'en' | 'zh-CN';
export const LANGUAGE_STORAGE_KEY = 'aurius.language';

const messages: Record<AppLanguage, Record<string, string>> = {
  en: {
    'home.pauseSlideshow': 'Pause slideshow', 'home.resumeSlideshow': 'Resume slideshow',
    'brand.tagline': 'SMART TOILET | WHOLE HOUSE WATER FILTRATION',
    'nav.menu': 'Menu', 'nav.vision': 'Vision', 'nav.products': 'Products', 'nav.stockists': 'Stockists',
    'nav.trade': 'Trade', 'nav.support': 'Support', 'nav.contact': 'Contact',
    'header.search': 'Search products', 'header.cart': 'Shopping bag',
    'language.toggle': 'Switch to Chinese', 'language.current': 'EN',
    'common.loading': 'Loading...', 'common.retry': 'Retry', 'common.backProducts': 'Back to Products',
    'common.more': 'More', 'common.model': 'Model', 'common.inStock': 'In stock', 'common.units': 'units',
    'common.outOfStock': 'Out of stock', 'common.available': 'available', 'common.unavailable': 'Unavailable',
    'common.search': 'Search products...', 'common.noProducts': 'No products found.',
    'products.title': 'PRODUCTS', 'products.sub': 'Smart Toilets | Smart Toilet Seats | Whole-House Water Filtration | Filter Cartridges | Custom Floor Drains',
    'products.all': 'All', 'products.smartToilet': 'Smart Toilet', 'products.toiletLid': 'Smart Toilet Seat',
    'products.group.water': 'Water Filtration', 'products.group.bathroom': 'Smart Toilets & Smart Toilet Seats',
    'products.group.drain': 'Floor Drains', 'products.group.other': 'Other Products',
    'products.water': 'Whole-House Water Purification', 'products.filter': 'Filter Cartridge', 'products.shower': 'Shower Filtration', 'products.drain': 'Engineering Custom Floor Drain',
    'products.error': 'We could not load the product catalogue. Please check the connection and try again.',
    'products.loadFailed': 'Product catalogue unavailable',
    'vision.title': 'OUR VISION', 'vision.sub': 'Elevating Everyday Living Through Intelligent Water Technology.',
    'vision.standFor': 'WHAT WE STAND FOR', 'vision.trades': 'Join Our Trade Network', 'vision.dealer': 'Become a Regional Distributor',
    'vision.valuesSubtitle': 'Quality. Innovation. Partnership. Long-Term Value.',
    'stockists.title': 'STOCKISTS', 'stockists.sub': 'Choose a region to explore local AURIUS stockists and partnership opportunities.',
    'stockists.viewState': 'Explore this region', 'stockists.localNetwork': 'Local stockist network',
    'stockists.viewStateIntro': 'View our local partners, showroom photos, contact details and maps on the region page.',
    'stockists.stateSub': 'Browse local partners and select a stockist to view photos, contact details and its location.',
    'stockists.backStates': 'Back to all regions', 'stockists.regionNotFound': 'This region could not be found. Please choose a region from the overview.',
    'stockists.authorised': 'Authorised Stockists', 'stockists.become': 'Become an Authorised Stockist', 'stockists.apply': 'Apply to become a partner',
    'stockists.regions': 'Stockists and partnership opportunities by region', 'stockists.recruiting': 'Seeking partners',
    'stockists.available': 'Local partners', 'stockists.selectDealer': 'Choose a stockist', 'stockists.map': 'Location map',
    'stockists.noPhoto': 'Showroom photo coming soon', 'stockists.noMap': 'Map location unavailable',
    'stockists.loadFailed': 'We could not load stockist information. Please try again.',
    'stockists.vacancy': 'Your place awaits', 'stockists.invitation': 'We invite professional bathroom and water filtration dealers in this region to join AURIUS as partners and expand our local service network together.',
    'stockists.state.NSW': 'New South Wales', 'stockists.state.VIC': 'Victoria', 'stockists.state.QLD': 'Queensland',
    'stockists.state.WA': 'Western Australia', 'stockists.state.SA': 'South Australia', 'stockists.state.TAS': 'Tasmania',
    'stockists.state.ACT': 'Australian Capital Territory (Canberra)', 'stockists.state.NT': 'Northern Territory', 'stockists.state.other': 'Other regions',
    'support.title': 'SUPPORT', 'support.sub': 'Manuals, warranty, installation and after-sales assistance.', 'support.faq': 'Frequently Asked Questions', 'support.contact': 'Contact Support',
    'contact.title': 'CONTACT', 'contact.sub': 'We are here to help with products, orders and partnership enquiries.', 'contact.getInTouch': 'Get in touch', 'contact.send': 'Send a message',
    'contact.name': 'Name', 'contact.email': 'Email', 'contact.phone': 'Phone', 'contact.address': 'Address', 'contact.hours': 'Hours', 'contact.message': 'Message',
    'contact.sendMessage': 'Send Message', 'contact.sending': 'Sending...', 'contact.success': 'Thank you for contacting AURIUS. Our team will get back to you shortly.',
    'detail.notFound': 'Product not found.', 'detail.choose': 'Choose an option', 'detail.adding': 'Adding...', 'detail.add': 'Add to Cart',
    'detail.trade': 'Contact Aurius to apply for trade access', 'detail.approval': 'Your application must be approved before ordering is available.',
    'detail.sizes': 'Available sizes', 'detail.colours': 'Available colours', 'detail.features': 'Key features',
    'detail.dimensions': 'Dimensions', 'detail.dimensionImage': 'Dimension drawing', 'detail.featureImage': 'Product features', 'detail.viewFullImage': 'Open full-size image',
    'detail.warranty.water': '3 Year Warranty* — Excludes Filter', 'detail.warranty.toilet': '3 Year Coverage',
    'detail.installment.open': 'Learn about Afterpay instalments', 'detail.installment.title': 'Afterpay instalments',
    'detail.installment.pending': 'Instalment payments are being set up. Available plans and payment options will be provided when the service launches.',
    'detail.installment.close': 'Close',
    'detail.remoteControl': 'Remote control',
    'drain.config.title': 'Floor drain finishes', 'drain.config.copy': 'Select a finish to view the matching product photograph.',
    'drain.size': 'Fixed size', 'drain.finish': 'Choose finish', 'drain.preview': 'Selected finish',
    'drain.finish.brushedSteel': 'Brushed stainless steel', 'drain.finish.polishedSteel': 'Polished stainless steel',
    'drain.finish.matteBlack': 'Matte black', 'drain.finish.graphite': 'Graphite', 'drain.finish.gunmetal': 'Gunmetal',
    'drain.finish.brushedBrass': 'Brushed brass', 'drain.finish.gold': 'Gold', 'drain.finish.roseGold': 'Rose gold',
    'drain.finish.matteWhite': 'Matte white',
    'footer.quality': 'Australian quality and WaterMark certification', 'footer.rights': '© 2026 AURIUS Australia Pty Ltd. All rights reserved.',
    'footer.privacy': 'Privacy Policy', 'footer.terms': 'Terms of Service', 'footer.dealer': 'Dealer Agreement',
  },
  'zh-CN': {
    'home.pauseSlideshow': '暂停轮播', 'home.resumeSlideshow': '继续轮播',
    'brand.tagline': '智能马桶 | 全屋净水系统',
    'nav.menu': '菜单', 'nav.vision': '品牌愿景', 'nav.products': '产品', 'nav.stockists': '经销网点',
    'nav.trade': '经销合作', 'nav.support': '支持', 'nav.contact': '联系我们',
    'header.search': '搜索产品', 'header.cart': '购物袋',
    'language.toggle': '切换为英文', 'language.current': '中文',
    'common.loading': '加载中...', 'common.retry': '重试', 'common.backProducts': '返回产品列表',
    'common.more': '查看详情', 'common.model': '型号', 'common.inStock': '有库存', 'common.units': '件',
    'common.outOfStock': '暂时缺货', 'common.available': '可购买', 'common.unavailable': '暂不可用',
    'common.search': '搜索产品...', 'common.noProducts': '没有找到产品。',
    'products.title': '产品', 'products.sub': '智能马桶 | 智能马桶盖 | 全屋净水 | 滤芯 | 工程定制地漏',
    'products.all': '全部', 'products.smartToilet': '智能马桶', 'products.toiletLid': '智能马桶盖',
    'products.group.water': '净水产品', 'products.group.bathroom': '智能马桶及马桶盖',
    'products.group.drain': '地漏产品', 'products.group.other': '其他产品',
    'products.water': '全屋净水', 'products.filter': '滤芯', 'products.shower': '淋浴净水', 'products.drain': '工程定制地漏',
    'products.error': '产品目录加载失败，请检查网络连接后重试。', 'products.loadFailed': '产品目录暂时不可用',
    'vision.title': '品牌愿景', 'vision.sub': '以智能水科技，提升每一天的生活品质。',
    'vision.standFor': '我们的坚持', 'vision.trades': '加入专业合作网络', 'vision.dealer': '申请成为区域一级代理',
    'vision.valuesSubtitle': '品质、创新、合作与长期价值。',
    'stockists.title': '经销网点', 'stockists.sub': '请选择所在地区，查看当地 AURIUS 合作伙伴及合作机会。',
    'stockists.viewState': '查看本地区信息', 'stockists.localNetwork': '本地区合作网点',
    'stockists.viewStateIntro': '进入本地区独立页面，查看合作伙伴、门店照片、联系方式与地图位置。',
    'stockists.stateSub': '查看本地区合作伙伴，选择门店即可查看照片、联系方式与地图位置。',
    'stockists.backStates': '返回全部地区', 'stockists.regionNotFound': '未找到该区域，请返回总览页选择所在地区。',
    'stockists.authorised': '授权经销商', 'stockists.become': '成为授权经销商', 'stockists.apply': '申请成为合作伙伴',
    'stockists.regions': '各地区经销网点与合作机会', 'stockists.recruiting': '合作伙伴招募中',
    'stockists.available': '合作伙伴网点', 'stockists.selectDealer': '选择门店', 'stockists.map': '门店地图',
    'stockists.noPhoto': '门店照片待补充', 'stockists.noMap': '暂无有效地图位置',
    'stockists.loadFailed': '经销网点加载失败，请稍后重试。',
    'stockists.vacancy': '虚位以待', 'stockists.invitation': '诚邀本地区专业卫浴经销商及净水经销商加入 AURIUS，成为我们的合作伙伴，共同拓展本地服务网络。',
    'stockists.state.NSW': '新南威尔士州', 'stockists.state.VIC': '维多利亚州', 'stockists.state.QLD': '昆士兰州',
    'stockists.state.WA': '西澳大利亚州', 'stockists.state.SA': '南澳大利亚州', 'stockists.state.TAS': '塔斯马尼亚州',
    'stockists.state.ACT': '澳大利亚首都领地（堪培拉）', 'stockists.state.NT': '北领地', 'stockists.state.other': '其他区域',
    'support.title': '支持', 'support.sub': '产品手册、质保、安装与售后服务。', 'support.faq': '常见问题', 'support.contact': '联系支持团队',
    'contact.title': '联系我们', 'contact.sub': '产品、订单或合作事宜，我们都很乐意为您提供帮助。', 'contact.getInTouch': '联系方式', 'contact.send': '发送消息',
    'contact.name': '姓名', 'contact.email': '邮箱', 'contact.phone': '电话', 'contact.address': '地址', 'contact.hours': '工作时间', 'contact.message': '留言',
    'contact.sendMessage': '发送消息', 'contact.sending': '发送中...', 'contact.success': '感谢您联系 AURIUS，我们的团队会尽快回复。',
    'detail.notFound': '未找到该产品。', 'detail.choose': '选择产品选项', 'detail.adding': '加入中...', 'detail.add': '加入购物车',
    'detail.trade': '联系 AURIUS 申请经销合作', 'detail.approval': '申请获批后才可以下单。',
    'detail.sizes': '可选尺寸', 'detail.colours': '可选颜色', 'detail.features': '主要功能',
    'detail.dimensions': '尺寸说明', 'detail.dimensionImage': '尺寸图', 'detail.featureImage': '功能图', 'detail.viewFullImage': '点击查看原图',
    'detail.warranty.water': '3 年质保*，不含滤芯', 'detail.warranty.toilet': '3 年保障',
    'detail.installment.open': '了解 Afterpay 分期付款', 'detail.installment.title': 'Afterpay 分期付款',
    'detail.installment.pending': '分期付款功能正在接入中，具体分期方案及付款方式将在服务开通后提供。',
    'detail.installment.close': '关闭',
    'detail.remoteControl': '遥控器',
    'drain.config.title': '地漏颜色', 'drain.config.copy': '选择颜色，查看对应的产品实拍图。',
    'drain.size': '固定尺寸', 'drain.finish': '选择颜色', 'drain.preview': '已选颜色',
    'drain.finish.brushedSteel': '拉丝不锈钢', 'drain.finish.polishedSteel': '镜面不锈钢',
    'drain.finish.matteBlack': '哑光黑', 'drain.finish.graphite': '石墨灰', 'drain.finish.gunmetal': '枪灰色',
    'drain.finish.brushedBrass': '拉丝黄铜', 'drain.finish.gold': '金色', 'drain.finish.roseGold': '玫瑰金',
    'drain.finish.matteWhite': '哑光白',
    'footer.quality': '澳大利亚品质与 WaterMark 认证', 'footer.rights': '© 2026 AURIUS Australia Pty Ltd. 版权所有。',
    'footer.privacy': '隐私政策', 'footer.terms': '服务条款', 'footer.dealer': '经销商协议',
  },
};

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function initialLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'zh-CN' ? 'zh-CN' : 'en';
}

export function getPreferredLanguage(): AppLanguage {
  return initialLanguage();
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(initialLanguage);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t: (key) => messages[language][key] ?? messages.en[key] ?? key,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useI18n must be used inside LanguageProvider');
  return context;
}
