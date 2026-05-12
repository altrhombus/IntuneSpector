import React from 'react'
import { PanelShell } from './components/PanelShell'
import { useIntuneContext } from './hooks/useIntuneContext'

export function App() {
  const { context, hasToken } = useIntuneContext()
  return <PanelShell context={context} hasToken={hasToken} />
}
