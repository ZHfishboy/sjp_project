import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../services/api';
import { isLoggedIn } from '../services/auth';
import PageHeader from '../components/PageHeader';

export default function VipPage() {
  const nav = useNavigate();
  const [status, setStatus] = useState<any>(null);
  const [tab, setTab] = useState<'time' | 'token'>('time');
  const [loading, setLoading] = useState(false);

  const timePlans = [
    { id: 'monthly', name: '月度 VIP', days: 30, price: 12, badge: '' },
    { id: 'quarterly', name: '季度 VIP', days: 90, price: 29, original: 36, badge: '热卖' },
    { id: 'annual', name: '年度 VIP', days: 365, price: 88, original: 144, badge: '推荐' },
    { id: 'perpetual', name: '永久 VIP', days: 0, price: 198, badge: '至尊' },
  ];

  const tokenPlans = [
    { id: 'tokens_100', name: '小试牛刀', tokens: 100, price: 6, unit: '¥0.06' },
    { id: 'tokens_500', name: '精打细算', tokens: 510, price: 25, unit: '¥0.05' },
    { id: 'tokens_1200', name: '算无遗策', tokens: 1250, price: 50, unit: '¥0.042' },
    { id: 'tokens_3000', name: '计算大师', tokens: 3200, price: 98, unit: '¥0.033' },
    { id: 'tokens_10000', name: '无限算力', tokens: 11200, price: 198, unit: '¥0.02' },
  ];

  useEffect(() => {
    if (!isLoggedIn()) { nav('/login'); return; }
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const d: any = await get('/vip/status');
      setStatus(d.data);
    } catch {}
  };

  const buyNow = async (type: string, planId: string) => {
    setLoading(true);
    try {
      const d: any = await post('/vip/order', { type, planId });
      alert(d.data?.message || '充值成功！');
      loadStatus();
    } catch (err: any) {
      alert(err.response?.data?.message || '操作失败');
    }
    setLoading(false);
  };

  if (!status) return (
    <div style={{ maxWidth: 500, margin: '0 auto', minHeight: '100vh', background: 'var(--tb-bg)' }}>
      <PageHeader title="VIP 中心" showBack />
      <div className="tb-page">加载中...</div>
    </div>
  );

  const tierEmoji = status.speedTier?.tier === 1 ? '⚡' : status.speedTier?.tier === 2 ? '🚗' : '🐢';
  const tierColors = { 1: 'var(--tb-orange)', 2: 'var(--tb-blue)', 3: '#999' };
  const tierColor = tierColors[status.speedTier?.tier as keyof typeof tierColors] || '#999';

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', minHeight: '100vh', background: 'var(--tb-bg)' }}>
      <PageHeader title="VIP 中心" showBack />
      <div className="tb-page">
        {/* Status Hero */}
        <div className="tb-card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #1a1a1a, #333)', color: '#fff' }}>
          <div style={{ fontSize: 48, marginBottom: 4 }}>{tierEmoji}</div>
          <div style={{ fontSize: 15, opacity: 0.8 }}>
            {status.vip ? status.vip.levelName : '免费用户'}
            {status.vip && (status.vip.isPerpetual ? ' · 永久' : ` · 剩余 ${status.vip.daysLeft} 天`)}
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: tierColor, marginTop: 8 }}>
            {status.wallet?.balance || 0}
            <span style={{ fontSize: 14, color: '#aaa', marginLeft: 4 }}>计算币</span>
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            累计充值 ¥{status.totalRecharge || 0}
            {status.speedUpgrade?.nextTier && (
              <span> · 距{status.speedUpgrade.nextTier.emoji}还需 ¥{status.speedUpgrade.needRecharge}</span>
            )}
          </div>
        </div>

        {/* Tab */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setTab('time')}
            style={{ flex: 1, padding: '10px 0', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              background: tab === 'time' ? 'var(--tb-orange)' : '#fff', color: tab === 'time' ? '#fff' : 'var(--tb-text)',
            }}
          >
            🕐 买时套餐
          </button>
          <button
            onClick={() => setTab('token')}
            style={{ flex: 1, padding: '10px 0', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              background: tab === 'token' ? 'var(--tb-orange)' : '#fff', color: tab === 'token' ? '#fff' : 'var(--tb-text)',
            }}
          >
            🪙 买量套餐
          </button>
        </div>

        {/* Plans */}
        <div className="plans-grid">
          {(tab === 'time' ? timePlans : tokenPlans).map((plan: any, idx: number) => {
            const isRec = plan.badge === '推荐' || plan.id === 'tokens_1200';
            return (
              <div key={plan.id} className={`tb-plan-card ${isRec ? 'recommended' : ''}`}>
                {plan.badge && <div className="tb-plan-badge">{plan.badge}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{plan.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--tb-text-secondary)', marginTop: 2 }}>
                      {tab === 'time' ? (plan.days > 0 ? `${plan.days}天` : '永久有效') : `${plan.tokens} 计算币`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="tb-plan-price">
                      <span className="unit">¥</span>{plan.price}
                    </div>
                    {plan.original && <div style={{ fontSize: 12, textDecoration: 'line-through', color: 'var(--tb-text-muted)' }}>¥{plan.original}</div>}
                  </div>
                </div>
                {tab === 'token' && <div style={{ fontSize: 11, color: 'var(--tb-text-secondary)', marginTop: 4 }}>{plan.unit}/币</div>}
                <button
                  className="tb-btn tb-btn-primary"
                  style={{ marginTop: 12, padding: '10px 0', fontSize: 14 }}
                  onClick={() => buyNow(tab === 'time' ? 'time' : 'token', plan.id)}
                  disabled={loading}
                >
                  {plan.price === 0 ? '免费领取' : '立即购买'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Features */}
        <div className="tb-divider" style={{ margin: '24px -14px' }} />

        <div className="tb-card-title">VIP 专属特权</div>
        {(status.features || []).map((f: any) => {
          const unlocked = status.unlockedFeatures?.includes(f.key) || status.vip;
          return (
            <div key={f.key} className="feature-item" style={{ opacity: unlocked ? 1 : 0.55 }}>
              <div className="fi-icon">{f.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{f.name}</div>
                <div style={{ fontSize: 12, color: 'var(--tb-text-secondary)' }}>{f.desc}</div>
              </div>
              <span className={`tb-tag ${unlocked ? 'tb-tag-green' : 'tb-tag-gray'}`}>
                {unlocked ? '已解锁' : '🔒 VIP'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
