'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Auth() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md text-center"
            >
                <motion.h1
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-4xl font-bold mb-8 text-white"
                >
                    Welcome to Xchange
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="text-gray-400 mb-12"
                >
                    Buy and sell locally with people in your community
                </motion.p>

                <div className="space-y-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                    >
                        <Link
                            href="/signup"
                            className="block w-full bg-red-500 hover:bg-red-600 text-white py-4 px-6 rounded-2xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Create account
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                    >
                        <Link
                            href="/signin"
                            className="block w-full bg-gray-800 hover:bg-gray-700 text-white py-4 px-6 rounded-2xl font-medium border border-gray-600 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Already have an account
                        </Link>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    )
}
