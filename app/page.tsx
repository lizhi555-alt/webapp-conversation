'use client'
import { useState, useRef, useEffect } from 'react'

const navItems = [
  { key: 'companyIntro', label: '公司介绍', icon: '🏢', color: '#4CAF50', prompt: '请介绍一下公司' },
  { key: 'growthPath', label: '成长路径', icon: '📈', color: '#2196F3', prompt: '请介绍代理人的成长路径' },
  { key: 'productSystem', label: '产品体系', icon: '🛡️', color: '#FF9800', prompt: '请介绍产品体系' },
]

const planItems = [
  { key: 'plan1', num: 1, label: '创建百人拓展计划', icon: '👥', prompt: '帮我创建一个百人拓展计划' },
  { key: 'plan2', num: 2, label: '找出高潜力客户', icon: '🎯', prompt: '帮我找出高潜力客户的方法' },
  { key: 'plan3', num: 3, label: '学习客户跟进与沟通技巧', icon: '📚', prompt: '教我客户跟进与沟通技巧' },
  { key: 'plan4', num: 4, label: '模拟一次客户洽谈', icon: '🤝', prompt: '帮我模拟一次客户洽谈场景' },
  { key: 'plan5', num: 5, label: '生成保险方案', icon: '📋', prompt: '帮我生成一份保险方案' },
  { key: 'plan6', num: 6, label: '复盘一次沟通或成交', icon: '🔄', prompt: '帮我复盘一次沟通或成交过程' },
]

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul]|<hr)(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
}

