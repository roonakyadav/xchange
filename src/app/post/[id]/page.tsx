'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import { getOrCreateChat } from '@/lib/db'

interface Post {
    id: string
    title: string
    description: string
    image_url: string
    username: string
    mode: 'selling' | 'requesting'
    price: string
    created_at: string
    users: {
        username: string
        name: string
    } | null
}

interface PostWithUser extends Omit<Post, 'users'> {
    users: {
        username: string
        name: string
    } | null
}

export default function PostDetail() {
    const router = useRouter()
    const params = useParams()
    const { user, loading: userLoading } = useUser()
    const [post, setPost] = useState<Post | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (userLoading) return

        if (params.id) {
            fetchPost(params.id as string)
        }
    }, [params.id, router, user, userLoading])

    const fetchPost = async (postId: string) => {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select(`
          id,
          title,
          description,
          image_url,
          username,
          mode,
          price,
          created_at,
          users (
            username,
            name
          )
        `)
                .eq('id', postId)
                .single()

            if (error || !data) {
                // Post not found or deleted - silently redirect to feed
                router.push('/feed')
                return
            }
            setPost(data as unknown as Post)
        } catch (error) {
            console.error('Error fetching post:', error)
            // Only show error for actual network/server errors, not missing posts
            if (error instanceof Error && !error.message.includes('No rows found')) {
                toast.error('Failed to load post')
            }
            router.push('/feed')
        } finally {
            setLoading(false)
        }
    }

    const handleMessageSeller = async () => {
        if (!post) return

        // If user is not logged in, redirect to auth
        if (!user) {
            router.push('/auth')
            return
        }

        // Don't allow messaging yourself
        if (post.users?.username === user.username) {
            toast.error('You cannot message yourself')
            return
        }

        try {
            // Get or create chat
            const chat = await getOrCreateChat({
                user1: user.username,
                user2: post.users?.username || '',
                postId: post.id,
            })

            router.push(`/chat/${chat.id}`)
        } catch (error) {
            console.error('Error creating chat:', error)
            toast.error('Failed to start chat')
        }
    }

    const formatTimeAgo = (dateString: string) => {
        const now = new Date()
        const postDate = new Date(dateString)
        const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60))

        if (diffInHours < 1) return 'Just now'
        if (diffInHours < 24) return `${diffInHours}h ago`
        const diffInDays = Math.floor(diffInHours / 24)
        if (diffInDays < 7) return `${diffInDays}d ago`
        return postDate.toLocaleDateString()
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black p-4">
                <div className="max-w-2xl mx-auto">
                    <div className="animate-pulse">
                        <div className="aspect-square bg-gray-800 rounded-lg mb-6"></div>
                        <div className="space-y-4">
                            <div className="h-8 bg-gray-800 rounded"></div>
                            <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                            <div className="h-20 bg-gray-800 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!post) return null

    const isOwnPost = post.users?.username === user?.username

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
                    <h1 className="text-xl font-bold">Post</h1>
                    <div></div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Image */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="aspect-square relative rounded-lg overflow-hidden"
                    >
                        <Image
                            src={post.image_url}
                            alt={post.title}
                            fill
                            className="object-cover"
                        />
                    </motion.div>

                    {/* Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-4"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${post.mode === 'selling'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {post.mode === 'selling' ? 'Selling' : 'Requesting'}
                                </span>
                                <span className="text-sm text-gray-500">{formatTimeAgo(post.created_at)}</span>
                            </div>
                            <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
                            <div className="flex items-center justify-between text-sm text-gray-400">
                                <span>@{post.users?.username || 'unknown'}</span>
                                {post.price && (
                                    <span className="text-sm font-bold bg-emerald-600 text-white px-2 py-1 rounded-full">
                                        {post.price}
                                    </span>
                                )}
                            </div>
                        </div>

                        <p className="text-gray-300 leading-relaxed">{post.description}</p>

                        {/* Action Button */}
                        {!isOwnPost && (
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                onClick={handleMessageSeller}
                                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium transition-colors"
                            >
                                💬 Message {post.mode === 'selling' ? 'Seller' : 'Requester'}
                            </motion.button>
                        )}

                        {isOwnPost && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-center py-4"
                            >
                                <p className="text-gray-400">This is your post</p>
                                <Link
                                    href="/profile"
                                    className="text-red-500 hover:text-red-400 transition-colors text-sm"
                                >
                                    View your profile →
                                </Link>
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
            </div>
        </div>
    )
}
