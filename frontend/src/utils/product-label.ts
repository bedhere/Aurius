export function productLabel(product: { name: string; series: string | null; model: string | null }) {
  const seriesNames: Record<string, string> = { '赛博': 'CYBER', '锐净': 'RAYCLEAN', '瑞景': 'RAYCLEAN' };
  const model = product.model?.trim() || product.name.match(/AU-\d+[A-Z0-9-]*/i)?.[0] || '';
  const knownSeries = seriesNames[product.series?.trim() || ''];
  const nameWithoutModel = model ? product.name.replace(model, '').replace(/\s*\|\s*$/, '').replace(/\s{2,}/g, ' ').trim() : product.name;
  const series = knownSeries || (product.series && !/[\u4e00-\u9fff]/.test(product.series) ? product.series : nameWithoutModel);
  const hasSeries = Boolean(knownSeries || product.series || /\bseries\b/i.test(nameWithoutModel));
  return { series: hasSeries && series ? (/\bseries\b/i.test(series) ? series.toUpperCase() : `${series.toUpperCase()} SERIES`) : nameWithoutModel || product.name, model };
}
