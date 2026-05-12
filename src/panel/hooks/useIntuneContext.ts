import { useState, useEffect } from 'react'
import type { IntuneContext, ToContent, BackgroundResponse } from '@/shared/types'

export function useIntuneContext() {
  const [context, setContext] = useState<IntuneContext>(null)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    // Pull current context for this tab on mount
    chrome.runtime.sendMessage(
      { type: 'GET_CONTEXT' },
      (res: BackgroundResponse<IntuneContext>) => {
        if (res?.success && res.data) setContext(res.data)
      }
    )

    // Check token availability on mount
    chrome.runtime.sendMessage(
      { type: 'GET_TOKEN' },
      (res: BackgroundResponse<string>) => {
        setHasToken(res?.success === true)
      }
    )
  }, [])

  useEffect(() => {
    const handler = (message: ToContent) => {
      if (message.type === 'CONTEXT_UPDATE') {
        setContext(message.context)
        // A context update means we have Graph activity — token should be available
        setHasToken(true)
      }
      if (message.type === 'TOKEN_EXPIRED') {
        setHasToken(false)
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  return { context, hasToken }
}
