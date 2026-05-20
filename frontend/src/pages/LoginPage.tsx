import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { post } from '../services/api';
import { setTokens, saveUserInfo } from '../services/auth';
import PageHeader from '../components/PageHeader';

export default function LoginPage() {
  const nav = useNavigate();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !password) { setError('请填写账号和密码'); return; }
    setLoading(true);
    setError('');
    try {
      const d: any = await post('/auth/login', { account, password, loginType: 'password' });
      const data = d.data;
      setTokens(data.accessToken, data.refreshToken);
      saveUserInfo({
        userId: data.userId, username: data.username, nickname: data.nickname,
        avatarUrl: data.avatarUrl, tokenBalance: data.tokenBalance,
        totalRecharge: data.totalRecharge, vipLevel: data.vipLevel, vipExpiresAt: data.vipExpiresAt,
      });
      nav('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', minHeight: '100vh', background: 'var(--tb-bg)' }}>
      <PageHeader title="登录" showBack />
      <div className="tb-form">
        <div className="tb-form-title">
          欢迎<span className="tb-gradient-text">回来</span>
        </div>
        <form onSubmit={handleLogin}>
          <div className="tb-form-group">
            <label className="tb-label">用户名</label>
            <input className="tb-input" value={account} onChange={e => setAccount(e.target.value)} placeholder="请输入用户名" autoFocus />
          </div>
          <div className="tb-form-group">
            <label className="tb-label">密码</label>
            <input className="tb-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码" />
          </div>
          {error && <div style={{ color: 'var(--tb-red)', fontSize: 14, marginBottom: 14, padding: '8px 12px', background: '#FFF0F0', borderRadius: 8 }}>{error}</div>}
          <button className="tb-btn tb-btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--tb-text-secondary)' }}>
          还没有账号？<Link to="/register" style={{ color: 'var(--tb-orange)', fontWeight: 600 }}>立即注册</Link>
        </div>
      </div>
    </div>
  );
}
