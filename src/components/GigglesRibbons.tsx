'use client'

import { useLayoutEffect, useRef, useState, useEffect } from 'react'
import { gsap } from 'gsap'

interface RibbonConfig {
    id: number
    text: string
    startX: number
    startY: number
    endX: number
    endY: number
    rotation: number
    delay: number
    zIndex: number
}

// Custom hook for media queries
function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false)

    useEffect(() => {
        const media = window.matchMedia(query)
        setMatches(media.matches)

        const listener = (event: MediaQueryListEvent) => {
            setMatches(event.matches)
        }

        media.addEventListener('change', listener)
        return () => media.removeEventListener('change', listener)
    }, [query])

    return matches
}

export default function GigglesRibbons() {
    const containerRef = useRef<HTMLDivElement>(null)
    const ribbonsRef = useRef<HTMLDivElement[]>([])
    const [currentTextIndex, setCurrentTextIndex] = useState(0)
    const [isClient, setIsClient] = useState(false)
    const isMobile = useMediaQuery('(max-width: 768px)')

    // Text variations that rotate
    const textVariations = [
        'BUY • SELL • LOCAL • XCHANGE',
        'CHAT • MARKET • NEARBY • COMMUNITY'
    ]

    // Client-side guard for hydration
    useEffect(() => {
        setIsClient(true)
    }, [])

    // Rotate text every 8 seconds
    useEffect(() => {
        if (!isClient) return

        const interval = setInterval(() => {
            setCurrentTextIndex((prev) => (prev + 1) % textVariations.length)
        }, 8000)
        return () => clearInterval(interval)
    }, [isClient])

    // Generate ribbon configurations with deterministic values
    const generateRibbons = (): RibbonConfig[] => {
        const currentText = textVariations[currentTextIndex]

        if (isMobile) {
            // Mobile: 3 ribbons (top, middle, bottom) with clean spacing
            return [
                {
                    id: 0,
                    text: `${currentText} • `.repeat(4),
                    startX: -2500,
                    startY: 0,
                    endX: 0,
                    endY: 100, // Top position
                    rotation: -25,
                    delay: 0,
                    zIndex: 0
                },
                {
                    id: 1,
                    text: `${currentText} • `.repeat(4),
                    startX: 2500,
                    startY: 0,
                    endX: 0,
                    endY: window.innerHeight / 2 - 60, // Center position
                    rotation: 0,
                    delay: 0.2,
                    zIndex: 1
                },
                {
                    id: 2,
                    text: `${currentText} • `.repeat(4),
                    startX: -2500,
                    startY: 0,
                    endX: 0,
                    endY: window.innerHeight - 220, // Bottom position
                    rotation: 25,
                    delay: 0.4,
                    zIndex: 2
                }
            ]
        } else {
            // Desktop: 5 ribbons with full cinematic layout
            const fixedAngles = [-30, -15, 15, 30, -25]
            const fixedDelays = [0, 0.25, 0.5, 0.75, 1.0]

            return Array.from({ length: 5 }, (_, i) => {
                const startDirections = [
                    { x: -2500, y: -400 },
                    { x: 2500, y: -200 },
                    { x: -1500, y: -1000 },
                    { x: 1500, y: -1000 },
                    { x: -1000, y: 1000 },
                ]
                const startDir = startDirections[i % startDirections.length]

                const viewportHeight = window.innerHeight
                const verticalSpacing = (viewportHeight * 0.8) / 5
                const baseY = (viewportHeight * 0.1) + (i * verticalSpacing)
                const endY = baseY + (i * 20 - 40)
                const endX = (i - 2) * 150

                return {
                    id: i,
                    text: `${currentText} • `.repeat(6),
                    startX: startDir.x,
                    startY: startDir.y,
                    endX: endX,
                    endY: endY,
                    rotation: fixedAngles[i % fixedAngles.length],
                    delay: fixedDelays[i % fixedDelays.length],
                    zIndex: i
                }
            })
        }
    }

    useLayoutEffect(() => {
        if (!isClient) return

        const ribbons = ribbonsRef.current
        if (!ribbons.length) return

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        if (prefersReducedMotion) {
            // Static positioning for reduced motion
            ribbons.forEach((ribbon, i) => {
                const config = generateRibbons()[i]
                if (config) {
                    gsap.set(ribbon, {
                        x: config.endX,
                        y: config.endY,
                        rotation: config.rotation
                    })
                }
            })
            return
        }

        const ctx = gsap.context(() => {
            const ribbonConfigs = generateRibbons()

            ribbons.forEach((ribbon, i) => {
                const config = ribbonConfigs?.[i]
                if (!ribbon || !config) return

                const timeline = gsap.timeline({ delay: config.delay || i * 0.2 })

                if (isMobile) {
                    // Mobile: Simple side-to-side slide with y offset
                    timeline.fromTo(ribbon,
                        {
                            x: config.startX,
                            y: config.endY,
                            opacity: 0
                        },
                        {
                            x: config.endX,
                            y: config.endY,
                            opacity: 0.95,
                            duration: 1.4,
                            ease: "power3.out"
                        }
                    )
                    // No continuous drift on mobile for performance
                } else {
                    // Desktop: Full cinematic animation
                    timeline.fromTo(ribbon,
                        {
                            x: config.startX,
                            y: config.startY,
                            rotation: config.rotation,
                            opacity: 0
                        },
                        {
                            x: config.endX,
                            y: config.endY,
                            opacity: 1,
                            duration: 1.8,
                            ease: "power4.out"
                        }
                    )

                    // Subtle horizontal drift animation
                    timeline.to(ribbon, {
                        x: config.endX + 60 * (i % 2 === 0 ? 1 : -1),
                        duration: 12,
                        ease: "power2.inOut",
                        yoyo: true,
                        repeat: -1
                    }, "-=1.2")
                }
            })
        }, containerRef)

        return () => ctx.revert()
    }, [currentTextIndex, isMobile, isClient])

    // Don't render on server to prevent hydration mismatches
    if (!isClient) return null

    const ribbonConfigs = generateRibbons()

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        >
            {ribbonConfigs.map((config, i) => (
                <div
                    key={`${config.id}-${currentTextIndex}`}
                    ref={(el) => {
                        if (el) ribbonsRef.current[i] = el
                    }}
                    className="absolute flex items-center justify-center overflow-hidden"
                    style={{
                        width: isMobile ? '250vw' : '320vw',
                        height: isMobile ? '120px' : '220px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        fontSize: isMobile ? 'clamp(48px, 10vw, 100px)' : 'clamp(120px, 15vw, 260px)',
                        fontWeight: '900',
                        fontFamily: "'Anton', 'Bebas Neue', sans-serif",
                        letterSpacing: '-0.03em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        willChange: 'transform, opacity',
                        transform: `translate3d(${config.endX}px, ${config.endY}px, 0) rotate(${config.rotation}deg)`,
                        zIndex: config.zIndex,
                        left: '50%',
                        top: '0',
                        marginLeft: isMobile ? '-125vw' : '-160vw',
                        opacity: isMobile ? 0.95 : 1
                    }}
                >
                    {config.text}
                </div>
            ))}
        </div>
    )
}
