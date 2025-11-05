'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { MoreVertical } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import PostMenu from '@/components/PostMenu'
import { getUser, updateUsernameEverywhere, getUserPosts, deletePostAndImage, deleteAccount, authenticateUser } from '@/lib/db'
import { profileSchema, type ProfileInput } from '@/lib/validators'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { formatTimeAgo } from '@/lib/time'
import { useUser } from '@/hooks/useUser'
import type { User, PostWithUser } from '@/types'

export default function Profile() {
    const router = useRouter()
    const { user: currentUser, logout, loading: userLoading } = useUser()
    const [posts, setPosts] = useState<PostWithUser[]>([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletePassword, setDeletePassword] = useState('')
    const [deletingAccount, setDeletingAccount] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm<ProfileInput>({
        resolver: zodResolver(profileSchema)
    })

    useEffect(() => {
        if (userLoading) return
        if (!currentUser) {
            router.push('/auth')
            return
        }

        fetchUserPosts(currentUser.username)
    }, [router, currentUser, userLoading])

    useEffect(() => {
        if (!userLoading && !currentUser) {
            router.push('/auth')
        }
    }, [userLoading, currentUser, router])

    // Handle click outside menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (userLoading) return null
    if (!currentUser) return null

    const fetchUserPosts = async (username: string) => {
        try {
            // Fetch user's posts
            const userPosts = await getUserPosts(username)
            setPosts(userPosts)

            reset({
                name: currentUser!.name,
                username: currentUser!.username
            })
        } catch (error) {
            console.error('Error fetching user posts:', error)
            toast.error('Failed to load profile')
        } finally {
            setLoading(false)
        }
    }

    const onSubmit = async (data: ProfileInput) => {
        if (!currentUser) return

        setSaving(true)

        try {
            // If username changed, update everywhere
            if (data.username !== currentUser.username) {
                await updateUsernameEverywhere(currentUser.username, data.username)
            }

            // Update user info
            const { supabase } = await import('@/lib/supabase')
            const { error } = await supabase
                .from('users')
                .update({
                    name: data.name,
                    username: data.username
                })
                .eq('id', currentUser.id)

            if (error) throw error

            // The useUser hook will handle the localStorage update
            setEditing(false)
            toast.success('Profile updated successfully!')

            // Refresh the page to get updated user data
            window.location.reload()
        } catch (error) {
            console.error('Error updating profile:', error)
            toast.error('Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    const handleSignOut = () => {
        logout()
    }

    const handleDeleteAccount = async () => {
        if (!currentUser) return

        setDeletingAccount(true)

        try {
            // Verify password
            const { user, error } = await authenticateUser(currentUser.username, deletePassword)

            if (error === 'wrong_password') {
                toast.error('Wrong password')
                setDeletingAccount(false)
                return
            }

            if (!user) {
                toast.error('Authentication failed')
                setDeletingAccount(false)
                return
            }

            // Delete account using user ID
            await deleteAccount(currentUser.id)

            // Clear localStorage
            localStorage.removeItem('x_user')
            localStorage.removeItem('x_seen_welcome')

            // Show success toast and redirect
            toast.success('Account deleted')
            router.replace('/')

        } catch (error) {
            console.error('Error deleting account:', error)
            toast.error('Failed to delete account')
        } finally {
            setDeletingAccount(false)
        }
    }

    const handleSendFeedback = () => {
        const mailtoLink = `mailto:ronakyadav1609@gmail.com?subject=Xchange Feedback&body=`
        window.location.href = mailtoLink
    }



    if (loading) {
        return (
            <div className="min-h-screen bg-black p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-32 bg-gray-800 rounded-lg"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="bg-gray-900 rounded-lg overflow-hidden">
                                    <div className="aspect-square bg-gray-800"></div>
                                    <div className="p-4 space-y-2">
                                        <div className="h-4 bg-gray-800 rounded"></div>
                                        <div className="h-3 bg-gray-800 rounded w-3/4"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!currentUser) return null

    return (
        <div className="min-h-screen bg-black flex flex-col pb-16 md:pb-0">
            <div className="flex-1">
                <div className="max-w-4xl mx-auto p-4 py-6">
                    {/* Profile Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-900 rounded-2xl p-6 mb-8"
                    >
                        {editing ? (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Name</label>
                                    <input
                                        {...register('name')}
                                        type="text"
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-2xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-white placeholder-gray-400"
                                        placeholder="Your full name"
                                    />
                                    {errors.name && (
                                        <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Username</label>
                                    <input
                                        {...register('username')}
                                        type="text"
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-2xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-white placeholder-gray-400"
                                        placeholder="Choose a username"
                                    />
                                    {errors.username && (
                                        <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">
                                        3–20 characters, letters, numbers, and underscores only
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-3 rounded-2xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditing(false)}
                                        className="px-6 py-3 border border-gray-600 rounded-2xl hover:bg-gray-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                {/* Mobile Layout */}
                                <div className="md:hidden">
                                    <div className="flex items-center justify-between">
                                        {/* Left side: Avatar + Name/Username */}
                                        <div className="flex items-center space-x-4 flex-1">
                                            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                                                {currentUser.avatar_url ? (
                                                    <img
                                                        src={currentUser.avatar_url}
                                                        alt={currentUser.name}
                                                        className="w-full h-full rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-white text-xl font-bold">
                                                        {currentUser.name.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h2 className="text-xl font-bold truncate">{currentUser.name}</h2>
                                                <p className="text-gray-400 text-sm truncate">@{currentUser.username}</p>
                                            </div>
                                        </div>

                                        {/* Right side: Sign out button + Menu */}
                                        <div className="flex items-center space-x-2 flex-shrink-0">
                                            <button
                                                onClick={handleSignOut}
                                                className="px-4 py-2 border border-gray-600 rounded-2xl font-medium transition-colors hover:bg-white/10 text-gray-400 hover:text-red-400"
                                            >
                                                Sign out
                                            </button>

                                            {/* Menu Button */}
                                            <div className="relative" ref={menuRef}>
                                                <button
                                                    onClick={() => setShowMenu(!showMenu)}
                                                    className="p-2 text-gray-400 hover:text-white transition-colors"
                                                    aria-label="Profile options"
                                                >
                                                    <MoreVertical size={20} />
                                                </button>

                                                {/* Menu Dropdown */}
                                                <AnimatePresence>
                                                    {showMenu && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                            className="absolute right-0 top-12 bg-gray-900 border border-gray-700 rounded-2xl shadow-lg z-10 min-w-[180px] py-2"
                                                        >
                                                            <button
                                                                onClick={() => {
                                                                    setShowMenu(false)
                                                                    setEditing(true)
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-sm text-white hover:bg-gray-800 transition-colors"
                                                            >
                                                                Edit Profile
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setShowMenu(false)
                                                                    handleSendFeedback()
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-sm text-white hover:bg-gray-800 transition-colors"
                                                            >
                                                                Send Feedback
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setShowMenu(false)
                                                                    setShowDeleteModal(true)
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-800 transition-colors"
                                                            >
                                                                Delete Account
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Desktop Layout - Unchanged */}
                                <div className="hidden md:block">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            {/* Avatar */}
                                            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                                                {currentUser.avatar_url ? (
                                                    <img
                                                        src={currentUser.avatar_url}
                                                        alt={currentUser.name}
                                                        className="w-full h-full rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-white text-xl font-bold">
                                                        {currentUser.name.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold mb-1">{currentUser.name}</h2>
                                                <p className="text-gray-400">@{currentUser.username}</p>
                                                <p className="text-sm text-gray-500 mt-2">{posts.length} posts</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => setEditing(true)}
                                                className="px-4 py-2 border border-gray-600 rounded-2xl font-medium transition-colors hover:bg-white/10 text-white"
                                            >
                                                Edit Profile
                                            </button>
                                            <button
                                                onClick={handleSendFeedback}
                                                className="px-4 py-2 border border-gray-600 rounded-2xl font-medium transition-colors hover:bg-white/10 text-white"
                                            >
                                                Send Feedback
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteModal(true)}
                                                className="px-4 py-2 border border-red-600 rounded-2xl font-medium transition-colors hover:bg-red-700 bg-red-600 text-white"
                                            >
                                                Delete Account
                                            </button>
                                            <button
                                                onClick={handleSignOut}
                                                className="px-4 py-2 border border-gray-600 rounded-2xl font-medium transition-colors hover:bg-white/10 text-gray-400 hover:text-red-400"
                                            >
                                                Sign out
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>

                    {/* Posts */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h3 className="text-xl font-semibold mb-6">Your Posts</h3>

                        {posts.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-16"
                            >
                                <p className="text-gray-400 text-lg mb-4">No posts yet</p>
                                <Link
                                    href="/post/new"
                                    className="bg-red-500 hover:bg-red-600 px-6 py-3 rounded-2xl font-medium transition-colors inline-block"
                                >
                                    Create your first post
                                </Link>
                            </motion.div>
                        ) : (
                            <AnimatePresence>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {posts.map((post, index) => (
                                        <motion.div
                                            key={post.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="bg-gray-900 rounded-2xl overflow-hidden hover:bg-gray-800 transition-colors cursor-pointer relative group"
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
                                                    currentUser={currentUser?.username}
                                                    onPostDeleted={() => fetchUserPosts(currentUser!.username)}
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
                                                <h4 className="font-semibold text-lg mb-1 line-clamp-1">{post.title}</h4>
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
                            </AnimatePresence>
                        )}
                    </motion.div>
                </div>

                <BottomNav />

                {/* Delete Account Modal */}
                <AnimatePresence>
                    {showDeleteModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-gray-900 rounded-2xl p-6 w-full max-w-md"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 className="text-xl font-bold mb-4 text-center">Delete Account</h3>
                                <p className="text-gray-400 mb-4 text-center">
                                    Enter password to confirm account deletion
                                </p>

                                <div className="mb-6">
                                    <input
                                        type="password"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-2xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-white placeholder-gray-400"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="flex-1 px-4 py-3 border border-gray-600 rounded-2xl hover:bg-gray-800 transition-colors"
                                        disabled={deletingAccount}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={deletingAccount || !deletePassword.trim()}
                                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-3 rounded-2xl font-medium transition-colors"
                                    >
                                        {deletingAccount ? 'Deleting...' : 'Confirm'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
