'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getChatPreviews, isUserBlocked } from '@/lib/db'
import { subscribeToChatUpdates } from '@/lib/realtime'
import { formatTimeAgo } from '@/lib/time'
import { useUser } from '@/hooks/useUser'
import type { ChatPreview } from '@/lib/db'

interface ChatListProps {
    onChatSelect?: (chatId: string) => void
}

export default function ChatList({ onChatSelect }: ChatListProps) {
    const router = useRouter()
    const { user } = useUser()
    const [chats, setChats] = useState<ChatPreview[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return

        loadChats()

        // Subscribe to chat updates (for deletions, new chats, etc.)
        const chatChannel = subscribeToChatUpdates(user.username, () => {
            console.log('Chat list update detected, reloading chats')
            loadChats()
        })

        // Listen for chat deletion events
        const handleChatDeleted = (event: CustomEvent<{ chatId: string }>) => {
            console.log('Chat deleted event received:', event.detail.chatId)
            setChats(prev => prev.filter(chat => chat.id !== event.detail.chatId))
        }

        window.addEventListener('chat-deleted', handleChatDeleted as EventListener)

        return () => {
            chatChannel.unsubscribe()
            window.removeEventListener('chat-deleted', handleChatDeleted as EventListener)
        }
    }, [user])

    const loadChats = async () => {
        if (!user) return

        try {
            const chatData = await getChatPreviews(user.username)
            setChats(chatData)
        } catch (error) {
            console.error('Failed to load chats:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleChatClick = async (chat: ChatPreview) => {
        // Optimistically clear unread in UI
        setChats(prev => prev.map(c =>
            c.id === chat.id ? { ...c, unreadCount: 0 } : c
        ))

        // Navigate to chat
        router.push(`/chat/${chat.id}`)
        onChatSelect?.(chat.id)
    }

    const getPreviewText = (chat: ChatPreview) => {
        const { unreadCount, outgoingPendingCount, lastMessage } = chat

        // unreadIncoming > 0 → "{unreadIncoming} unread messages"
        if (unreadCount > 0) {
            return `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`
        }

        // last.sender !== me → last.body (1-line truncate)
        if (lastMessage && lastMessage.sender !== user?.username) {
            return lastMessage.body.length > 50
                ? lastMessage.body.substring(0, 50) + '...'
                : lastMessage.body
        }

        // unreadOutgoing > 0 → "{unreadOutgoing} messages sent"
        if (outgoingPendingCount > 0) {
            return `${outgoingPendingCount} message${outgoingPendingCount > 1 ? 's' : ''} sent`
        }

        // else → "Seen {timeAgo(last.read_at)}"
        if (lastMessage && lastMessage.is_read && lastMessage.read_at) {
            return `Seen ${formatTimeAgo(lastMessage.read_at)}`
        }

        // Fallback
        return lastMessage?.body || 'Say hi 👋'
    }

    if (loading) {
        return (
            <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="flex items-center space-x-3 p-3">
                            <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="h-full bg-black">
            {/* Header */}
            <div className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 p-4 z-10">
                <h1 className="text-xl font-bold">Messages</h1>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
                <AnimatePresence>
                    {chats.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-8 text-center"
                        >
                            <p className="text-gray-400">No conversations yet</p>
                            <p className="text-sm text-gray-500 mt-2">
                                Start chatting by messaging sellers on posts
                            </p>
                        </motion.div>
                    ) : (
                        chats.map((chat, index) => {
                            const previewText = getPreviewText(chat)
                            const timeAgo = chat.updated_at ? formatTimeAgo(chat.updated_at) : ''
                            const hasUnread = chat.unreadCount > 0

                            return (
                                <motion.div
                                    key={chat.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => handleChatClick(chat)}
                                    className={`flex items-center space-x-3 p-4 hover:bg-gray-900 cursor-pointer border-b border-gray-800/50 transition-colors ${hasUnread ? 'bg-red-500/5 border-red-500/20' : ''
                                        }`}
                                >
                                    {/* Avatar */}
                                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center relative">
                                        <span className="text-white font-medium">
                                            {chat.otherUser.charAt(0).toUpperCase()}
                                        </span>
                                        {hasUnread && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border border-black"
                                            />
                                        )}
                                    </div>

                                    {/* Chat Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h3 className={`font-medium truncate ${hasUnread ? 'text-white' : 'text-white'
                                                }`}>
                                                @{chat.otherUser}
                                            </h3>
                                            {timeAgo && (
                                                <span className="text-xs text-gray-500 ml-2">
                                                    {timeAgo}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-1">
                                            <p className={`text-sm truncate ${hasUnread ? 'text-gray-200' : 'text-gray-400'
                                                } ${previewText.startsWith('**') ? 'font-bold' : ''}`}>
                                                {previewText.replace(/\*\*/g, '')}
                                            </p>
                                            {chat.unreadCount > 0 && (
                                                <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1 min-w-[20px] text-center"
                                                >
                                                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                                                </motion.span>
                                            )}
                                        </div>

                                        {/* Post reference if exists */}
                                        {chat.posts && (
                                            <div className="flex items-center space-x-2 mt-1">
                                                <div className="w-4 h-4 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                                                    {chat.posts.image_url && (
                                                        <Image
                                                            src={chat.posts.image_url}
                                                            alt=""
                                                            width={16}
                                                            height={16}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-500 truncate">
                                                    {chat.posts.title}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
