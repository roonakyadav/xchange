'use client'

import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { postSchema, type PostInput, type PostInputRaw } from '@/lib/validators'
import { useUser } from '@/hooks/useUser'

export default function NewPost() {
    const router = useRouter()
    const { user, loading: userLoading } = useUser()
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
        setError
    } = useForm<PostInputRaw>()

    const image = watch('image')
    const mode = watch('mode')

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image must be less than 5MB')
                return
            }

            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file')
                return
            }

            setValue('image', file)
            const reader = new FileReader()
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    // Redirect to auth if not logged in
    if (!userLoading && !user) {
        router.push('/auth')
        return null
    }

    const onSubmit = async (rawData: PostInputRaw) => {
        if (!user) {
            router.push('/auth')
            return
        }

        // Custom validation: check price format with currency symbol
        const priceValue = rawData.price.trim()
        const PRICE_RE = /^\s*(?:[₹$€£¥]\s*\d+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?\s*[₹$€£¥])\s*$/

        if (!PRICE_RE.test(priceValue)) {
            toast.error('Enter a valid price with currency, e.g. $200 or 200$')
            setError('price', { message: 'Enter a valid price with currency, e.g. $200 or 200$' })
            return
        }

        // Normalize price format while preserving user's symbol choice
        const match = priceValue.match(PRICE_RE)!
        let normalizedPrice = priceValue.trim()

        // If it's prefix format (symbol first), keep as is
        // If it's suffix format (symbol last), keep as is
        // The regex ensures it's one or the other

        setLoading(true)

        try {
            // Upload image to Supabase storage
            const fileExt = rawData.image.name.split('.').pop()
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('post-images')
                .upload(filePath, rawData.image)

            if (uploadError) {
                console.error('Upload error:', uploadError)
                toast.error(`Failed to upload image: ${uploadError.message}`)
                return
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('post-images')
                .getPublicUrl(filePath)

            // Create post
            const { error: insertError } = await supabase.from("posts").insert({
                title: rawData.title,
                description: rawData.description,
                image_url: publicUrl,
                username: user.username,
                mode: rawData.mode,
                price: normalizedPrice,
            });

            if (insertError) {
                console.error('Insert error:', insertError)
                toast.error(`Failed to create post: ${insertError.message}`)
                return
            }

            toast.success('Post created successfully!')
            router.push('/feed')
        } catch (error) {
            console.error('Error creating post:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            toast.error(`Failed to create post: ${errorMessage}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black">
            {/* Header */}
            <div className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 p-4 z-10">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ← Back
                    </button>
                    <h1 className="text-xl font-bold">New Post</h1>
                    <div></div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-4">
                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-6"
                >
                    {/* Image Upload */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <label className="block text-sm font-medium mb-2">Photo *</label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-red-500 transition-colors"
                        >
                            {imagePreview ? (
                                <div className="space-y-4">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="max-h-48 mx-auto rounded-lg"
                                    />
                                    <p className="text-sm text-gray-400">Click to change image</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="text-4xl text-gray-500">📷</div>
                                    <p className="text-gray-400">Click to upload an image</p>
                                    <p className="text-xs text-gray-500">Max 5MB</p>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                        />
                        {errors.image && (
                            <p className="text-red-500 text-sm mt-1">{errors.image.message}</p>
                        )}
                    </motion.div>

                    {/* Mode Selection */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <label className="block text-sm font-medium mb-3">Type *</label>
                        <div className="flex gap-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="selling"
                                    {...register('mode')}
                                    className="mr-2 text-red-500 focus:ring-red-500"
                                />
                                <span className="text-sm">Selling</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="requesting"
                                    {...register('mode')}
                                    className="mr-2 text-red-500 focus:ring-red-500"
                                />
                                <span className="text-sm">Requesting</span>
                            </label>
                        </div>
                        {errors.mode && (
                            <p className="text-red-500 text-sm mt-1">{errors.mode.message}</p>
                        )}
                    </motion.div>

                    {/* Title */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <label className="block text-sm font-medium mb-2">Title *</label>
                        <input
                            {...register('title')}
                            type="text"
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-2xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-white placeholder-gray-400"
                            placeholder="What are you selling?"
                        />
                        {errors.title && (
                            <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                        )}
                    </motion.div>

                    {/* Description */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <label className="block text-sm font-medium mb-2">Description *</label>
                        <textarea
                            {...register('description')}
                            rows={4}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-2xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors resize-none text-white placeholder-gray-400"
                            placeholder="Describe your item..."
                        />
                        {errors.description && (
                            <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                        )}
                    </motion.div>

                    {/* Price */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <label className="block text-sm font-medium mb-2">Price *</label>
                        <input
                            {...register('price', {
                                onChange: (e) => {
                                    // Filter input to allow only digits, one dot, spaces, and currency symbols
                                    const filtered = e.target.value.replace(/[^\d.\s₹$€£¥]/g, '')
                                    e.target.value = filtered
                                }
                            })}
                            type="text"
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-2xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-white placeholder-gray-400"
                            placeholder="Price (e.g. $200 or 200$)"
                        />
                        {errors.price && (
                            <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
                        )}
                    </motion.div>

                    {/* Submit */}
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        type="submit"
                        disabled={loading || !image}
                        className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-4 rounded-2xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading ? 'Creating Post...' : 'Create Post'}
                    </motion.button>
                </motion.form>
            </div>
        </div>
    )
}
