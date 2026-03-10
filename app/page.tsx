'use client'
import { useState, useRef, useEffect } from 'react'

const navItems = [
  { key: 'companyIntro', label: '公司介绍', icon: '🏢', color: '#4CAF50', prompt: '请介绍一下公司' },
  { key: 'growthPath', label: '成长路径', icon: '📈', color: '#2196F3', prompt: '请介绍代理人的成长路径' },
  { key: 'productSystem', label: '产品体系', icon: '🛡️', color: '#FF9800', prompt: '请介绍产品体系' },
]

const planItems = [
  { key: 'plan1', num: 1, label: '创建百人拓展计划', icon: '👥', color: '#0D47A1', prompt: '帮我创建一个百人拓展计划' },
  { key: 'plan2', num: 2, label: '找出高潜力客户', icon: '🎯', color: '#E65100', prompt: '帮我找出高潜力客户的方法' },
  { key: 'plan3', num: 3, label: '学习客户跟进与沟通技巧', icon: '📚', color: '#1B5E20', prompt: '教我客户跟进与沟通技巧' },
  { key: 'plan4', num: 4, label: '模拟一次客户洽谈', icon: '🤝', color: '#4A148C', prompt: '帮我模拟一次客户洽谈场景' },
  { key: 'plan5', num: 5, label: '生成保险方案', icon: '📋', color: '#F57F17', prompt: '帮我生成一份保险方案' },
  { key: 'plan6', num: 6, label: '复盘一次沟通或成交', icon: '🔄', color: '#006064', prompt: '帮我复盘一次沟通或成交过程' },
]

// 简单的 Markdown 转 HTML
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
type ModalInfo = { title: string; icon: string; color: string; prompt: string } | null

