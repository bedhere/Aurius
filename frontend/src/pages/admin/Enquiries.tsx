import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, getAccessToken } from '../../api/client';
import { AU_STATES } from '../../api/types';
import { Alert } from '../../components/ui';
import { fmtDateTime } from '../../utils/format';
import '../../assets/styles/pages-admin.css';

interface Enquiry {
  id: number; reference: string; kind: string; name: string; email: string; state: string; category: string;
  data: Record<string, string | string[]>; attachments: { name: string; index: number }[];
  status: string; notes: string; notificationSent: boolean; confirmationSent: boolean; createdAt: string;
}
const STATUSES: Record<string, string> = { NEW: '待处理', IN_REVIEW: '审核中', CONTACTED: '已联系', CLOSED: '已结案' };
const FIELDS: Record<string, string> = { name: '客户姓名', companyName: '公司名称', abn: '公司 ABN', yearsInBusiness: '经营年限', existingSalesNetwork: '现有销售网络', partnershipType: '意向合作类型', currentAnnualSales: '当前年销量', expectedAnnualSales: '预计年销量', state: '州 / 领地', city: '城市', businessOverview: '经营业务', interestedProducts: '意向产品', intendedTerritory: '目标区域', contactName: '联系人', phone: '联系电话', website: '公司网站', email: '邮箱', enquiryType: '咨询类别', message: '咨询 / 故障描述', productModel: '产品型号', purchaseDate: '购买日期', orderNumber: '订单号' };

export default function Enquiries() {
  const [records, setRecords] = useState<Enquiry[]>([]);
  const [filter, setFilter] = useState({ kind: '', state: '', status: '', category: '' });
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true; setError('');
    const query = new URLSearchParams(Object.entries(filter).filter(([, value]) => value));
    api.get<Enquiry[]>(`/api/admin/enquiries?${query}`).then((data) => { if (active) setRecords(data); }).catch((err: ApiError) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [filter, revision]);
  async function save() {
    if (!selected) return; setBusy(true); setError('');
    try { await api.put(`/api/admin/enquiries/${selected.id}`, { status: selected.status, notes: selected.notes }); setSelected(null); setRevision((value) => value + 1); }
    catch (err) { setError((err as ApiError).message); }
    finally { setBusy(false); }
  }
  async function attachment(file: { name: string; index: number }) {
    if (!selected) return;
    try {
      const response = await fetch(`/api/admin/enquiries/${selected.id}/attachments/${file.index}`, { headers: { Authorization: `Bearer ${getAccessToken()}` }, credentials: 'include' });
      if (!response.ok) throw new Error('附件下载失败，请重新登录后重试。');
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError((err as Error).message); }
  }
  return <>
    <h2>咨询、招商与售后 / Website Enquiries</h2><p className="muted">招商咨询与采购账户申请分别管理。这里的审核状态不会授予代理身份、价格或订购权限。显示最近 200 条符合筛选条件的记录。</p>
    {error && <Alert type="error">{error}</Alert>}
    <div className="panel form-grid-2">
      <div className="field"><label htmlFor="enquiry-kind">记录类型</label><select id="enquiry-kind" value={filter.kind} onChange={(event) => setFilter({ ...filter, kind: event.target.value })}><option value="">全部</option><option value="CONTACT">联系咨询</option><option value="PARTNERSHIP">招商申请</option><option value="SUPPORT">售后申请</option></select></div>
      <div className="field"><label htmlFor="enquiry-state">州 / 领地</label><select id="enquiry-state" value={filter.state} onChange={(event) => setFilter({ ...filter, state: event.target.value })}><option value="">全部</option>{AU_STATES.map((state) => <option key={state}>{state}</option>)}</select></div>
      <div className="field"><label htmlFor="enquiry-status">处理状态</label><select id="enquiry-status" value={filter.status} onChange={(event) => setFilter({ ...filter, status: event.target.value })}><option value="">全部</option>{Object.entries(STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="field"><label htmlFor="enquiry-category">咨询 / 产品渠道类别</label><select id="enquiry-category" value={filter.category} onChange={(event) => setFilter({ ...filter, category: event.target.value })}><option value="">全部</option>{['General Enquiries', 'Product Enquiries', 'Trade & Business Enquiries', 'Technical Support', 'Warranty & After-Sales', 'Smart Bathroom', 'Water Filtration', 'Custom Floor Drains'].map((category) => <option key={category}>{category}</option>)}</select></div>
    </div>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>编号 / 时间</th><th>联系人</th><th>分类 / 州</th><th>状态</th><th></th></tr></thead><tbody>
      {!records.length && <tr><td colSpan={5}>暂无符合条件的记录。</td></tr>}
      {records.map((record) => <tr key={record.id}><td>{record.reference}<br /><span className="small muted">{fmtDateTime(record.createdAt)}</span></td><td>{record.name}<br /><span className="small">{record.email}</span></td><td>{record.category}<br />{record.state}</td><td>{STATUSES[record.status]}</td><td><button className="btn btn-outline btn-sm" onClick={() => setSelected(record)}>查看 / 处理</button></td></tr>)}
    </tbody></table></div>
    {selected && <section className="panel mt-3"><h3>{selected.reference}</h3><dl className="enquiry-details">{Object.entries(selected.data).map(([key, value]) => <div key={key}><dt>{FIELDS[key] || key}</dt><dd>{Array.isArray(value) ? value.join(', ') : value || '—'}</dd></div>)}</dl>
      {selected.attachments.length > 0 && <div className="mt-2"><h4>购买凭证及故障图片（仅管理员可访问）</h4>{selected.attachments.map((file) => <button key={file.index} className="btn btn-outline btn-sm" onClick={() => void attachment(file)}>{file.name}</button>)}</div>}
      <p className="small">内部通知：{selected.notificationSent ? '已提交邮件服务' : '发送失败 / 待处理'}；客户确认邮件：{selected.confirmationSent ? '已提交邮件服务' : '发送失败 / 待处理'}。开发环境仅生成邮件日志，真实送达需配置 SMTP。</p><Link to="/admin/email-logs">查看邮件日志</Link>
      <div className="field mt-2"><label htmlFor="review-status">处理状态</label><select id="review-status" value={selected.status} onChange={(event) => setSelected({ ...selected, status: event.target.value })}>{Object.entries(STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="field"><label htmlFor="review-notes">内部处理备注</label><textarea id="review-notes" rows={3} maxLength={4000} value={selected.notes} onChange={(event) => setSelected({ ...selected, notes: event.target.value })} /></div><div className="flex gap-1"><button className="btn btn-primary" disabled={busy} onClick={() => void save()}>保存处理结果</button><button className="btn btn-ghost" disabled={busy} onClick={() => setSelected(null)}>关闭</button></div>
    </section>}
  </>;
}
