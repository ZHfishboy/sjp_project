import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { post, get } from '../services/api';
import { setTokens, saveUserInfo } from '../services/auth';
import PageHeader from '../components/PageHeader';

export default function RegisterPage() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('请填写用户名和密码'); return; }
    if (password.length < 8) { setError('密码至少8位'); return; }
    setLoading(true);
    setError('');
    try {
      const payload: any = { username, password };
      try {
        const cap: any = await get('/captcha/image?type=arithmetic');
        const answer = prompt(`请计算验证码: ${cap.data?.data?.expression}`);
        if (answer) { payload.captchaId = cap.data?.captchaId; payload.captchaAnswer = answer; }
      } catch {}
      const d: any = await post('/auth/register', payload);
      const data = d.data;
      setTokens(data.accessToken, data.refreshToken);
      saveUserInfo({ userId: data.userId, username: data.username, tokenBalance: 50, totalRecharge: 0 });
      nav('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', minHeight: '100vh', background: 'var(--tb-bg)' }}>
      <PageHeader title="注册" showBack />
      <div className="tb-form">
        <div className="tb-form-title">
          加入<span className="tb-gradient-text">高级效率计算器</span>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #FFF8F3, #FFF0E8)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--tb-orange)', fontWeight: 600 }}>
          🎁 注册即送 <span style={{ fontSize: 16 }}>50 计算币</span> + 3天 VIP 体验
        </div>
        <form onSubmit={handleRegister}>
          <div className="tb-form-group">
            <label className="tb-label">用户名</label>
            <input className="tb-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="3-50位字母数字" />
          </div>
          <div className="tb-form-group">
            <label className="tb-label">密码</label>
            <input className="tb-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8-20位，包含大小写+数字+符号" />
          </div>
          {error && <div style={{ color: 'var(--tb-red)', fontSize: 14, marginBottom: 14, padding: '8px 12px', background: '#FFF0F0', borderRadius: 8 }}>{error}</div>}
          <button className="tb-btn tb-btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? '注册中...' : '立即注册'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--tb-text-secondary)' }}>
          已有账号？<Link to="/login" style={{ color: 'var(--tb-orange)', fontWeight: 600 }}>立即登录</Link>
        </div>
      </div>
    </div>
  );
}
