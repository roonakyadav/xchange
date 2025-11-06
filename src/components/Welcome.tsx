'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import GigglesRibbons from './GigglesRibbons'

export default function Welcome() {
    const router = useRouter()
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const [bannerTexts, setBannerTexts] = useState([
        'BUY', 'SELL', 'CHAT', 'LOCAL', 'XCHANGE', 'MARKETPLACE'
    ])

    // Optional: Rotate banner texts every 10 seconds
    useEffect(() => {
        const textOptions = [
            ['BUY', 'SELL', 'CHAT', 'LOCAL', 'XCHANGE', 'MARKETPLACE'],
            ['TRADE', 'CONNECT', 'DISCOVER', 'NEARBY', 'EXCHANGE', 'COMMUNITY'],
            ['PURCHASE', 'OFFER', 'MESSAGE', 'VICINITY', 'SWAP', 'NETWORK']
        ]

        const interval = setInterval(() => {
            const randomSet = textOptions[Math.floor(Math.random() * textOptions.length)]
            setBannerTexts(randomSet)
        }, 10000)

        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({
                x: (e.clientX / window.innerWidth - 0.5) * 15,
                y: (e.clientY / window.innerHeight - 0.5) * 15
            })
        }

        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    const handleGetStarted = () => {
        // Mark welcome as seen
        localStorage.setItem('x_seen_welcome', 'true')
        router.push('/feed')
    }

    // Banner configurations with random positions and rotations
    const banners = [
        { id: 1, text: bannerTexts[0], color: '#ff3b3b', initialX: -200, initialY: -100, rotation: -12, delay: 0.5 },
        { id: 2, text: bannerTexts[1], color: '#f5f5f5', initialX: 250, initialY: -150, rotation: 8, delay: 1.0 },
        { id: 3, text: bannerTexts[2], color: '#ff3b3b', initialX: -300, initialY: 200, rotation: -15, delay: 1.5 },
        { id: 4, text: bannerTexts[3], color: '#f5f5f5', initialX: 350, initialY: 100, rotation: 12, delay: 2.0 },
        { id: 5, text: bannerTexts[4], color: '#ff3b3b', initialX: -150, initialY: 250, rotation: -8, delay: 2.5 },
        { id: 6, text: bannerTexts[5], color: '#f5f5f5', initialX: 200, initialY: -200, rotation: 15, delay: 3.0 }
    ]

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4 relative overflow-hidden">
            {/* GSAP Ribbon Background */}
            <GigglesRibbons />

            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60 z-40 pointer-events-none" />

            {/* Hero Content */}
            <div className="text-center relative z-50 max-w-md mx-auto">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative inline-block mb-6"
                >
                    {/* X letter - starts flat on floor, rotates to stand up */}
                    <motion.span
                        initial={{ rotateX: 90, transformOrigin: "bottom center" }}
                        animate={{ rotateX: 0 }}
                        transition={{
                            duration: 0.5,
                            ease: "easeOut",
                            delay: 0.4
                        }}
                        className="inline-block"
                        style={{
                            color: '#ff2b2b',
                            fontSize: 'clamp(48px, 12vw, 90px)',
                            fontWeight: 900,
                            transformStyle: "preserve-3d",
                            textShadow: '0 0 12px rgba(0,0,0,0.6)'
                        }}
                    >
                        X
                    </motion.span>

                    {/* change text - slides in from behind X */}
                    <motion.span
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{
                            duration: 0.7,
                            ease: "easeOut",
                            delay: 1.0
                        }}
                        className="inline-block ml-1"
                        style={{
                            color: '#ff2b2b',
                            fontSize: 'clamp(48px, 12vw, 90px)',
                            fontWeight: 900,
                            textShadow: '0 0 12px rgba(0,0,0,0.6)'
                        }}
                    >
                        change
                    </motion.span>
                </motion.div>

                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.0, duration: 0.6 }}
                    className="mb-8"
                    style={{
                        color: '#ffffff',
                        fontSize: 'clamp(14px, 3vw, 18px)',
                        fontWeight: 700,
                        opacity: 0.8,
                        textShadow: '0 0 12px rgba(0,0,0,0.6)'
                    }}
                >
                    Buy and sell any digital asset
                </motion.p>

                {/* Get Started button - appears after text animation */}
                <motion.button
                    initial={{ y: 50, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{
                        delay: 1.5,
                        duration: 0.8,
                        ease: [0.25, 0.46, 0.45, 0.94] // Custom bounce-like easing
                    }}
                    onClick={handleGetStarted}
                    className="w-[60%] h-12 rounded-full font-bold transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black"
                    style={{
                        backgroundColor: '#ff2b2b',
                        color: '#ffffff',
                        border: 'none',
                        boxShadow: '0 4px 15px rgba(255, 43, 43, 0.3)',
                        textShadow: '0 0 12px rgba(0,0,0,0.6)'
                    }}
                >
                    Get Started
                </motion.button>
            </div>
        </div>
    )
}