export default function Home() {
  const [modal, setModal] = useState<ModalInfo>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const openModal = async (title: string, icon: string, color: string, prompt: string) => {
    setModal({ title, icon, color, prompt })
    setMessages([])
    setConversationId('')
    await sendMessage(prompt, [], '')
  }

  const closeModal = () => {
    setModal(null)
    setMessages([])
    setConversationId('')
    setLoading(false)
  }

  const sendMessage = async (text: string, prevMessages: Message[], convId: string) => {
    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...prevMessages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, conversation_id: convId }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let newConvId = convId
      let buffer = ''

      // 先加一个空的 assistant 消息占位
      setMessages([...newMessages, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // 按行处理，避免截断
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // 最后一行可能不完整，留着

        for (const line of lines) {
          const trimmed = line.trim()

          // 跳过空行、ping、event行
          if (!trimmed || trimmed === 'event: ping' || trimmed.startsWith('event:')) continue
          if (!trimmed.startsWith('data:')) continue

          const jsonStr = trimmed.replace(/^data:\s*/, '')
          if (!jsonStr || jsonStr === '[DONE]') continue

          try {
            const data = JSON.parse(jsonStr)

            // 获取 answer 字段（兼容多种事件）
            let answer = ''
            if (data.answer) {
              answer = data.answer
            } else if (data.data?.text) {
              answer = data.data.text
            }

            if (answer) {
              // Chatflow 是一次性返回完整内容，直接替换
              if (data.event === 'message') {
                assistantContent = answer
              } else {
                // 流式追加
                assistantContent += answer
              }
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

          } catch {
            // 跳过无法解析的行
          }
        }
      }

      // 如果最终还是空的，说明内容在 workflow_finished 的 outputs 里
      if (!assistantContent) {
        // 重新扫描 buffer 里可能剩余的内容
        const jsonStr = buffer.replace(/^data:\s*/, '').trim()
        if (jsonStr) {
          try {
            const data = JSON.parse(jsonStr)
            const answer = data.answer || data.data?.outputs?.answer || ''
            if (answer) {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: answer }
                return updated
              })
            }
          } catch { /* ignore */ }
        }
      }

    } catch (e) {
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }

        .page-wrap {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
          font-family: 'Noto Serif SC', serif;
          padding: 32px 20px;
          display: flex; justify-content: center; align-items: flex-start;
        }
        .container { width: 100%; max-width: 520px; animation: fadeInDown 0.6s ease both; }

        .header-card {
          background: rgba(255,255,255,0.06); backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.12); border-radius: 20px;
          padding: 28px 28px 24px; margin-bottom: 20px;
          position: relative; overflow: hidden;
        }
        .header-card::before {
          content: ''; position: absolute; top: -40px; right: -40px;
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
          border: 2px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.05);
          backdrop-filter: blur(10px); cursor: pointer;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .nav-btn:hover { transform: translateY(-4px) scale(1.05); background: rgba(255,255,255,0.1); border-color: var(--btn-color); }
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
          border: 1.5px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.04);
          backdrop-filter: blur(8px); cursor: pointer; text-align: left; width: 100%;
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .plan-btn:hover { transform: translateX(8px) scale(1.02); background: rgba(255,255,255,0.08); border-color: var(--plan-color); }
        .plan-num {
          width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 800;
          background: rgba(255,255,255,0.1); color: var(--plan-color); transition: all 0.25s;
        }
        .plan-btn:hover .plan-num { background: var(--plan-color); color: #fff; }
        .plan-icon { font-size: 20px; flex-shrink: 0; }
        .plan-label { font-size: 14px; font-weight: 600; flex: 1; color: rgba(255,255,255,0.75); }
        .plan-btn:hover .plan-label { color: rgba(255,255,255,0.95); }
        .plan-arrow { font-size: 14px; color: rgba(255,255,255,0.2); transition: all 0.25s; }
        .plan-btn:hover .plan-arrow { color: var(--plan-color); transform: translateX(4px); }

        .footer { margin-top: 24px; text-align: center; font-size: 11px; color: rgba(255,255,255,0.2); letter-spacing: 1px; animation: fadeInUp 0.6s 0.45s ease both; opacity: 0; animation-fill-mode: forwards; }

        .modal-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px; animation: fadeIn 0.25s ease;
        }
        .modal {
          width: 100%; max-width: 560px; height: 80vh; max-height: 760px;
          background: #1a2a35; border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 24px 80px rgba(0,0,0,0.6);
          display: flex; flex-direction: column; overflow: hidden;
          animation: slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1);
        }
        .modal-header {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 18px; background: rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;
        }
        .modal-header-icon {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; font-size: 17px;
        }
        .modal-title { font-size: 15px; font-weight: 700; color: #fff; flex: 1; }
        .modal-close {
          width: 28px; height: 28px; border-radius: 8px; border: none;
          background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6);
          font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .modal-close:hover { background: rgba(255,255,255,0.15); color: #fff; }

        .chat-body {
          flex: 1; overflow-y: auto; padding: 16px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .chat-body::-webkit-scrollbar { width: 4px; }
        .chat-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

        .msg { display: flex; gap: 8px; max-width: 92%; }
        .msg.user { align-self: flex-end; flex-direction: row-reverse; }
        .msg.assistant { align-self: flex-start; }
        .msg-avatar {
          width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 14px;
          background: rgba(255,255,255,0.08); margin-top: 2px;
        }
        .msg-bubble {
          padding: 10px 14px; border-radius: 14px; font-size: 13px; line-height: 1.8;
          word-break: break-word;
        }
        .msg.user .msg-bubble { color: #fff; border-top-right-radius: 4px; }
        .msg.assistant .msg-bubble {
          background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.88);
          border-top-left-radius: 4px;
        }

        /* Markdown 样式 */
        .msg-bubble h1 { font-size: 16px; font-weight: 700; color: #fff; margin: 8px 0 6px; }
        .msg-bubble h2 { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.95); margin: 10px 0 5px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; }
        .msg-bubble h3 { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 8px 0 4px; }
        .msg-bubble p { margin: 4px 0; }
        .msg-bubble ul { padding-left: 16px; margin: 4px 0; }
        .msg-bubble li { margin: 3px 0; }
        .msg-bubble strong { color: #fff; font-weight: 700; }
        .msg-bubble hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 8px 0; }
        .msg-bubble em { color: rgba(255,255,255,0.7); font-style: italic; }

        .typing { display: flex; gap: 4px; align-items: center; padding: 12px 14px; }
        .typing span {
          width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.4);
          animation: bounce 1.2s ease-in-out infinite;
        }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }

        .chat-input-row {
          display: flex; gap: 8px; padding: 12px 16px;
          border-top: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;
          background: rgba(255,255,255,0.03);
        }
        .chat-input {
          flex: 1; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 10px 14px; color: #fff; font-size: 13px;
          font-family: 'Noto Serif SC', serif; outline: none; resize: none;
          transition: border-color 0.2s; line-height: 1.5;
        }
        .chat-input::placeholder { color: rgba(255,255,255,0.3); }
        .chat-input:focus { border-color: rgba(255,255,255,0.25); }
        .send-btn {
          width: 40px; height: 40px; border-radius: 12px; border: none;
          color: #fff; font-size: 16px; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; align-self: flex-end;
        }
        .send-btn:hover:not(:disabled) { filter: brightness(1.15); transform: scale(1.05); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        @keyframes fadeInDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(30px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes pulse { 0%,100% { opacity:.6; } 50% { opacity:1; } }
        @keyframes bounce { 0%,80%,100% { transform:translateY(0); } 40% { transform:translateY(-6px); } }
      `}</style>

      <div className="page-wrap">
        <div className="container">
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

          <div className="nav-row">
            {navItems.map(item => (
              <button key={item.key} className="nav-btn"
                style={{ '--btn-color': item.color } as React.CSSProperties}
                onClick={() => openModal(item.label, item.icon, item.color, item.prompt)}>
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">功能模块</span>
            <div className="divider-line" />
          </div>

          <div className="plan-list">
            {planItems.map(item => (
              <button key={item.key} className="plan-btn"
                style={{ '--plan-color': item.color } as React.CSSProperties}
                onClick={() => openModal(item.label, item.icon, item.color, item.prompt)}>
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

      {modal && (
        <div className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-header-icon" style={{ background: modal.color + '33' }}>{modal.icon}</div>
              <span className="modal-title">{modal.title}</span>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="chat-body">
              {messages.map((msg, i) => (
                <div key={i} className={`msg ${msg.role}`}>
                  <div className="msg-avatar"
                    style={msg.role === 'user' ? { background: modal.color } : {}}>
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="msg-bubble"
                    style={msg.role === 'user' ? { background: modal.color } : {}}>
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
              <div ref={bottomRef} />
            </div>

            <div className="chat-input-row">
              <textarea className="chat-input" rows={1} placeholder="继续提问..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
              />
              <button className="send-btn" onClick={handleSend}
                disabled={loading || !input.trim()}
                style={{ background: modal.color }}>
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
