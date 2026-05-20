import React, { useState, useEffect } from 'react';
import { get, post } from '../services/api';

const popular = ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'KRW'];

export default function ExchangeConverter() {
  const [currencies, setCurrencies] = useState<{ code: string; name: string }[]>([]);
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('CNY');
  const [amount, setAmount] = useState('100');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    get('/exchange/currencies').then((d: any) => setCurrencies(d.data || [])).catch(() => {});
  }, []);

  const convert = async () => {
    if (!amount) return;
    setLoading(true);
    try {
      const d: any = await post('/exchange/convert', { from, to, amount: parseFloat(amount) });
      setResult(d.data);
    } catch {}
    setLoading(false);
  };

  return (
    <div>
      <div className="tb-card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #FFF8F3, #FFECD2)' }}>
        <div style={{ fontSize: 13, color: 'var(--tb-text-secondary)', marginBottom: 16 }}>金额</div>
        <input
          className="tb-input"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', border: 'none', background: 'transparent', padding: 0 }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
        <select className="tb-input" value={from} onChange={e => setFrom(e.target.value)} style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>
          {currencies.map(c => <option key={c.code} value={c.code}>{c.code} {c.name}</option>)}
        </select>
        <div style={{ fontSize: 24, color: 'var(--tb-orange)', fontWeight: 700 }}>→</div>
        <select className="tb-input" value={to} onChange={e => setTo(e.target.value)} style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>
          {currencies.map(c => <option key={c.code} value={c.code}>{c.code} {c.name}</option>)}
        </select>
      </div>

      {/* Quick select */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {popular.map(c => (
          <button key={c} onClick={() => setFrom(c)}
            style={{
              padding: '4px 10px', borderRadius: 14, border: from === c ? '2px solid var(--tb-orange)' : '1px solid var(--tb-border)',
              background: from === c ? '#FFF8F3' : '#fff', color: from === c ? 'var(--tb-orange)' : 'var(--tb-text-secondary)',
              fontSize: 12, fontWeight: from === c ? 700 : 400, cursor: 'pointer',
            }}>
            {c}
          </button>
        ))}
      </div>

      <button className="tb-btn tb-btn-primary" onClick={convert} disabled={loading} style={{ marginBottom: 16 }}>
        {loading ? '换算中...' : '立即换算'}
      </button>

      {result && (
        <div className="tb-card anim-slide-up" style={{ textAlign: 'center', padding: '20px 16px' }}>
          <div style={{ fontSize: 14, color: 'var(--tb-text-secondary)' }}>
            {result.fromAmount} {result.from} =
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, color: 'var(--tb-orange)', margin: '8px 0' }}>
            {result.toAmount} <span style={{ fontSize: 18, fontWeight: 600 }}>{result.to}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--tb-text-muted)' }}>
            1 {result.from} = {result.rate} {result.to}
          </div>
        </div>
      )}
    </div>
  );
}
