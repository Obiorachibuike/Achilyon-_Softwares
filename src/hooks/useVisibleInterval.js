import { useEffect, useRef } from 'react'

/** setInterval that pauses while the tab is hidden and fires once when it becomes visible again. */
export default function useVisibleInterval(callback, delay, { immediate = false } = {}) {
  const saved = useRef(callback)
  useEffect(() => { saved.current = callback }, [callback])

  useEffect(() => {
    if (!delay) return undefined
    let id = null
    const tick = () => saved.current()
    const start = () => { if (!id) id = setInterval(tick, delay) }
    const stop = () => { clearInterval(id); id = null }
    const onVisibility = () => {
      if (document.hidden) stop()
      else { tick(); start() }
    }
    if (immediate) tick()
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility) }
  }, [delay, immediate])
}
