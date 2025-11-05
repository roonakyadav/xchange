'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { getChatPreviews } from '@/lib/db'
import { subscribeToChatUpdates } from '@/lib/realtime'
import { useUser } from '@/hooks/useUser'

export default function NavDesktop() {
    const pathname = usePathname()
    const router = useRouter()
    const { user } = useUser()
    const [selectedMode, setSelectedMode] = useState<'selling' | 'requesting'>('selling')
    const [isMobile, setIsMobile] = useState(false)
    const [hasUnread, setHasUnread] = useState(false)

    const navItems = [
        { href: '/feed', label: 'Feed' },
        { href: '/post/new', label: 'New Post' },
        { href: '/chats', label: 'Chats', hasUnread },
        { href: '/profile', label: 'Profile' },
    ]

    const isActive = (href: string) => {
        if (href === '/feed') {
            return pathname === '/feed'
        }
        return pathname.startsWith(href)
    }

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Show back button only on mobile for /chats and /chat/[id] routes
    const showBack = isMobile && (pathname === '/chats' || pathname.startsWith('/chat/'))

    const handleBack = () => {
        if (pathname === '/chats') {
            router.push('/feed')
        } else if (pathname.startsWith('/chat/')) {
            router.push('/chats')
        }
    }

    // Load selected mode from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('feed-mode')
        if (saved === 'selling' || saved === 'requesting') {
            setSelectedMode(saved)
        }
    }, [])

    const handleModeChange = (mode: 'selling' | 'requesting') => {
        setSelectedMode(mode)
        localStorage.setItem('feed-mode', mode)
        // Dispatch custom event to notify feed page
        window.dispatchEvent(new CustomEvent('feed-mode-change', { detail: mode }))
    }

    // Check for unread messages
    useEffect(() => {
        if (!user) return

        const checkUnread = async () => {
            try {
                const chats = await getChatPreviews(user.username)
                const totalUnread = chats.reduce((total, chat) => total + chat.unreadCount, 0)
                setHasUnread(totalUnread > 0)
            } catch (error) {
                console.error('Failed to check unread:', error)
            }
        }

        checkUnread()

        // Subscribe to realtime updates
        const chatChannel = subscribeToChatUpdates(user.username, checkUnread)

        return () => {
            chatChannel.unsubscribe()
        }
    }, [user])

    return (
        <motion.nav
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="sticky top-0 z-40 hidden md:flex flex-col border-b border-white/10 bg-black/80 backdrop-blur"
        >
            <div className="flex items-center justify-between px-4 h-14">
                <div className="flex items-center space-x-4">
                    {showBack && (
                        <button
                            onClick={handleBack}
                            className="text-gray-400 hover:text-white transition-colors"
                            aria-label="Back"
                        >
                            ← Back
                        </button>
                    )}
                    <Link
                        href="/feed"
                        className="text-white text-lg font-bold tracking-wide hover:text-red-500 transition-colors"
                        aria-label="Feed"
                    >
                        Xchange
                    </Link>
                </div>

                <div className="flex items-center space-x-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`px-3 py-1.5 rounded-2xl transition relative ${isActive(item.href)
                                ? 'bg-red-600 text-white'
                                : 'hover:bg-white/10'
                                }`}
                            aria-current={isActive(item.href) ? 'page' : undefined}
                            aria-label={item.label}
                        >
                            {item.label}
                            {item.hasUnread && (
                                <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                            )}
                        </Link>
                    ))}
                </div>
            </div>

            {pathname === '/feed' && !pathname.startsWith('/chat') && !pathname.startsWith('/chats') && !pathname.startsWith('/profile') && !pathname.startsWith('/post/new') && (
                <div className="px-4 pb-3">
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleModeChange('selling')}
                            className={`px-4 py-2 rounded-2xl font-medium transition-all duration-200 border ${selectedMode === 'selling'
                                ? 'bg-red-500 text-white border-red-500'
                                : 'border-gray-600 text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            Selling
                        </button>
                        <button
                            onClick={() => handleModeChange('requesting')}
                            className={`px-4 py-2 rounded-2xl font-medium transition-all duration-200 border ${selectedMode === 'requesting'
                                ? 'bg-red-500 text-white border-red-500'
                                : 'border-gray-600 text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            Requesting
                        </button>
                    </div>
                </div>
            )}
        </motion.nav>
    )
}
