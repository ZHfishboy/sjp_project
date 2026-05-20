import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../services/api';
import { isLoggedIn, logout, getUserInfo } from '../services/auth';
import PageHeader from '../components/PageHeader';

export default function ProfilePage() {
  const nav = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const user = getUserInfo();

  useEffect(() => {
    if (!isLoggedIn()) { nav('/login'); return; }
    get('/user/profile').then((d: any) => setProfile(d.data)).catch(() => {});
  }, []);

  const handleLogout = () => {
    if (!confirm('确定退出登录吗？')) return;
    logout();
    nav('/login');
  };

  if (!profile) return (
    <div style={{ maxWidth: 500, margin: '0 auto', minHeight: '100vh', background: 'var(--tb-bg)' }}>
      <PageHeader title="个人中心" showBack />
      <div className="tb-page anim-slide-up">加载中...</div>
    </div>
  );

  const t = profile.rateTier?.tier;
  const tierEmoji = t === 1 ? '⚡ 闪电模式' : t === 2 ? '🚗 正常模式' : '🐢 乌龟模式';
  const tierColor = t === 1 ? 'var(--tb-orange)' : t === 2 ? 'var(--tb-blue)' : '#999';

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', minHeight: '100vh', background: 'var(--tb-bg)' }}>
      <PageHeader title="个人中心" showBack />
      <div className="tb-page anim-slide-up">
        {/* User Card */}
        <div className="tb-card" style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div className="tb-avatar">
            {profile.nickname?.[0] || profile.username?.[0] || '?'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10 }}>{profile.nickname || profile.username}</div>
          <div style={{ fontSize: 13, color: 'var(--tb-text-secondary)' }}>@{profile.username}</div>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 16 }}>
            <span className="tb-tag tb-tag-orange">邀请码 {profile.inviteCode}</span>
            {profile.vip && (
              <span className="tb-tag tb-tag-green">
                {['', '月度', '季度', '年度', '永久'][profile.vip.level]} VIP
              </span>
            )}
          </div>
        </div>

        {/* Wallet */}
        <div className="tb-wallet">
          <div className="tb-wallet-item">
            <div className="value">{profile.wallet?.tokenBalance || 0}</div>
            <div className="label">计算币余额</div>
          </div>
          <div className="tb-wallet-item">
            <div className="value">¥{profile.totalRecharge || 0}</div>
            <div className="label">累计充值</div>
          </div>
        </div>

        {/* Rate Tier */}
        <div className="tb-card tb-card-accent" style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: tierColor }}>{tierEmoji}</div>
          <div style={{ fontSize: 13, color: 'var(--tb-text-secondary)', marginTop: 4 }}>
            延迟 {profile.rateTier?.delayMs}ms · 并发 {profile.rateTier?.maxConcurrency === 999 ? '无限' : profile.rateTier?.maxConcurrency}
          </div>
        </div>

        {/* Nav */}
        <button className="tb-btn tb-btn-outline" onClick={() => nav('/vip')} style={{ marginBottom: 8, marginTop: 8 }}>👑 VIP 中心</button>
        <button className="tb-btn tb-btn-outline" onClick={() => nav('/invite')} style={{ marginBottom: 8 }}>🎁 邀请好友</button>
        <button className="tb-btn tb-btn-outline" onClick={() => nav('/')} style={{ marginBottom: 8 }}>🏠 返回首页</button>
        <button className="tb-btn tb-btn-danger" onClick={handleLogout} style={{ marginTop: 16 }}>退出登录</button>
      </div>
    </div>
  );
}
