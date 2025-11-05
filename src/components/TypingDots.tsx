'use client'

import { motion } from 'framer-motion'

export default function TypingDots() {
    return (
        <div className="flex items-center space-x-1 px-3 py-2">
            <motion.div
                className="w-2 h-2 bg-gray-400 rounded-full"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                }}
                transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: 0,
                }}
            />
            <motion.div
                className="w-2 h-2 bg-gray-400 rounded-full"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                }}
                transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: 0.2,
                }}
            />
            <motion.div
                className="w-2 h-2 bg-gray-400 rounded-full"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                }}
                transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: 0.4,
                }}
            />
        </div>
    )
}
