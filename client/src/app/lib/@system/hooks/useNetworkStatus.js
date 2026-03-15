import { useState, useEffect } from 'react'

/**
 * Monitors the browser's online/offline status.
 *
 * Uses the `navigator.onLine` property as the initial value and then
 * subscribes to the `online` / `offline` window events for updates.
 *
 * @returns {{ isOnline: boolean }} `isOnline` is `true` when the browser
 *   reports a network connection and `false` when offline.
 *
 * @example
 * function MyComponent() {
 *   const { isOnline } = useNetworkStatus()
 *   if (!isOnline) return <p>You are offline.</p>
 *   return <p>Connected.</p>
 * }
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    function handleOnline() { setIsOnline(true) }
    function handleOffline() { setIsOnline(false) }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}
