'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import PostMenu from '@/components/PostMenu'
import ClientOnly from '@/components/ClientOnly'
import { useUser } from '@/hooks/useUser'
import { getPostsByMode } from '@/lib/db'
import type { PostWithUser } from '@/types'

interface Post extends PostWithUser { }

export default function Feed() {
    const router = useRouter()
    const { user, loading: userLoading } = useUser()
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMode, setSelectedMode] = useState<'selling' | 'requesting'>('selling')

    useEffect(() => {
        if (userLoading) return

        fetchPosts()
    }, [router, selectedMode, user, userLoading])

    // Listen for mode changes from NavDesktop
    useEffect(() => {
        const handleModeChange = (event: CustomEvent<'selling' | 'requesting'>) => {
            setSelectedMode(event.detail)
        }

        window.addEventListener('feed-mode-change', handleModeChange as EventListener)
        return () => window.removeEventListener('feed-mode-change', handleModeChange as EventListener)
    }, [])

    const fetchPosts = async () => {
        try {
            const data = await getPostsByMode(selectedMode)
            setPosts(data)
        } catch (error) {
            console.error('Error fetching posts:', error)
        } finally {
            setLoading(false)
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
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-gray-900 rounded-lg overflow-hidden animate-pulse">
                                <div className="aspect-square bg-gray-800"></div>
                                <div className="p-4 space-y-2">
                                    <div className="h-4 bg-gray-800 rounded"></div>
                                    <div className="h-3 bg-gray-800 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    const filterButtons = (
        <div className="flex gap-2">
            <button
                onClick={() => setSelectedMode('selling')}
                className={`px-4 py-2 rounded-2xl font-medium transition-all duration-200 border ${selectedMode === 'selling'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-gray-600 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
            >
                Selling
            </button>
            <button
                onClick={() => setSelectedMode('requesting')}
                className={`px-4 py-2 rounded-2xl font-medium transition-all duration-200 border ${selectedMode === 'requesting'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-gray-600 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
            >
                Requesting
            </button>
        </div>
    )

    return (
        <div className="min-h-screen bg-black flex flex-col pb-16 md:pb-0">
            {/* Feed */}
            <div className="flex-1">
                {/* Mobile Filter Buttons */}
                <div className="md:hidden px-4 pt-4 pb-2">
                    {filterButtons}
                </div>

                <div className="max-w-6xl mx-auto px-4 py-6">
                    {posts.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            <p className="text-gray-400 text-lg mb-4">No posts yet</p>
                            <Link
                                href="/post/new"
                                className="bg-red-500 hover:bg-red-600 px-6 py-3 rounded-lg font-medium transition-colors inline-block"
                            >
                                Create the first post
                            </Link>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {posts.map((post, index) => (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/post/${post.id}`)}
                                >
                                    <div className="aspect-square relative">
                                        <Image
                                            src={post.image_url}
                                            alt={post.title}
                                            fill
                                            className="object-cover"
                                        />
                                        <PostMenu
                                            postId={post.id}
                                            imageUrl={post.image_url}
                                            username={post.username}
                                            currentUser={user?.username}
                                            onPostDeleted={() => fetchPosts()}
                                        />
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${post.mode === 'selling'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {post.mode === 'selling' ? 'Selling' : 'Requesting'}
                                            </span>
                                            <span className="text-xs text-gray-500">{formatTimeAgo(post.created_at)}</span>
                                        </div>
                                        <h3 className="font-semibold text-lg mb-1 line-clamp-1">{post.title}</h3>
                                        <p className="text-gray-400 text-sm mb-2 line-clamp-2">{post.description}</p>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>@{post.users?.username || 'unknown'}</span>
                                            {post.price && (
                                                <span className="text-sm font-bold bg-emerald-600 text-white px-2 py-1 rounded-full">
                                                    {post.price}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                <BottomNav />
            </div>
        </div>
    )
}