type Message = { role: 'user' | 'assistant'; content: string }

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState('')
  const [menuOpen, setMenuOpen] = useState(true)   // 功能菜单展开状态
  const [chatStarted, setChatStarted] = useState(false) // 是否已开始对话
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text: string, prevMessages: Message[], convId: string) => {
    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...prevMessages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setChatStarted(true)
    setMenuOpen(false) // 发送消息后收起菜单

    try {
      const res = await fetch('/api/chat-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, conversation_id: convId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let newConvId = convId
      let buffer = ''

      setMessages([...newMessages, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('event:')) continue
          if (!trimmed.startsWith('data:')) continue
          const jsonStr = trimmed.replace(/^data:\s*/, '')
          if (!jsonStr || jsonStr === '[DONE]') continue
          try {
            const data = JSON.parse(jsonStr)
            let answer = ''
            if (data.answer) answer = data.answer
            else if (data.data?.text) answer = data.data.text
            if (answer) {
              if (data.event === 'message') assistantContent = answer
              else assistantContent += answer
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                return updated
              })
            }
            if (data.conversation_id && !newConvId) {
              newConvId = data.conversation_id
              setConversationId(newConvId)
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        if (updated[updated.length - 1]?.role === 'assistant') {
          updated[updated.length - 1] = { role: 'assistant', content: '出错了，请稍后重试 😔' }
        } else {
          updated.push({ role: 'assistant', content: '出错了，请稍后重试 😔' })
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => {
    if (!input.trim() || loading) return
    sendMessage(input.trim(), messages, conversationId)
  }

  const handlePlanClick = (prompt: string) => {
    sendMessage(prompt, messages, conversationId)
  }

  const handleNavClick = (prompt: string) => {
    sendMessage(prompt, messages, conversationId)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }

        .page-wrap {
          height: 100vh;
          background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
          font-family: 'Noto Serif SC', serif;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        /* ===== TOP HEADER ===== */
        .top-header {
          flex-shrink: 0;
          padding: 16px 20px 12px;
          background: rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(20px);
        }
        .header-inner {
          max-width: 640px; margin: 0 auto;
          display: flex; align-items: center; gap: 12px;
        }
        .header-logo {
          width: 38px; height: 38px; border-radius: 10px;
          background: linear-gradient(135deg, #43e97b, #38f9d7);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
          box-shadow: 0 3px 12px rgba(67,233,123,0.35);
        }
        .header-text { flex: 1; min-width: 0; }
        .header-sub { font-size: 10px; color: rgba(255,255,255,0.4); letter-spacing: 2px; }
        .header-title { font-size: 13px; color: rgba(255,255,255,0.9); font-weight: 700; }

        /* Nav pills */
        .nav-pills {
          display: flex; gap: 8px; flex-shrink: 0;
        }
        .nav-pill {
          padding: 6px 12px; border-radius: 20px; border: 1.5px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05); cursor: pointer;
          font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.7);
          font-family: 'Noto Serif SC', serif;
          transition: all 0.2s ease; display: flex; align-items: center; gap: 4px;
          white-space: nowrap;
        }
        .nav-pill:hover { border-color: var(--pill-color); color: var(--pill-color); background: rgba(255,255,255,0.08); }

        /* ===== CHAT AREA ===== */
        .chat-area {
          flex: 1; overflow-y: auto; padding: 20px;
          display: flex; flex-direction: column;
        }
        .chat-area::-webkit-scrollbar { width: 4px; }
        .chat-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

        .chat-inner { max-width: 640px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 16px; flex: 1; }

        /* Welcome screen */
        .welcome {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; gap: 16px; padding: 20px 0;
          animation: fadeIn 0.5s ease;
        }
        .welcome-icon { font-size: 48px; }
        .welcome-title { font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.9); }
        .welcome-desc { font-size: 13px; color: rgba(255,255,255,0.5); line-height: 1.7; max-width: 320px; }

        /* Messages */
        .msg { display: flex; gap: 10px; max-width: 88%; animation: fadeInUp 0.3s ease; }
        .msg.user { align-self: flex-end; flex-direction: row-reverse; }
        .msg.assistant { align-self: flex-start; }
        .msg-avatar {
          width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 14px;
          background: rgba(255,255,255,0.08); margin-top: 2px;
        }
        .msg-bubble {
          padding: 10px 14px; border-radius: 16px; font-size: 13px; line-height: 1.8;
          word-break: break-word;
        }
        .msg.user .msg-bubble {
          background: linear-gradient(135deg, #43e97b, #38f9d7);
          color: #0f2027; border-top-right-radius: 4px; font-weight: 500;
        }
        .msg.assistant .msg-bubble {
          background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.88);
          border-top-left-radius: 4px;
        }
        .msg-bubble h1 { font-size: 16px; font-weight: 700; color: #fff; margin: 8px 0 6px; }
        .msg-bubble h2 { font-size: 14px; font-weight: 700; color: #fff; margin: 10px 0 5px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; }
        .msg-bubble h3 { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 8px 0 4px; }
        .msg-bubble p { margin: 4px 0; }
        .msg-bubble ul { padding-left: 16px; margin: 4px 0; }
        .msg-bubble li { margin: 3px 0; }
        .msg-bubble strong { color: #fff; font-weight: 700; }
        .msg-bubble hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 8px 0; }

        .typing { display: flex; gap: 4px; align-items: center; padding: 4px 0; }
        .typing span {
          width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.4);
          animation: bounce 1.2s ease-in-out infinite;
        }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }

        /* ===== BOTTOM INPUT AREA ===== */
        .bottom-area {
          flex-shrink: 0;
          padding: 12px 20px 20px;
          background: rgba(255,255,255,0.03);
          border-top: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(10px);
        }
        .bottom-inner { max-width: 640px; margin: 0 auto; }

        /* 浮窗菜单 */
        .floating-menu {
          margin-bottom: 12px;
          overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease;
        }
        .floating-menu.open { max-height: 500px; opacity: 1; }
        .floating-menu.closed { max-height: 0; opacity: 0; }

        .menu-grid {
          display: flex; flex-direction: column; gap: 7px;
          padding: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          backdrop-filter: blur(10px);
        }
        .menu-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          cursor: pointer; transition: all 0.2s ease;
          width: 100%;
        }
        .menu-item:hover { background: rgba(255,255,255,0.09); border-color: rgba(220,50,50,0.4); transform: translateX(4px); }
        .menu-num {
          width: 26px; height: 26px; border-radius: 7px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800;
          background: rgba(220,50,50,0.15); color: #ff5252;
          transition: all 0.2s;
        }
        .menu-item:hover .menu-num { background: #ff5252; color: #fff; }
        .menu-icon { font-size: 16px; flex-shrink: 0; }
        .menu-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.75); flex: 1; text-align: left; }
        .menu-item:hover .menu-label { color: rgba(255,255,255,0.95); }
        .menu-arrow { font-size: 12px; color: rgba(255,255,255,0.2); transition: all 0.2s; }
        .menu-item:hover .menu-arrow { color: #ff5252; transform: translateX(3px); }

        /* 浮窗触发按钮 */
        .menu-toggle-row {
          display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
        }
        .menu-toggle-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 20px;
          border: 1.5px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.06);
          cursor: pointer; transition: all 0.2s ease;
          font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.65);
          font-family: 'Noto Serif SC', serif;
        }
        .menu-toggle-btn:hover { border-color: rgba(255,82,82,0.5); color: #ff5252; background: rgba(255,82,82,0.08); }
        .menu-toggle-btn.active { border-color: rgba(255,82,82,0.6); color: #ff5252; background: rgba(255,82,82,0.1); }
        .toggle-icon { font-size: 14px; transition: transform 0.3s ease; }
        .menu-toggle-btn.active .toggle-icon { transform: rotate(180deg); }
        .toggle-divider { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }

        /* 输入框行 */
        .input-row { display: flex; gap: 10px; align-items: flex-end; }
        .chat-input {
          flex: 1; background: rgba(255,255,255,0.08);
          border: 1.5px solid rgba(255,255,255,0.12);
          border-radius: 14px; padding: 12px 16px;
          color: #fff; font-size: 14px;
          font-family: 'Noto Serif SC', serif; outline: none; resize: none;
          transition: border-color 0.2s; line-height: 1.5; max-height: 120px;
        }
        .chat-input::placeholder { color: rgba(255,255,255,0.3); }
        .chat-input:focus { border-color: rgba(255,255,255,0.28); }
        .send-btn {
          width: 44px; height: 44px; border-radius: 13px; border: none;
          background: linear-gradient(135deg, #43e97b, #38f9d7);
          color: #0f2027; font-size: 17px; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; font-weight: 700;
        }
        .send-btn:hover:not(:disabled) { transform: scale(1.08); filter: brightness(1.1); }
        .send-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

        @keyframes fadeInDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes bounce { 0%,80%,100% { transform:translateY(0); } 40% { transform:translateY(-6px); } }
        @keyframes pulse { 0%,100% { opacity:.6; } 50% { opacity:1; } }
      `}</style>

      <div className="page-wrap">

        {/* 顶部 Header */}
        <div className="top-header">
          <div className="header-inner">
            <div className="header-logo">✨</div>
            <div className="header-text">
              <div className="header-sub">INTELLIGENT AI ASSISTANT</div>
              <div className="header-title">智能AI代理助手</div>
            </div>
            <div className="nav-pills">
              {navItems.map(item => (
                <button key={item.key} className="nav-pill"
                  style={{ '--pill-color': item.color } as React.CSSProperties}
                  onClick={() => handleNavClick(item.prompt)}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 对话区域 */}
        <div className="chat-area">
          <div className="chat-inner">
            {!chatStarted ? (
              <div className="welcome">
                <div className="welcome-icon">🤖</div>
                <div className="welcome-title">您好，我是您的专属助手</div>
                <div className="welcome-desc">
                  点击下方功能模块快速开始，或直接输入您的问题，我会全程陪伴您成长！
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={`msg ${msg.role}`}>
                    <div className="msg-avatar"
                      style={msg.role === 'user' ? { background: 'linear-gradient(135deg,#43e97b,#38f9d7)', color: '#0f2027' } : {}}>
                      {msg.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div className="msg-bubble">
                      {msg.role === 'assistant' && !msg.content && loading && i === messages.length - 1 ? (
                        <div className="typing"><span /><span /><span /></div>
                      ) : msg.role === 'assistant' ? (
                        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* 底部输入区 */}
        <div className="bottom-area">
          <div className="bottom-inner">

            {/* 功能菜单浮窗 */}
            <div className={`floating-menu ${menuOpen ? 'open' : 'closed'}`}>
              <div className="menu-grid">
                {planItems.map(item => (
                  <button key={item.key} className="menu-item"
                    onClick={() => handlePlanClick(item.prompt)}>
                    <div className="menu-num">{item.num}</div>
                    <span className="menu-icon">{item.icon}</span>
                    <span className="menu-label">{item.label}</span>
                    <span className="menu-arrow">→</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 浮窗开关 + 输入框 */}
            <div className="menu-toggle-row">
              <button
                className={`menu-toggle-btn ${menuOpen ? 'active' : ''}`}
                onClick={() => setMenuOpen(!menuOpen)}>
                <span className="toggle-icon">⚡</span>
                <span>功能模块</span>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>{menuOpen ? '▲' : '▼'}</span>
              </button>
              <div className="toggle-divider" />
              {chatStarted && (
                <button
                  onClick={() => { setMessages([]); setConversationId(''); setChatStarted(false); setMenuOpen(true); }}
                  style={{
                    padding: '6px 12px', borderRadius: '20px', border: '1.5px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '11px',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
                  🔄 新对话
                </button>
              )}
            </div>

            <div className="input-row">
              <textarea
                ref={inputRef}
                className="chat-input"
                rows={1}
                placeholder="输入您的问题，Enter 发送..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
                onInput={e => {
                  const t = e.currentTarget
                  t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px'
                }}
              />
              <button className="send-btn" onClick={handleSend} disabled={loading || !input.trim()}>
                ➤
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
