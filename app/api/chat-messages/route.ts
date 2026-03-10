import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { query, conversation_id } = body

  const difyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_APP_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {},
      query,
      response_mode: 'streaming',
      conversation_id: conversation_id || '',
      user: 'user-001',
    }),
  })

  if (!difyRes.ok) {
    const err = await difyRes.text()
    return new Response(JSON.stringify({ error: err }), { status: 500 })
  }

  // 直接把 Dify 的流式响应透传给前端
  return new Response(difyRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
