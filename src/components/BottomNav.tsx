'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PlusCircle, MessageCircle, UserCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getChatPreviews } from '@/lib/db'
import { subscribeToChatUpdates } from '@/lib/realtime'
import { useUser } from '@/hooks/useUser'
import type { ChatPreview } from '@/lib/db'

export default function BottomNav() {
    const pathname = usePathname()
    const { user } = useUser()
    const [hasUnread, setHasUnread] = useState(false)

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

    const navItems = [
        { href: '/feed', label: 'Feed', icon: Home },
        { href: '/post/new', label: 'New Post', icon: PlusCircle },
        { href: '/chats', label: 'Chats', icon: MessageCircle, hasUnread },
        { href: '/profile', label: 'Profile', icon: UserCircle },
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-gray-800 md:hidden">
            <div className="flex">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex-1 py-3 px-2 text-center transition-colors relative ${pathname === item.href
                            ? 'text-red-500'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <div className="relative">
                            <item.icon size={20} className="mb-1 mx-auto" />
                            {item.hasUnread && (
                                <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                            )}
                        </div>
                        <div className="text-xs">{item.label}</div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
