'use client'
import { useState } from 'react'

const DIFY_CHAT_URL = 'https://webapp-conversation-three-tau.vercel.app'

const navItems = [
  { key: 'companyIntro', label: '公司介绍', icon: '🏢', color: '#4CAF50' },
  { key: 'growthPath', label: '成长路径', icon: '📈', color: '#2196F3' },
  { key: 'productSystem', label: '产品体系', icon: '🛡️', color: '#FF9800' },
]

const planItems = [
  { key: 'plan1', num: 1, label: '创建百人拓展计划', icon: '👥', color: '#0D47A1' },
  { key: 'plan2', num: 2, label: '找出高潜力客户', icon: '🎯', color: '#E65100' },
  { key: 'plan3', num: 3, label: '学习客户跟进与沟通技巧', icon: '📚', color: '#1B5E20' },
  { key: 'plan4', num: 4, label: '模拟一次客户洽谈', icon: '🤝', color: '#4A148C' },
  { key: 'plan5', num: 5, label: '生成保险方案', icon: '📋', color: '#F57F17' },
  { key: 'plan6', num: 6, label: '复盘一次沟通或成交', icon: '🔄', color: '#006064' },
]

type ModalInfo = { title: string; icon: string; color: string } | null

export default function Home() {
  const [modal, setModal] = useState<ModalInfo>(null)

  const openModal = (title: string, icon: string, color: string) => {
    setModal({ title, icon, color })
  }

  const closeModal = () => {
    setModal(null)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');

        html, body { margin: 0; padding: 0; }

        .page-wrap {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
          font-family: 'Noto Serif SC', serif;
          padding: 32px 20px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        .container { width: 100%; max-width: 520px; animation: fadeInDown 0.6s ease both; }

        .header-card {
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          padding: 28px 28px 24px;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }
        .header-card::before {
          content: '';
          position: absolute; top: -40px; right: -40px;
          width: 140px; height: 140px; border-radius: 50%;
          background: radial-gradient(circle, rgba(100,200,255,0.15) 0%, transparent 70%);
          animation: pulse 3s ease-in-out infinite;
        }
        .header-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .header-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #43e97b, #38f9d7);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; flex-shrink: 0;
          box-shadow: 0 4px 15px rgba(67,233,123,0.35);
        }
        .header-sub { font-size: 11px; color: rgba(255,255,255,0.45); letter-spacing: 2px; }
        .header-title { font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 600; line-height: 1.4; }
        .header-desc { font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.7; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; }

        .nav-row { display: flex; gap: 12px; margin-bottom: 20px; animation: fadeInUp 0.6s 0.1s ease both; opacity: 0; animation-fill-mode: forwards; }
        .nav-btn {
          flex: 1; padding: 14px 8px; border-radius: 14px;
          border: 2px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(10px); cursor: pointer;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .nav-btn:hover { transform: translateY(-4px) scale(1.05); background: rgba(255,255,255,0.1); border-color: var(--btn-color); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
        .nav-btn .nav-icon { font-size: 22px; }
        .nav-btn .nav-label { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.8); }
        .nav-btn:hover .nav-label { color: var(--btn-color); }

        .divider { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; animation: fadeInUp 0.6s 0.2s ease both; opacity: 0; animation-fill-mode: forwards; }
        .divider-line { height: 1px; flex: 1; background: rgba(255,255,255,0.12); }
        .divider-text { font-size: 11px; color: rgba(255,255,255,0.4); letter-spacing: 2px; }

        .plan-list { display: flex; flex-direction: column; gap: 10px; animation: fadeInUp 0.6s 0.3s ease both; opacity: 0; animation-fill-mode: forwards; }
        .plan-btn {
          display: flex; align-items: center; gap: 16px;
          padding: 16px 20px; border-radius: 14px;
          border: 1.5px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(8px); cursor: pointer; text-align: left; width: 100%;
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .plan-btn:hover { transform: translateX(8px) scale(1.02); background: rgba(255,255,255,0.08); border-color: var(--plan-color); }
        .plan-num {
          width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 800;
          background: rgba(255,255,255,0.1); color: var(--plan-color);
          transition: all 0.25s ease;
        }
        .plan-btn:hover .plan-num { background: var(--plan-color); color: #fff; }
        .plan-icon { font-size: 20px; flex-shrink: 0; }
        .plan-label { font-size: 14px; font-weight: 600; flex: 1; color: rgba(255,255,255,0.75); transition: color 0.2s; }
        .plan-btn:hover .plan-label { color: rgba(255,255,255,0.95); }
        .plan-arrow { font-size: 14px; color: rgba(255,255,255,0.2); transition: all 0.25s; }
        .plan-btn:hover .plan-arrow { color: var(--plan-color); transform: translateX(4px); }

        .footer { margin-top: 24px; text-align: center; font-size: 11px; color: rgba(255,255,255,0.2); letter-spacing: 1px; animation: fadeInUp 0.6s 0.45s ease both; opacity: 0; animation-fill-mode: forwards; }

        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: fadeIn 0.25s ease;
        }
        .modal {
          width: 100%; max-width: 480px; height: 680px;
          background: #1a2a35;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 24px 80px rgba(0,0,0,0.6);
          display: flex; flex-direction: column; overflow: hidden;
          animation: slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1);
        }
        .modal-header {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 20px;
          background: rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          flex-shrink: 0;
        }
        .modal-header-icon {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
        }
        .modal-title { font-size: 15px; font-weight: 700; color: #fff; flex: 1; }
        .modal-close {
          width: 30px; height: 30px; border-radius: 8px; border: none;
          background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6);
          font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .modal-close:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .modal-body { flex: 1; overflow: hidden; }
        .modal-body iframe { width: 100%; height: 100%; border: none; display: block; }

        @keyframes fadeInDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(30px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes pulse { 0%,100% { opacity:.6; } 50% { opacity:1; } }
      `}</style>

      <div className="page-wrap">
        <div className="container">

          {/* Header */}
          <div className="header-card">
            <div className="header-top">
              <div className="header-icon">✨</div>
              <div>
                <div className="header-sub">智能AI代理助手</div>
                <div className="header-title">您的专属全能伙伴与成长导师</div>
              </div>
            </div>
            <div className="header-desc">欢迎使用智能AI代理助手——助力代理人在职业发展中追求卓越。</div>
          </div>

          {/* Top Nav */}
          <div className="nav-row">
            {navItems.map(item => (
              <button
                key={item.key}
                className="nav-btn"
                style={{ '--btn-color': item.color } as React.CSSProperties}
                onClick={() => openModal(item.label, item.icon, item.color)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">功能模块</span>
            <div className="divider-line" />
          </div>

          {/* Plans */}
          <div className="plan-list">
            {planItems.map(item => (
              <button
                key={item.key}
                className="plan-btn"
                style={{ '--plan-color': item.color } as React.CSSProperties}
                onClick={() => openModal(item.label, item.icon, item.color)}
              >
                <div className="plan-num">{item.num}</div>
                <span className="plan-icon">{item.icon}</span>
                <span className="plan-label">{item.label}</span>
                <span className="plan-arrow">→</span>
              </button>
            ))}
          </div>

          <div className="footer">智能AI代理助手 · 专业版</div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="modal">
            <div className="modal-header">
              <div
                className="modal-header-icon"
                style={{ background: modal.color + '33' }}
              >
                {modal.icon}
              </div>
              <span className="modal-title">{modal.title}</span>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <iframe
                src={DIFY_CHAT_URL}
                allow="microphone"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
