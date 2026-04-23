// context/subscription-context.tsx
'use client'

import { createContext, useContext } from 'react'

interface SubscriptionContextValue {
  isPro: boolean
}

const SubscriptionContext = createContext<SubscriptionContextValue>({ isPro: false })

export function SubscriptionProvider({
  isPro,
  children,
}: {
  isPro: boolean
  children: React.ReactNode
}) {
  return (
    <SubscriptionContext.Provider value={{ isPro }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription(): SubscriptionContextValue {
  return useContext(SubscriptionContext)
}
