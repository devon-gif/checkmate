import 'server-only'
import { createOpenAI, openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

import { auth } from '@/auth'
import { type Database } from '@/lib/db_types'
import { nanoid } from '@/lib/utils'

export const runtime = 'edge'

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database, 'public', any>({
    cookies: () => cookieStore
  })
  const json = await req.json()
  const { messages, previewToken } = json
  const userId = (await auth({ cookieStore }))?.user.id

  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  const provider = previewToken
    ? createOpenAI({ apiKey: previewToken })
    : openai

  const result = streamText({
    model: provider(process.env.CHECKMATE_CHAT_MODEL ?? 'gpt-4o-mini'),
    messages,
    temperature: 0.7,
    async onFinish(event) {
      const title = json.messages[0].content.substring(0, 100)
      const id = json.id ?? nanoid()
      const createdAt = Date.now()
      const path = `/chat/${id}`
      const payload = {
        id,
        title,
        userId,
        createdAt,
        path,
        messages: [
          ...messages,
          {
            content: event.text,
            role: 'assistant'
          }
        ]
      }
      // Insert chat into database.
      await supabase.from('chats').upsert({ id, payload }).throwOnError()
    }
  })

  return result.toDataStreamResponse()
}
