import { useState, useEffect } from 'react'
import { useSpring, animated } from 'react-spring'

export function useAnimatedValue(value: number, duration = 2000) {
  const [isAnimating, setIsAnimating] = useState(true)
  const { number } = useSpring({
    from: { number: 0 },
    number: value,
    delay: 200,
    config: { mass: 1, tension: 20, friction: 10, duration: duration },
    onRest: () => setIsAnimating(false),
  })

  return { number, isAnimating }
}

