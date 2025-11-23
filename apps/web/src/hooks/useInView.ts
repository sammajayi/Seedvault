import { useEffect, useState, RefObject } from "react"

export function useInView<T extends HTMLElement>(ref: RefObject<T>, options?: IntersectionObserverInit) {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setInView(true)
      })
    }, options)

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [ref, options])

  return inView
}

export default useInView
