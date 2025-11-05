'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export default function Register() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [username, setUsername] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !username.trim()) {
            toast.error('Please fill in all fields')
            return
        }

        setLoading(true)

        try {
            // Check if username already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('username')
                .eq('username', username.trim())
                .single()

            if (existingUser) {
                toast.error('Username already taken')
                setLoading(false)
                return
            }

            // Create user
            const { data, error } = await supabase
                .from('users')
                .insert({
                    name: name.trim(),
                    username: username.trim()
                })
                .select()
                .single()

            if (error) throw error

            // Note: localStorage is handled by the useUser hook's login function

            toast.success('Account created successfully!')
            router.push('/feed')
        } catch (error) {
            console.error('Error creating account:', error)
            toast.error('Failed to create account')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Join Xchange</h1>
                    <p className="text-gray-400">Create your account to start buying and selling</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <label className="block text-sm font-medium mb-2">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500 transition-colors"
                            placeholder="Your full name"
                            required
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <label className="block text-sm font-medium mb-2">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500 transition-colors"
                            placeholder="Choose a username"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Only letters, numbers, and underscores allowed</p>
                    </motion.div>

                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-3 rounded-lg font-medium transition-colors"
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    )
}
