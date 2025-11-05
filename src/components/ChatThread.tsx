'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { getChatById, sendMessage, markThreadRead } from '@/lib/db'
import { subscribeToTyping, updateTypingStatus } from '@/lib/realtime'
import { formatTimeAgo } from '@/lib/time'
import { useUser } from '@/hooks/useUser'
import { useChatMessages } from '@/hooks/useChatMessages'
import TypingDots from './TypingDots'
import ChatMenu from './ChatMenu'
import type { ChatWithPost, Message } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface ChatThreadProps {
    chatId: string
}

interface MessageGroup {
    sender: string
    messages: Message[]
    timestamp: string
}

export default function ChatThread({ chatId }: ChatThreadProps) {
    const router = useRouter()
    const { user } = useUser()
    const { messages, upsertMessages } = useChatMessages(chatId, user?.username)
    const [chat, setChat] = useState<ChatWithPost | null>(null)
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [isTyping, setIsTyping] = useState(false)
    const [otherUserTyping, setOtherUserTyping] = useState(false)
    const [inputFocused, setInputFocused] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const messageChannelsRef = useRef<RealtimeChannel[]>([])

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, []) // Empty dependency array - only run once on mount

    // Load chat
    useEffect(() => {
        if (!user) return

        const loadChat = async () => {
            try {
                const chatData = await getChatById(chatId)
                if (!chatData) {
                    router.push('/chats')
                    return
                }
                setChat(chatData)
                setLoading(false)
            } catch (error) {
                console.error('Failed to load chat:', error)
                router.push('/chats')
            }
        }

        loadChat()

        // Mark thread as read on open
        markThreadRead(chatId, user.username).catch(console.error)
    }, [chatId, user, router])

    // Mark unread messages as read when window becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && user) {
                markThreadRead(chatId, user.username).catch(console.error)
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [chatId, user])

    // Set up typing and read status subscriptions
    useEffect(() => {
        if (!user || !chat) return

        console.log('Setting up typing subscriptions for chat:', chatId)
        const otherUser = chat.user1 === user.username ? chat.user2 : chat.user1

        // Subscribe to typing indicators
        const typingChannel = subscribeToTyping(chatId, user.username, (state) => {
            const otherUserTyping = Object.values(state).some(users =>
                users.some(u => u.user === otherUser && u.typing)
            )
            setOtherUserTyping(otherUserTyping)
        })

        messageChannelsRef.current = [typingChannel]

        return () => {
            console.log('Cleaning up typing subscriptions for chat:', chatId)
            messageChannelsRef.current.forEach(channel => channel.unsubscribe())
            messageChannelsRef.current = []
        }
    }, [chatId, user, chat, upsertMessages])

    // Listen for chat deletion events to clean up subscriptions
    useEffect(() => {
        const handleChatDeleted = (event: CustomEvent<{ chatId: string }>) => {
            if (event.detail.chatId === chatId) {
                console.log('Chat deleted, cleaning up subscriptions for chat:', chatId)
                // Clean up real-time subscriptions
                messageChannelsRef.current.forEach(channel => {
                    channel.unsubscribe()
                })
                messageChannelsRef.current = []
            }
        }

        window.addEventListener('chat-deleted', handleChatDeleted as EventListener)
        return () => window.removeEventListener('chat-deleted', handleChatDeleted as EventListener)
    }, [chatId])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleTyping = useCallback(() => {
        if (!isTyping) {
            setIsTyping(true)
            messageChannelsRef.current.forEach(channel => {
                if (channel.topic?.includes('presence-typing')) {
                    updateTypingStatus(channel, true, user!.username)
                }
            })
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }

        // Set new timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false)
            messageChannelsRef.current.forEach(channel => {
                if (channel.topic?.includes('presence-typing')) {
                    updateTypingStatus(channel, false, user!.username)
                }
            })
        }, 1500)
    }, [isTyping, user])

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || sending || !user) return

        const messageText = newMessage.trim()
        setNewMessage('')
        setSending(true)

        try {
            const realMessage = await sendMessage({
                chatId,
                sender: user.username,
                body: messageText,
            })

            // The hook will handle adding the message via real-time subscription
            // Scroll to bottom after sending
            setTimeout(scrollToBottom, 100)

            // Stop typing indicator
            setIsTyping(false)
            messageChannelsRef.current.forEach(channel => {
                if (channel.topic?.includes('presence-typing')) {
                    updateTypingStatus(channel, false, user.username)
                }
            })

            // Clear typing timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }

        } catch (error) {
            console.error('Failed to send message:', error)
            // Re-add message to input if failed
            setNewMessage(messageText)
        } finally {
            setSending(false)
            inputRef.current?.focus()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage(e)
        }
    }

    const groupMessages = (messages: Message[]): MessageGroup[] => {
        const groups: MessageGroup[] = []
        let currentGroup: MessageGroup | null = null

        messages.forEach((message) => {
            const messageTime = new Date(message.created_at)
            const shouldGroup = currentGroup &&
                currentGroup.sender === message.sender &&
                (messageTime.getTime() - new Date(currentGroup.timestamp).getTime()) < 2 * 60 * 1000 // 2 minutes

            if (shouldGroup && currentGroup) {
                currentGroup.messages.push(message)
            } else {
                if (currentGroup) {
                    groups.push(currentGroup)
                }
                currentGroup = {
                    sender: message.sender,
                    messages: [message],
                    timestamp: message.created_at,
                }
            }
        })

        if (currentGroup) {
            groups.push(currentGroup)
        }

        return groups
    }

    const getMessageStatus = (message: Message) => {
        if (message.read_at) return 'read'
        if (message.delivered_at) return 'delivered'
        return 'sent'
    }

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-black">
                <div className="p-4 border-b border-gray-800">
                    <div className="animate-pulse">
                        <div className="h-6 bg-gray-700 rounded w-32"></div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto pb-20">
                    <div className="p-4 space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`animate-pulse ${i % 2 === 0 ? 'ml-auto' : 'mr-auto'}`}>
                                <div className={`h-12 bg-gray-700 rounded-2xl ${i % 2 === 0 ? 'w-32' : 'w-24'}`}></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="sticky bottom-0 z-50 bg-black border-t border-gray-800 p-4">
                    <div className="flex space-x-2">
                        <div className="flex-1 h-12 bg-gray-900 border border-gray-700 rounded-2xl animate-pulse"></div>
                        <div className="w-20 h-12 bg-gray-700 rounded-2xl animate-pulse"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (!chat || !user) return null

    const otherUser = chat.user1 === user.username ? chat.user2 : chat.user1
    const messageGroups = groupMessages(messages)

    return (
        <div className="flex flex-col h-full bg-black">
            {/* Header */}
            <div className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 p-4 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                                {otherUser.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <h2 className="font-medium text-white">@{otherUser}</h2>
                            {otherUserTyping ? (
                                <div className="flex items-center space-x-1">
                                    <TypingDots />
                                    <span className="text-xs text-gray-400">typing...</span>
                                </div>
                            ) : messages.length > 0 ? (
                                <span className="text-xs text-gray-500">
                                    {formatTimeAgo(messages[messages.length - 1].created_at)}
                                </span>
                            ) : null}
                        </div>
                    </div>
                    <ChatMenu chatId={chatId} otherUser={otherUser} />
                </div>
            </div>

            {/* Messages - Scrollable area */}
            <div className={`flex-1 overflow-y-auto ${isMobile ? 'pb-24' : 'pb-20'}`}>
                <div className="flex flex-col w-full gap-2 p-4">
                    <AnimatePresence>
                        {messageGroups.map((group, groupIndex) => (
                            <React.Fragment key={`${group.sender}-${group.timestamp}`}>
                                {group.messages.map((message, messageIndex) => (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: (groupIndex * 0.05) + (messageIndex * 0.02) }}
                                        className={`w-full flex ${message.sender === user.username ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`inline-block w-auto max-w-[75%] px-3 py-2 rounded-2xl break-words whitespace-pre-wrap ${message.sender === user.username
                                            ? 'bg-red-500 text-white'
                                            : 'bg-gray-700 text-white'
                                            }`}>
                                            <p className="text-sm">{message.body}</p>
                                        </div>
                                    </motion.div>
                                ))}

                                {/* Timestamp */}
                                <div className={`w-full flex ${group.sender === user.username ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`text-xs text-gray-500 mt-1 ${group.sender === user.username ? 'mr-3' : 'ml-3'}`}>
                                        {formatTimeAgo(group.timestamp)}
                                        {group.sender === user.username && (
                                            <span className="ml-2">
                                                {getMessageStatus(group.messages[group.messages.length - 1]) === 'read' && '✓✓'}
                                                {getMessageStatus(group.messages[group.messages.length - 1]) === 'delivered' && '✓'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </React.Fragment>
                        ))}
                    </AnimatePresence>

                    {/* Typing indicator */}
                    {otherUserTyping && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-start"
                        >
                            <div className="bg-gray-700 rounded-2xl px-4 py-2">
                                <TypingDots />
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Message Input - Fixed on mobile, fixed on desktop (lg+) */}
            <div
                className={
                    isMobile
                        ? 'fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-gray-800 p-4'
                        : 'lg:fixed lg:bottom-0 lg:left-0 lg:right-0 lg:z-50 lg:bg-black border-t border-gray-800 p-4'
                }
                style={{ paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : undefined }}
            >
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <textarea
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value)
                            handleTyping()
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        rows={1}
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-6 py-3 rounded-2xl font-medium transition-colors disabled:cursor-not-allowed"
                    >
                        {sending ? '...' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    )
}
