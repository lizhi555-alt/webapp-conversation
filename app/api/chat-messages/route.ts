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

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      const reader = difyRes.body!.getReader()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.replace('data: ', '').trim()
          if (!jsonStr || jsonStr === '[DONE]') continue

          try {
            const data = JSON.parse(jsonStr)

            // 兼容多种 Dify 事件类型
            let answer = ''

            if (data.event === 'message' && data.answer) {
              answer = data.answer
            } else if (data.event === 'agent_message' && data.answer) {
              answer = data.answer
            } else if (data.event === 'text_chunk' && data.data?.text) {
              answer = data.data.text
            } else if (data.event === 'message_replace' && data.answer) {
              answer = data.answer
            }

            if (answer) {
              const normalized = JSON.stringify({
                event: 'message',
                answer,
                conversation_id: data.conversation_id || '',
              })
              controller.enqueue(encoder.encode(`data: ${normalized}\n\n`))
            }

            // 透传 message_end，让前端获取 conversation_id
            if (data.event === 'message_end' && data.conversation_id) {
              const normalized = JSON.stringify({
                event: 'message_end',
                conversation_id: data.conversation_id,
              })
              controller.enqueue(encoder.encode(`data: ${normalized}\n\n`))
            }

          } catch {
            // 跳过无法解析的行
          }
        }
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
