'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

export default function Welcome() {
    const router = useRouter()

    const handleGetStarted = () => {
        // Mark welcome as seen
        localStorage.setItem('x_seen_welcome', 'true')
        router.push('/feed')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-center"
            >
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="text-6xl font-bold mb-4 text-white"
                >
                    Xchange
                </motion.h1>
                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    className="text-xl text-gray-400 mb-8"
                >
                    Buy and sell locally
                </motion.p>
                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.9, duration: 0.8 }}
                    className="w-32 h-1 bg-red-500 mx-auto rounded-full mb-8"
                />
                <motion.button
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.6 }}
                    onClick={handleGetStarted}
                    className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-medium transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 hover:scale-105 active:scale-95"
                >
                    Get Started
                </motion.button>
            </motion.div>
        </div>
    )
}
