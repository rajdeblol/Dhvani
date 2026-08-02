'use client'

import React, { useState, useEffect } from 'react'

export default function Typewriter({ text, delay = 100 }: { text: string, delay?: number }) {
  const [currentText, setCurrentText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prevText => prevText + text[currentIndex])
        setCurrentIndex(prevIndex => prevIndex + 1)
      }, delay)
  
      return () => clearTimeout(timeout)
    }
  }, [currentIndex, delay, text])

  return (
    <span>
      {currentText}
      <span className="animate-pulse">_</span>
    </span>
  )
}
