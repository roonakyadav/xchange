import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getChatMessages, markThreadRead } from '@/lib/db'
import type { Message } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useChatMessages(chatId: string, currentUser?: string) {
    const [byId, setById] = useState<Record<string, Message>>({})
    const [order, setOrder] = useState<string[]>([])
    const channelRef = useRef<RealtimeChannel | null>(null)
    const isSubscribedRef = useRef(false)

    const messages = order.map(id => byId[id]).filter(Boolean)

    const upsertMessages = useCallback((incoming: Message | Message[]) => {
        const messages = Array.isArray(incoming) ? incoming : [incoming]
        const incomingCount = messages.length

        setById(prevById => {
            const nextById = { ...prevById }
            messages.forEach(msg => {
                nextById[msg.id] = msg
            })
            console.log('🧩 UPSERT count', incomingCount, 'store size', Object.keys(nextById).length)
            return nextById
        })

        setOrder(prevOrder => {
            const nextOrder = [...prevOrder]
            messages.forEach(msg => {
                if (!nextOrder.includes(msg.id)) {
                    // Insert in chronological order
                    const insertIndex = nextOrder.findIndex(id => {
                        const existing = byId[id]
                        return existing && new Date(existing.created_at) > new Date(msg.created_at)
                    })
                    if (insertIndex === -1) {
                        nextOrder.push(msg.id)
                    } else {
                        nextOrder.splice(insertIndex, 0, msg.id)
                    }
                }
            })
            return nextOrder
        })
    }, [byId])

    const loadMessages = useCallback(async () => {
        if (!chatId) return

        try {
            const messageData = await getChatMessages(chatId)
            upsertMessages(messageData)
        } catch (error) {
            console.error('Failed to load messages:', error)
        }
    }, [chatId, upsertMessages])

    const setupRealtimeSubscription = useCallback(() => {
        if (!chatId || !currentUser || isSubscribedRef.current) return

        console.log(`🔄 [SETUP_REALTIME] Setting up realtime subscription for chat ${chatId}`)

        // Clean up existing subscription
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current)
        }

        const channel = supabase.channel(`messages-${chatId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `chat_id=eq.${chatId}`,
                },
                async (payload) => {
                    console.log('📩 [MESSAGE_INSERT]', payload.new?.id, 'chat_id:', payload.new?.chat_id)
                    const msg = payload.new as Message
                    if (!msg) return

                    // Verify this message belongs to our chat
                    if (String(msg.chat_id) !== String(chatId)) {
                        console.log('🚫 [MESSAGE_INSERT] Ignoring message for different chat:', msg.chat_id, 'vs', chatId)
                        return
                    }

                    console.log('✅ [MESSAGE_INSERT] Adding message to local state')
                    upsertMessages(msg)

                    // Auto-mark read if from other user and page visible
                    if (msg.sender !== currentUser && document.visibilityState === 'visible') {
                        console.log('🔖 [MESSAGE_INSERT] Auto-marking thread as read')
                        try {
                            await markThreadRead(chatId, currentUser)
                        } catch (error) {
                            console.error('❌ [MESSAGE_INSERT] Failed to mark thread read:', error)
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `chat_id=eq.${chatId}`,
                },
                (payload) => {
                    console.log('🔄 [MESSAGE_UPDATE]', payload.new?.id, 'chat_id:', payload.new?.chat_id, 'is_read:', payload.new?.is_read)
                    const msg = payload.new as Message
                    if (!msg) return

                    // Verify this message belongs to our chat
                    if (String(msg.chat_id) !== String(chatId)) {
                        console.log('🚫 [MESSAGE_UPDATE] Ignoring update for different chat:', msg.chat_id, 'vs', chatId)
                        return
                    }

                    console.log('✅ [MESSAGE_UPDATE] Updating message in local state')
                    upsertMessages(msg)
                }
            )
            .subscribe((status) => {
                console.log('🔌 [REALTIME_STATUS]', status)
                isSubscribedRef.current = status === 'SUBSCRIBED'
            })

        channelRef.current = channel
    }, [chatId, currentUser, upsertMessages])

    const cleanup = useCallback(() => {
        if (channelRef.current) {
            console.log('Cleaning up realtime subscription for chat:', chatId)
            supabase.removeChannel(channelRef.current)
            channelRef.current = null
            isSubscribedRef.current = false
        }
    }, [chatId])

    // Load messages on mount
    useEffect(() => {
        loadMessages()
    }, [loadMessages])

    // Setup realtime subscription
    useEffect(() => {
        setupRealtimeSubscription()
        return cleanup
    }, [setupRealtimeSubscription, cleanup])

    // Cleanup on unmount
    useEffect(() => {
        return cleanup
    }, [cleanup])

    return {
        messages,
        upsertMessages,
        loadMessages,
        isSubscribed: isSubscribedRef.current
    }
}
