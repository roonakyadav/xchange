'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import '@/styles/background-ribbons.css'

interface RibbonConfig {
    id: number
    text: string
    color: string
    bgColor: string
    start: { x: number; y: number; rotation: number }
    end: { x: number; y: number; rotation: number }
    delay: number
    driftDuration: number
    opacity: number
    blur: number
    zIndex: number
}

export default function BackgroundRibbons() {
    const containerRef = useRef<HTMLDivElement>(null)
    const ribbonsRef = useRef<HTMLDivElement[]>([])

    // Deterministic random function for consistent animations
    const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000
        return x - Math.floor(x)
    }

    // Generate ribbon configurations
    const generateRibbons = (): RibbonConfig[] => {
        const texts = [
            'BUY • SELL • CHAT • LOCAL • XCHANGE • MARKETPLACE • TRADE • CONNECT',
            'DISCOVER • NEARBY • EXCHANGE • COMMUNITY • PURCHASE • OFFER • MESSAGE',
            'VICINITY • SWAP • NETWORK • BUY • SELL • CHAT • LOCAL • XCHANGE',
            'MARKETPLACE • TRADE • CONNECT • DISCOVER • NEARBY • EXCHANGE • COMMUNITY',
            'PURCHASE • OFFER • MESSAGE • VICINITY • SWAP • NETWORK • BUY • SELL',
            'CHAT • LOCAL • XCHANGE • MARKETPLACE • TRADE • CONNECT • DISCOVER • NEARBY',
            'EXCHANGE • COMMUNITY • PURCHASE • OFFER • MESSAGE • VICINITY • SWAP • NETWORK'
        ]

        const colors = ['#ff3b3b', '#ffffff', '#ff3b3b', '#ffffff', '#ff3b3b', '#ffffff', '#ff3b3b']
        const bgColors = ['rgba(0,0,0,0.8)', 'rgba(59, 130, 246, 0.9)', 'rgba(0,0,0,0.7)', 'rgba(59, 130, 246, 0.8)', 'rgba(0,0,0,0.9)', 'rgba(59, 130, 246, 0.85)', 'rgba(0,0,0,0.75)']

        return Array.from({ length: 9 }, (_, i) => {
            const seed = i * 0.1
            const startX = seededRandom(seed) * 2000 - 1000
            const startY = seededRandom(seed + 0.1) * 2000 - 1000
            const endX = seededRandom(seed + 0.2) * 400 - 200
            const endY = seededRandom(seed + 0.3) * 400 - 200
            const startRotation = seededRandom(seed + 0.4) * 120 - 60
            const endRotation = seededRandom(seed + 0.5) * 120 - 60

            return {
                id: i,
                text: texts[i % texts.length],
                color: colors[i % colors.length],
                bgColor: bgColors[i % bgColors.length],
                start: { x: startX, y: startY, rotation: startRotation },
                end: { x: endX, y: endY, rotation: endRotation },
                delay: seededRandom(seed + 0.6) * 0.16,
                driftDuration: 8 + seededRandom(seed + 0.7) * 10,
                opacity: 0.15 + seededRandom(seed + 0.8) * 0.3,
                blur: Math.floor(seededRandom(seed + 0.9) * 6),
                zIndex: Math.floor(seededRandom(seed + 1.0) * 10)
            }
        })
    }

    useLayoutEffect(() => {
        const ribbons = ribbonsRef.current
        if (!ribbons.length) return

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        if (prefersReducedMotion) {
            // Static positioning for reduced motion
            ribbons.forEach((ribbon, i) => {
                const config = generateRibbons()[i]
                gsap.set(ribbon, {
                    x: config.end.x,
                    y: config.end.y,
                    rotation: config.end.rotation,
                    opacity: config.opacity
                })
            })
            return
        }

        const ctx = gsap.context(() => {
            const ribbonConfigs = generateRibbons()

            ribbons.forEach((ribbon, i) => {
                const config = ribbonConfigs[i]
                const timeline = gsap.timeline({ delay: config.delay })

                // Entrance animation
                timeline.fromTo(ribbon,
                    {
                        x: config.start.x,
                        y: config.start.y,
                        rotation: config.start.rotation,
                        opacity: 0,
                        scale: 0.8
                    },
                    {
                        x: config.end.x,
                        y: config.end.y,
                        rotation: config.end.rotation,
                        opacity: config.opacity,
                        scale: 1,
                        duration: 1.1 + seededRandom(i * 0.1) * 0.7,
                        ease: "power3.out"
                    }
                )

                // Continuous drift animation
                timeline.to(ribbon, {
                    x: config.end.x + (seededRandom(i * 0.2) * 100 - 50),
                    y: config.end.y + (seededRandom(i * 0.3) * 80 - 40),
                    rotation: config.end.rotation + (seededRandom(i * 0.4) * 10 - 5),
                    duration: config.driftDuration,
                    ease: "power2.inOut",
                    yoyo: true,
                    repeat: -1
                }, "-=0.5")

                // Subtle opacity pulsing
                gsap.to(ribbon, {
                    opacity: config.opacity * 0.8,
                    duration: config.driftDuration * 0.7,
                    ease: "power2.inOut",
                    yoyo: true,
                    repeat: -1,
                    delay: config.delay + 0.5
                })
            })
        }, containerRef)

        return () => ctx.revert()
    }, [])

    const ribbonConfigs = generateRibbons()

    return (
        <div ref={containerRef} className="ribbon-container">
            {ribbonConfigs.map((config, i) => (
                <div
                    key={config.id}
                    ref={(el) => {
                        if (el) ribbonsRef.current[i] = el
                    }}
                    className="ribbon-element"
                    data-index={config.id}
                    style={{
                        backgroundColor: config.bgColor,
                        color: config.color,
                        zIndex: config.zIndex,
                        filter: `blur(${config.blur}px)`,
                        opacity: config.opacity
                    }}
                >
                    <div className="ribbon-text">
                        {config.text.repeat(3)}
                    </div>
                </div>
            ))}
        </div>
    )
}
