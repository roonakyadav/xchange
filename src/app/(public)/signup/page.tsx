'use client'

import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { signupSchema, type SignupInput } from '@/lib/validators'
import { insertUser, isUsernameTaken } from '@/lib/db'
import { useUser } from '@/hooks/useUser'

export default function Signup() {
    const router = useRouter()
    const { login } = useUser()
    const [loading, setLoading] = useState(false)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch
    } = useForm<SignupInput>({
        resolver: zodResolver(signupSchema)
    })

    const avatar = watch('avatar')

    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Avatar must be less than 5MB')
                return
            }

            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file')
                return
            }

            setValue('avatar', file)
            const reader = new FileReader()
            reader.onload = (e) => {
                setAvatarPreview(e.target?.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const onSubmit = async (data: SignupInput) => {
        setLoading(true)

        try {
            // Check if username is taken
            const taken = await isUsernameTaken(data.username)
            if (taken) {
                toast.error('Username already taken')
                setLoading(false)
                return
            }

            let avatarUrl: string | undefined

            // Upload avatar if provided
            if (data.avatar) {
                const fileExt = data.avatar.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
                const filePath = `${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, data.avatar)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath)

                avatarUrl = publicUrl
            }

            // Create user
            await insertUser({
                name: data.name,
                username: data.username,
                password: data.password,
                avatar_url: avatarUrl
            })

            // Login user and redirect
            login(data.username)
            toast.success('Account created successfully!')
            router.push('/feed')

        } catch (error) {
            console.error('Signup error:', error)
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
                    <h1 className="text-3xl font-bold mb-2">Create account</h1>
                    <p className="text-gray-400">Join the community</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Avatar Upload */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex flex-col items-center"
                    >
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-24 h-24 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-red-500 transition-colors mb-2"
                        >
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt="Avatar preview"
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <div className="text-2xl text-gray-500">👤</div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            {avatarPreview ? 'Change avatar' : 'Add avatar (optional)'}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarSelect}
                            className="hidden"
                        />
                    </motion.div>

                    {/* Name */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <label className="block text-sm font-medium mb-2">Name</label>
                        <input
                            {...register('name')}
                            type="text"
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-2xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-white placeholder-gray-400"
                            placeholder="Your full name"
                        />
                        {errors.name && (
                            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                        )}
                    </motion.div>

                    {/* Username */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <label className="block text-sm font-medium mb-2">Username</label>
                        <input
                            {...register('username')}
                            type="text"
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-2xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-white placeholder-gray-400"
                            placeholder="Choose a username"
                        />
                        {errors.username && (
                            <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            3–20 characters, letters, numbers, and underscores only
                        </p>
                    </motion.div>

                    {/* Password */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                    >
                        <label className="block text-sm font-medium mb-2">Password</label>
                        <input
                            {...register('password')}
                            type="password"
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-2xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-white placeholder-gray-400"
                            placeholder="Create a password"
                        />
                        {errors.password && (
                            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Minimum 6 characters
                        </p>
                    </motion.div>

                    {/* Submit */}
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-4 rounded-2xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading ? 'Creating account...' : 'Create account'}
                    </motion.button>
                </form>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center mt-6"
                >
                    <p className="text-gray-400">
                        Already have an account?{' '}
                        <a href="/signin" className="text-red-500 hover:text-red-400 transition-colors">
                            Sign in
                        </a>
                    </p>
                </motion.div>
            </motion.div>
        </div>
    )
}
