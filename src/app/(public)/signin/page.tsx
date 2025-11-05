'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { signinSchema, type SigninInput } from '@/lib/validators'
import { authenticateUser } from '@/lib/db'
import { useUser } from '@/hooks/useUser'

export default function Signin() {
    const router = useRouter()
    const { login } = useUser()
    const [loading, setLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<SigninInput>({
        resolver: zodResolver(signinSchema)
    })

    const onSubmit = async (data: SigninInput) => {
        setLoading(true)

        try {
            // Authenticate user
            const { user, error } = await authenticateUser(data.username, data.password)

            if (error === 'user_not_found') {
                toast.error('Account not found. Please check your username or create a new account.')
                setLoading(false)
                return
            }

            if (error === 'wrong_password') {
                toast.error('Incorrect password')
                setLoading(false)
                return
            }

            if (!user) {
                toast.error('Failed to sign in')
                setLoading(false)
                return
            }

            // Login user and redirect
            login(data.username)
            toast.success(`Welcome back, ${user.name}!`)
            router.push('/feed')

        } catch (error) {
            console.error('Signin error:', error)
            toast.error('Failed to sign in')
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
                    <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
                    <p className="text-gray-400">Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Username */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <label className="block text-sm font-medium mb-2">Username</label>
                        <input
                            {...register('username')}
                            type="text"
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-2xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-white placeholder-gray-400"
                            placeholder="Enter your username"
                        />
                        {errors.username && (
                            <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
                        )}
                    </motion.div>

                    {/* Password */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <label className="block text-sm font-medium mb-2">Password</label>
                        <input
                            {...register('password')}
                            type="password"
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-2xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-white placeholder-gray-400"
                            placeholder="Enter your password"
                        />
                        {errors.password && (
                            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                        )}
                    </motion.div>

                    {/* Submit */}
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-4 rounded-2xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </motion.button>
                </form>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center mt-6"
                >
                    <p className="text-gray-400">
                        Don't have an account?{' '}
                        <a href="/signup" className="text-red-500 hover:text-red-400 transition-colors">
                            Create one
                        </a>
                    </p>
                </motion.div>
            </motion.div>
        </div>
    )
}
