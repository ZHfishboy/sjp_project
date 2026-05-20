import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../services/api';

export default function UnitConverter() {
  const nav = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [category, setCategory] = useState('length');
  const [units, setUnits] = useState<any[]>([]);
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('km');
  const [value, setValue] = useState('1');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    get('/unit/categories').then((d: any) => {
      setCategories(d.data || []);
      const cat = (d.data || []).find((c: any) => c.category === 'length');
      if (cat) setUnits(cat.units || []);
    }).catch(() => {});
  }, []);

  const switchCategory = (catKey: string) => {
    setCategory(catKey);
    const cat = categories.find((c) => c.category === catKey);
    if (cat) {
      setUnits(cat.units || []);
      setFromUnit(cat.units[0]?.key || '');
      setToUnit(cat.units[1]?.key || '');
    }
    setResult(null);
  };

  const convert = async () => {
    if (!value) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const d: any = await post('/unit/convert', { value: parseFloat(value), fromUnit, toUnit, category });
      setResult(d.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || '换算失败';
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <div>
      {/* Category scroll */}
      <div style={{ display: 'flex', gap: 8, overflow: 'auto', paddingBottom: 12 }}>
        {categories.map((c: any) => (
          <button
            key={c.category}
            onClick={() => switchCategory(c.category)}
            style={{
              padding: '8px 16px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
              border: category === c.category ? '2px solid var(--tb-orange)' : '1px solid var(--tb-border)',
              background: category === c.category ? '#FFF8F3' : '#fff',
              color: category === c.category ? 'var(--tb-orange)' : 'var(--tb-text-secondary)',
              fontSize: 13, fontWeight: category === c.category ? 700 : 400, cursor: 'pointer',
            }}>
            {c.nameCN}{!c.isFree && ' 🔒'}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="tb-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--tb-text-secondary)', marginBottom: 12 }}>数值</div>
        <input
          className="tb-input"
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', border: 'none', background: 'transparent', padding: 0 }}
        />
      </div>

      {/* Unit selectors */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
        <select className="tb-input" value={fromUnit} onChange={e => setFromUnit(e.target.value)} style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>
          {units.map(u => <option key={u.key} value={u.key}>{u.key} ({u.nameCN})</option>)}
        </select>
        <div style={{ fontSize: 24, color: 'var(--tb-orange)', fontWeight: 700 }}>→</div>
        <select className="tb-input" value={toUnit} onChange={e => setToUnit(e.target.value)} style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>
          {units.map(u => <option key={u.key} value={u.key}>{u.key} ({u.nameCN})</option>)}
        </select>
      </div>

      <button className="tb-btn tb-btn-primary" onClick={convert} disabled={loading} style={{ marginBottom: 8 }}>
        {loading ? '换算中...' : '换算'}
      </button>

      {error && (
        <div style={{ padding: '10px 14px', background: '#FFF0F0', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          <div style={{ color: 'var(--tb-red)', marginBottom: error.includes('VIP') ? 8 : 0 }}>{error}</div>
          {error.includes('VIP') && (
            <button className="tb-btn tb-btn-primary tb-btn-sm" onClick={() => nav('/vip')} style={{ marginTop: 4 }}>
              开通 VIP →
            </button>
          )}
        </div>
      )}

      {result && (
        <div className="tb-card anim-slide-up" style={{ textAlign: 'center', padding: '20px 16px' }}>
          <div style={{ fontSize: 13, color: 'var(--tb-text-secondary)' }}>{result.formula}</div>
          <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--tb-orange)', marginTop: 8 }}>
            {result.toValue} <span style={{ fontSize: 16, fontWeight: 600 }}>{result.to}</span>
          </div>
        </div>
      )}
    </div>
  );
}
