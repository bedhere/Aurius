import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'en' | 'zh-CN';
export const LANGUAGE_STORAGE_KEY = 'aurius.language';

const messages: Record<AppLanguage, Record<string, string>> = {
  en: {
    'brand.tagline': 'SMART TOILET | WHOLE HOUSE WATER FILTRATION',
    'nav.menu': 'Menu', 'nav.vision': 'Vision', 'nav.products': 'Products', 'nav.stockists': 'Stockists',
    'nav.trade': 'Trade', 'nav.support': 'Support', 'nav.contact': 'Contact',
    'header.search': 'Search products', 'header.cart': 'Shopping bag',
    'language.toggle': 'Switch to Chinese', 'language.current': 'EN',
    'common.loading': 'Loading...', 'common.retry': 'Retry', 'common.backProducts': 'Back to Products',
    'common.more': 'More', 'common.model': 'Model', 'common.inStock': 'In stock', 'common.units': 'units',
    'common.outOfStock': 'Out of stock', 'common.available': 'available', 'common.unavailable': 'Unavailable',
    'common.search': 'Search products...', 'common.noProducts': 'No products found.',
    'products.title': 'PRODUCTS', 'products.sub': 'Smart Toilets | Whole-House Water Filtration | Filter Cartridges | Custom Floor Drains',
    'products.all': 'All', 'products.smartToilet': 'Smart Toilet', 'products.toiletLid': 'Toilet Lid',
    'products.water': 'Whole-House Water Purification', 'products.filter': 'Filter Cartridge', 'products.shower': 'Shower Filtration', 'products.drain': 'Engineering Custom Floor Drain',
    'products.error': 'We could not load the product catalogue. Please check the connection and try again.',
    'products.loadFailed': 'Product catalogue unavailable',
    'vision.title': 'OUR VISION', 'vision.sub': 'Elevating Everyday Living Through Intelligent Water Technology.',
    'vision.standFor': 'WHAT WE STAND FOR', 'vision.trades': 'Join Our Trade Network', 'vision.dealer': 'Become a Regional Distributor',
    'vision.valuesSubtitle': 'Quality. Innovation. Partnership. Long-Term Value.',
    'stockists.title': 'STOCKISTS', 'stockists.sub': 'AURIUS products are available through a national network of authorised bathroom showrooms, plumbing suppliers and trade partners.',
    'stockists.authorised': 'Authorised Stockists', 'stockists.become': 'Become an Authorised Stockist', 'stockists.apply': 'Apply to become a stockist',
    'support.title': 'SUPPORT', 'support.sub': 'Manuals, warranty, installation and after-sales assistance.', 'support.faq': 'Frequently Asked Questions', 'support.contact': 'Contact Support',
    'contact.title': 'CONTACT', 'contact.sub': 'We are here to help with products, orders and partnership enquiries.', 'contact.getInTouch': 'Get in touch', 'contact.send': 'Send a message',
    'contact.name': 'Name', 'contact.email': 'Email', 'contact.phone': 'Phone', 'contact.address': 'Address', 'contact.hours': 'Hours', 'contact.message': 'Message',
    'contact.sendMessage': 'Send Message', 'contact.sending': 'Sending...', 'contact.success': 'Thank you for contacting AURIUS. Our team will get back to you shortly.',
    'detail.notFound': 'Product not found.', 'detail.choose': 'Choose an option', 'detail.adding': 'Adding...', 'detail.add': 'Add to Cart',
    'detail.trade': 'Contact Aurius to apply for trade access', 'detail.approval': 'Your application must be approved before ordering is available.',
    'detail.sizes': 'Available sizes', 'detail.colours': 'Available colours', 'detail.features': 'Key features',
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
    'brand.tagline': '智能马桶 | 全屋净水系统',
    'nav.menu': '菜单', 'nav.vision': '品牌愿景', 'nav.products': '产品', 'nav.stockists': '经销网点',
    'nav.trade': '经销合作', 'nav.support': '支持', 'nav.contact': '联系我们',
    'header.search': '搜索产品', 'header.cart': '购物袋',
    'language.toggle': '切换为英文', 'language.current': '中文',
    'common.loading': '加载中...', 'common.retry': '重试', 'common.backProducts': '返回产品列表',
    'common.more': '查看详情', 'common.model': '型号', 'common.inStock': '有库存', 'common.units': '件',
    'common.outOfStock': '暂时缺货', 'common.available': '可购买', 'common.unavailable': '暂不可用',
    'common.search': '搜索产品...', 'common.noProducts': '没有找到产品。',
    'products.title': '产品', 'products.sub': '智能马桶 | 全屋净水 | 滤芯 | 工程定制地漏',
    'products.all': '全部', 'products.smartToilet': '智能马桶', 'products.toiletLid': '智能马桶盖',
    'products.water': '全屋净水', 'products.filter': '滤芯', 'products.shower': '淋浴净水', 'products.drain': '工程定制地漏',
    'products.error': '产品目录加载失败，请检查网络连接后重试。', 'products.loadFailed': '产品目录暂时不可用',
    'vision.title': '品牌愿景', 'vision.sub': '以智能水科技，提升每一天的生活品质。',
    'vision.standFor': '我们的坚持', 'vision.trades': '加入专业合作网络', 'vision.dealer': '申请成为区域一级代理',
    'vision.valuesSubtitle': '品质、创新、合作与长期价值。',
    'stockists.title': '经销网点', 'stockists.sub': 'AURIUS 产品通过遍布全国的授权卫浴展厅、管道供应商和行业合作伙伴销售。',
    'stockists.authorised': '授权经销商', 'stockists.become': '成为授权经销商', 'stockists.apply': '申请成为经销商',
    'support.title': '支持', 'support.sub': '产品手册、质保、安装与售后服务。', 'support.faq': '常见问题', 'support.contact': '联系支持团队',
    'contact.title': '联系我们', 'contact.sub': '产品、订单或合作事宜，我们都很乐意为您提供帮助。', 'contact.getInTouch': '联系方式', 'contact.send': '发送消息',
    'contact.name': '姓名', 'contact.email': '邮箱', 'contact.phone': '电话', 'contact.address': '地址', 'contact.hours': '工作时间', 'contact.message': '留言',
    'contact.sendMessage': '发送消息', 'contact.sending': '发送中...', 'contact.success': '感谢您联系 AURIUS，我们的团队会尽快回复。',
    'detail.notFound': '未找到该产品。', 'detail.choose': '选择产品选项', 'detail.adding': '加入中...', 'detail.add': '加入购物车',
    'detail.trade': '联系 AURIUS 申请经销合作', 'detail.approval': '申请获批后才可以下单。',
    'detail.sizes': '可选尺寸', 'detail.colours': '可选颜色', 'detail.features': '主要功能',
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
