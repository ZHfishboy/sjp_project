import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '../services/api';

interface Props {
  isVip?: boolean;
  onHistoryRefresh?: () => void;
}

export default function Calculator({ isVip = false, onHistoryRefresh }: Props) {
  const nav = useNavigate();
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [angleMode, setAngleMode] = useState<'deg' | 'rad'>('deg');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState('');

  const append = useCallback((val: string) => {
    setError('');
    setMeta('');
    setExpression((prev) => prev + val);
  }, []);

  const clearAll = () => { setExpression(''); setResult(''); setError(''); setMeta(''); };
  const backspace = () => setExpression((prev) => prev.slice(0, -1));

  const evaluate = useCallback(async () => {
    if (!expression.trim()) return;
    setLoading(true);
    setError('');
    setMeta('');
    try {
      const data: any = await post('/calc/evaluate', { expression, angleMode });
      setResult(data.data.result);
      const tokens = data.data.tokensSpent;
      const time = data.data.responseTimeMs;
      if (tokens > 0) setMeta(`消耗 ${tokens} 币 · ${time}ms`);
      else if (time > 100) setMeta(`响应 ${time}ms 🐢`);
      else setMeta(`响应 ${time}ms ⚡`);
      onHistoryRefresh?.();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '计算错误';
      setError(msg);
      if (msg.includes('VIP') || msg.includes('开通 VIP')) {
        setMeta('👉 点击开通 VIP');
      }
    }
    setLoading(false);
  }, [expression, angleMode, onHistoryRefresh]);

  const keys = [
    ['C', '()', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['⌫', '0', '.', '='],
  ];

  const sciKeys = [
    { key: 'sin', vip: true },
    { key: 'cos', vip: true },
    { key: 'tan', vip: true },
    { key: 'log', vip: true },
    { key: 'ln', vip: true },
    { key: '√', vip: true },
    { key: 'π', vip: true },
    { key: '^', vip: true },
  ];

  const handleSci = (k: string) => {
    if (k === 'π') append('pi');
    else if (k === '√') append('sqrt(');
    else if (k === '^') append('^');
    else append(k + '(');
  };

  return (
    <div>
      {/* Sci bar */}
      <div className="sci-bar">
        <button
          onClick={() => setAngleMode(angleMode === 'deg' ? 'rad' : 'deg')}
          className="sci-key"
          style={{ background: angleMode === 'deg' ? 'var(--tb-orange)' : '#fff', color: angleMode === 'deg' ? '#fff' : 'var(--tb-text)', fontWeight: 700 }}
        >
          {angleMode === 'deg' ? 'DEG' : 'RAD'}
        </button>
        {sciKeys.map(({ key, vip }) => (
          <button
            key={key}
            className={`sci-key ${!isVip && vip ? 'locked' : ''}`}
            onClick={() => {
              if (!isVip && vip) {
                setError('普通用户仅支持两位数加减乘除');
                setMeta('开通 VIP 解锁全部科学计算 →');
                return;
              }
              handleSci(key);
            }}
            title={!isVip && vip ? 'VIP 功能' : key}
          >
            {key}{!isVip && vip ? ' 🔒' : ''}
          </button>
        ))}
      </div>

      {/* Display */}
      <div className="calc-display">
        <div className="expression">{expression || '\u00A0'}</div>
        <div className="result">{loading ? '···' : result || '0'}</div>
        {error && (
          <div className="meta" style={{ color: error.includes('VIP') ? 'var(--tb-orange)' : '#FF0036' }}>
            {error}
          </div>
        )}
        {meta && !error && <div className="meta" style={{ color: meta.includes('🐢') ? '#999' : 'var(--tb-green)' }}>{meta}</div>}
        {meta && error && <div className="meta" style={{ color: 'var(--tb-orange)', cursor: 'pointer' }} onClick={() => nav('/vip')}>{meta}</div>}
      </div>

      {/* Keypad */}
      <div className="calc-keypad">
        {keys.flat().map((key) => {
          const isOp = ['÷', '×', '-', '+', '%'].includes(key);
          const isEquals = key === '=';
          const isClear = key === 'C';
          const isBackspace = key === '⌫';
          const isParen = key === '()';

          return (
            <button
              key={key + Math.random()}
              className={`calc-key ${isOp ? 'op' : ''} ${isEquals ? 'equals' : ''} ${isClear ? 'clear' : ''}`}
              onClick={() => {
                if (isClear) clearAll();
                else if (isBackspace) backspace();
                else if (isEquals) evaluate();
                else if (key === '÷') append('/');
                else if (key === '×') append('*');
                else if (isParen) append('(');
                else append(key);
              }}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
