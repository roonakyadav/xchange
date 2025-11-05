import { supabase } from './supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Message } from '@/types'

export interface TypingUser {
    user: string
    typing: boolean
}

export interface PresenceState {
    [key: string]: TypingUser[]
}

// Message realtime subscription for specific chat
export function subscribeToMessages(
    chatId: string,
    onMessage: (message: Message, eventType: 'INSERT' | 'UPDATE') => void,
    currentUser?: string
): RealtimeChannel {
    console.log(`Setting up realtime subscription for chat ${chatId}`)

    const channel = supabase
        .channel(`messages-${chatId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${chatId}`,
            },
            async (payload: RealtimePostgresChangesPayload<Message>) => {
                console.log('Realtime INSERT message received:', payload)
                if (payload.new) {
                    const message = payload.new as Message
                    console.log('New message:', message)

                    // If we have a current user, check if sender is blocked
                    if (currentUser && message.sender !== currentUser) {
                        try {
                            const { isUserBlocked } = await import('./db')
                            const blocked = await isUserBlocked(currentUser, message.sender)
                            if (blocked) {
                                console.log('Ignoring message from blocked user')
                                // Ignore messages from blocked users
                                return
                            }
                        } catch (error) {
                            console.error('Error checking block status:', error)
                        }
                    }

                    console.log('Calling onMessage callback for INSERT')
                    onMessage(message, 'INSERT')
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
            (payload: RealtimePostgresChangesPayload<Message>) => {
                console.log('Realtime UPDATE message received:', payload)
                if (payload.new) {
                    const message = payload.new as Message
                    console.log('Updated message:', message)
                    onMessage(message, 'UPDATE')
                }
            }
        )
        .subscribe((status) => {
            console.log(`Realtime subscription status for chat ${chatId}:`, status)
        })

    return channel
}

// Typing indicator with presence
export function subscribeToTyping(
    chatId: string,
    currentUser: string,
    onPresenceUpdate: (state: PresenceState) => void
): RealtimeChannel {
    const channel = supabase.channel(`presence-typing-${chatId}`, {
        config: {
            presence: {
                key: currentUser,
            },
        },
    })

    channel
        .on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState() as PresenceState
            onPresenceUpdate(presenceState)
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('User joined:', key, newPresences)
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            console.log('User left:', key, leftPresences)
        })
        .subscribe()

    return channel
}

// Update typing status
export function updateTypingStatus(
    channel: RealtimeChannel,
    isTyping: boolean,
    username: string
): void {
    channel.track({
        user: username,
        typing: isTyping,
    })
}

// Chat updates subscription (for unread counters, last message)
export function subscribeToChatUpdates(
    username: string,
    onChatUpdate: () => void
): RealtimeChannel {
    const channel = supabase
        .channel(`chats-${username}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'chats',
                filter: `user1=eq.${username}`,
            },
            () => onChatUpdate()
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'chats',
                filter: `user2=eq.${username}`,
            },
            () => onChatUpdate()
        )
        // Listen for new messages to update chat list
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
            },
            (payload) => {
                console.log("📩 realtime INSERT for chat list", payload)
                // Trigger update for chat list when any message is inserted
                // The ChatList component will filter to only show relevant chats
                onChatUpdate()
            }
        )
        .subscribe()

    return channel
}
