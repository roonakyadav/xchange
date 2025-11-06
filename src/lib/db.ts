import { supabase } from './supabase'
import { formatTimeAgo } from './time'
import bcrypt from 'bcryptjs'
import type { User, Post, Chat, Message, PostWithUser, ChatWithPost, ChatWithMessages } from '@/types'

// User operations
export async function getUser(username: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw new Error(`Failed to get user: ${error.message}`)
    }

    return data
}

export async function isUsernameTaken(username: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return false // Not found
        throw new Error(`Failed to check username: ${error.message}`)
    }

    return !!data
}

export async function authenticateUser(username: string, password: string): Promise<{ user: User | null; error: 'user_not_found' | 'wrong_password' | null }> {
    const user = await getUser(username)
    if (!user) {
        return { user: null, error: 'user_not_found' }
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
        return { user: null, error: 'wrong_password' }
    }

    return { user, error: null }
}

export async function insertUser(user: {
    name: string
    username: string
    password: string
    avatar_url?: string
}): Promise<User> {
    // Hash the password
    const passwordHash = await bcrypt.hash(user.password, 12)

    const { data, error } = await supabase
        .from('users')
        .insert({
            name: user.name,
            username: user.username,
            password_hash: passwordHash,
            avatar_url: user.avatar_url
        })
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to create user: ${error.message}`)
    }

    return data
}

export async function updateUsernameEverywhere(oldUsername: string, newUsername: string): Promise<void> {
    // Update posts
    const { error: postsError } = await supabase
        .from('posts')
        .update({ username: newUsername })
        .eq('username', oldUsername)

    if (postsError) {
        throw new Error(`Failed to update posts: ${postsError.message}`)
    }

    // Update chats user1
    const { error: chats1Error } = await supabase
        .from('chats')
        .update({ user1: newUsername })
        .eq('user1', oldUsername)

    if (chats1Error) {
        throw new Error(`Failed to update chats user1: ${chats1Error.message}`)
    }

    // Update chats user2
    const { error: chats2Error } = await supabase
        .from('chats')
        .update({ user2: newUsername })
        .eq('user2', oldUsername)

    if (chats2Error) {
        throw new Error(`Failed to update chats user2: ${chats2Error.message}`)
    }

    // Update messages sender
    const { error: messagesError } = await supabase
        .from('messages')
        .update({ sender: newUsername })
        .eq('sender', oldUsername)

    if (messagesError) {
        throw new Error(`Failed to update messages: ${messagesError.message}`)
    }
}

// Post operations
export async function listPosts(options?: { limit?: number; cursor?: string }): Promise<PostWithUser[]> {
    let query = supabase
        .from('posts')
        .select(`
      *,
      users (
        username,
        name
      )
    `)
        .order('created_at', { ascending: false })

    if (options?.limit) {
        query = query.limit(options.limit)
    }

    if (options?.cursor) {
        query = query.lt('created_at', options.cursor)
    }

    const { data, error } = await query

    if (error) {
        throw new Error(`Failed to list posts: ${error.message}`)
    }

    return data || []
}

export async function insertPost(post: {
    title: string
    description: string
    image_url: string
    username: string
    mode: 'selling' | 'requesting'
    location?: string
}): Promise<Post> {
    const { data, error } = await supabase
        .from('posts')
        .insert(post)
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to create post: ${error.message}`)
    }

    return data
}

export async function getPost(id: string): Promise<PostWithUser | null> {
    const { data, error } = await supabase
        .from('posts')
        .select(`
      *,
      users (
        username,
        name
      )
    `)
        .eq('id', id)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw new Error(`Failed to get post: ${error.message}`)
    }

    return data
}

// Chat operations
export async function getOrCreateChat(options: {
    user1: string
    user2: string
    postId?: string
}): Promise<Chat> {
    // Check if users are blocked
    const isBlocked = await isUserBlocked(options.user1, options.user2)
    if (isBlocked) {
        throw new Error('Cannot create chat with blocked user')
    }

    // First try to find existing chat
    const { data: existingChat, error: findError } = await supabase
        .from('chats')
        .select('*')
        .or(`and(user1.eq.${options.user1},user2.eq.${options.user2}),and(user1.eq.${options.user2},user2.eq.${options.user1})`)
        .single()

    if (findError && findError.code !== 'PGRST116') {
        throw new Error(`Failed to find chat: ${findError.message}`)
    }

    if (existingChat) {
        return existingChat
    }

    // Create new chat
    const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
            user1: options.user1,
            user2: options.user2,
            post_id: options.postId,
        })
        .select()
        .single()

    if (createError) {
        throw new Error(`Failed to create chat: ${createError.message}`)
    }

    return newChat
}

export async function listChats(username: string): Promise<ChatWithPost[]> {
    const { data, error } = await supabase
        .from('chats')
        .select(`
      *,
      posts (
        title,
        image_url
      )
    `)
        .or(`user1.eq.${username},user2.eq.${username}`)
        .order('created_at', { ascending: false })

    if (error) {
        throw new Error(`Failed to list chats: ${error.message}`)
    }

    return data || []
}

// Message operations
export async function insertMessage(message: {
    chat_id: string
    sender: string
    body: string
}): Promise<Message> {
    const { data, error } = await supabase
        .from('messages')
        .insert(message)
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to create message: ${error.message}`)
    }

    return data
}

// New functions for feed filters and profile management
export async function getPostsByMode(mode: 'selling' | 'requesting'): Promise<PostWithUser[]> {
    const { data, error } = await supabase
        .from('posts')
        .select(`
      *,
      users (
        username,
        name
      )
    `)
        .eq('mode', mode)
        .order('created_at', { ascending: false })

    if (error) {
        throw new Error(`Failed to get posts by mode: ${error.message}`)
    }

    return data || []
}

export async function getUserPosts(username: string): Promise<PostWithUser[]> {
    const { data, error } = await supabase
        .from('posts')
        .select(`
      *,
      users (
        username,
        name
      )
    `)
        .eq('username', username)
        .order('created_at', { ascending: false })

    if (error) {
        throw new Error(`Failed to get user posts: ${error.message}`)
    }

    return data || []
}

export async function deletePost(id: string): Promise<void> {
    console.log('Calling Supabase delete for post ID:', id)
    const { data, error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)
        .select()

    console.log('Supabase delete response:', { data, error })

    if (error) {
        console.error('Supabase delete error:', error)
        throw new Error(`Failed to delete post: ${error.message}`)
    }

    if (!data || data.length === 0) {
        console.warn('No post was deleted, post ID may not exist:', id)
    } else {
        console.log('Successfully deleted post:', data)
    }
}

export async function deleteStorageFile(imageUrl: string): Promise<void> {
    // Extract file path from public URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/post-images/[filename]
    console.log('Extracting filename from URL:', imageUrl)
    const urlParts = imageUrl.split('/post-images/')
    if (urlParts.length !== 2) {
        console.error('Invalid image URL format, could not find /post-images/ in URL')
        throw new Error('Invalid image URL format')
    }

    const filename = urlParts[1]
    console.log('Extracted filename:', filename)

    console.log('Calling Supabase storage remove for file:', filename)
    const { data, error } = await supabase.storage
        .from('post-images')
        .remove([filename])

    console.log('Supabase storage remove response:', { data, error })

    if (error) {
        console.error('Supabase storage remove error:', error)
        throw new Error(`Failed to delete storage file: ${error.message}`)
    }

    console.log('Successfully deleted storage file')
}

export async function deletePostCascade(postId: string) {
    console.log('Starting cascade deletion for post:', postId)

    // First get all chat IDs linked to this post
    const { data: chats, error: chatsFetchError } = await supabase
        .from('chats')
        .select('id')
        .eq('post_id', postId)

    if (chatsFetchError) {
        console.error('Failed to fetch chats for post:', chatsFetchError)
        throw new Error(`Failed to fetch chats: ${chatsFetchError.message}`)
    }

    const chatIds = chats?.map(chat => chat.id) || []

    // Delete all messages linked to these chats
    if (chatIds.length > 0) {
        console.log('Deleting messages linked to chats for this post...')
        const { error: messagesError } = await supabase
            .from('messages')
            .delete()
            .in('chat_id', chatIds)

        if (messagesError) {
            console.error('Failed to delete messages:', messagesError)
            throw new Error(`Failed to delete messages: ${messagesError.message}`)
        }
    }

    // Then delete all chats linked to this post
    console.log('Deleting chats linked to this post...')
    const { error: chatsError } = await supabase
        .from('chats')
        .delete()
        .eq('post_id', postId)

    if (chatsError) {
        console.error('Failed to delete chats:', chatsError)
        throw new Error(`Failed to delete chats: ${chatsError.message}`)
    }

    // Finally delete the post
    console.log('Deleting post from database...')
    const { data, error: postError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .select()

    if (postError) {
        console.error('Failed to delete post:', postError)
        throw new Error(`Failed to delete post: ${postError.message}`)
    }

    console.log('Cascade deletion completed successfully')
    return data
}

export async function deletePostAndImage(postId: string, imageUrl?: string): Promise<void> {
    console.log('Starting deletion of post:', postId, 'and image:', imageUrl)

    try {
        // Delete the image first (ignore if missing)
        if (imageUrl) {
            console.log('Deleting image file...')
            try {
                await deleteStorageFile(imageUrl)
                console.log('Image deleted successfully')
            } catch (imageError) {
                console.warn('Image deletion failed or image not found:', imageError)
                // Continue with post deletion even if image deletion fails
            }
        }

        // Use cascade deletion for post and related data
        await deletePostCascade(postId)

    } catch (err: any) {
        console.error('Delete failed:', err)
        throw new Error(err.message || 'Failed to delete post')
    }
}

export async function deleteAccount(userId: string): Promise<void> {
    console.log('Starting account deletion for user ID:', userId)

    // Get user data first
    const { data: user, error: userFetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

    if (userFetchError || !user) {
        throw new Error(`User not found: ${userFetchError?.message || 'User does not exist'}`)
    }

    const username = user.username

    try {
        // 1. Delete all messages by this user (using sender username)
        console.log('Deleting user messages...')
        try {
            const { error: messagesError } = await supabase
                .from('messages')
                .delete()
                .eq('sender', username)

            if (messagesError) {
                console.error('Error deleting messages:', messagesError)
            } else {
                console.log('User messages deleted')
            }
        } catch (messagesError) {
            console.error('Error deleting messages:', messagesError)
        }

        // 2. Delete all chats where user participated
        console.log('Deleting user chats...')
        try {
            const { error: chatsError } = await supabase
                .from('chats')
                .delete()
                .or(`user1.eq.${username},user2.eq.${username}`)

            if (chatsError) {
                console.error('Error deleting chats:', chatsError)
            } else {
                console.log('User chats deleted')
            }
        } catch (chatsError) {
            console.error('Error deleting chats:', chatsError)
        }

        // 3. Delete all user's posts and their images (using username)
        console.log('Deleting user posts...')
        try {
            const { data: userPosts, error: postsFetchError } = await supabase
                .from('posts')
                .select('id, image_url')
                .eq('username', username)

            if (postsFetchError) {
                console.error('Error fetching user posts:', postsFetchError)
            } else {
                for (const post of userPosts || []) {
                    console.log('Deleting post:', post.id)
                    try {
                        await deletePostAndImage(post.id, post.image_url)
                    } catch (postError) {
                        console.error('Error deleting post:', post.id, postError)
                    }
                }
                console.log('All user posts deleted')
            }
        } catch (postsError) {
            console.error('Error in posts deletion process:', postsError)
        }

        // 4. Delete user's avatar file if it exists
        if (user.avatar_url) {
            console.log('Deleting user avatar...')
            try {
                await deleteStorageFile(user.avatar_url)
                console.log('User avatar deleted')
            } catch (avatarError) {
                console.warn('Failed to delete avatar, continuing:', avatarError)
            }
        }

        // 5. Delete user from users table
        console.log('Deleting user account...')
        const { error: userError } = await supabase
            .from('users')
            .delete()
            .eq('id', userId)

        if (userError) {
            console.error('Error deleting user:', userError)
            throw new Error(`Failed to delete user: ${userError.message}`)
        }
        console.log('User account deleted successfully')

    } catch (error) {
        console.error('Critical error during account deletion:', error)
        throw error
    }
}

// Chat and messaging helpers
export async function getChatsForUser(username: string): Promise<ChatWithPost[]> {
    const { data, error } = await supabase
        .from('chats')
        .select(`
      *,
      posts (
        title,
        image_url
      )
    `)
        .or(`user1.eq.${username},user2.eq.${username}`)
        .order('updated_at', { ascending: false })

    if (error) {
        throw new Error(`Failed to get chats for user: ${error.message}`)
    }

    return data || []
}

export async function getChatById(id: string): Promise<ChatWithPost | null> {
    const { data, error } = await supabase
        .from('chats')
        .select(`
      *,
      posts (
        title,
        image_url
      )
    `)
        .eq('id', id)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw new Error(`Failed to get chat: ${error.message}`)
    }

    return data
}

export async function listMessages(chatId: string, options?: { limit?: number; before?: string }): Promise<Message[]> {
    let query = supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

    if (options?.limit) {
        query = query.limit(options.limit)
    }

    if (options?.before) {
        query = query.lt('created_at', options.before)
    }

    const { data, error } = await query

    if (error) {
        throw new Error(`Failed to list messages: ${error.message}`)
    }

    return data || []
}

export async function sendMessage({ chatId, sender, body }: { chatId: string; sender: string; body: string }): Promise<Message> {
    console.log('📤 [SEND_MESSAGE] chatId:', chatId, 'sender:', sender, 'body length:', body.length)

    // First ensure the chat exists and get its details
    const chat = await getChatById(chatId)
    if (!chat) {
        throw new Error('Chat not found')
    }

    // Insert the message
    const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
            chat_id: chatId,
            sender,
            body,
            // Don't set is_read or read_at for new messages - they get marked as read when recipient opens chat
        })
        .select()
        .single()

    if (messageError) {
        console.error('❌ [SEND_MESSAGE] Failed to insert message:', messageError)
        throw new Error(`Failed to send message: ${messageError.message}`)
    }

    console.log('✅ [SEND_MESSAGE] Message inserted:', message.id)

    // Update chat with last message info (deterministic upsert)
    const updateData: any = {
        last_message: body,
        last_sender: sender,
        updated_at: new Date().toISOString()
    }

    // Update unread counts
    if (chat.user1 === sender) {
        updateData.unread_user2 = (chat.unread_user2 || 0) + 1
    } else {
        updateData.unread_user1 = (chat.unread_user1 || 0) + 1
    }

    const { error: chatError } = await supabase
        .from('chats')
        .update(updateData)
        .eq('id', chatId)

    if (chatError) {
        console.error('❌ [SEND_MESSAGE] Failed to update chat:', chatError)
        // Don't throw here - message was sent successfully, just log the error
    } else {
        console.log('✅ [SEND_MESSAGE] Chat updated with last message')
    }

    return message
}

// Send message to a user, creating chat if it doesn't exist
export async function sendMessageToUser({
    sender,
    recipient,
    body,
    postId
}: {
    sender: string
    recipient: string
    body: string
    postId?: string
}): Promise<{ message: Message; chat: Chat }> {
    console.log('📤 [SEND_MESSAGE_TO_USER] sender:', sender, 'recipient:', recipient, 'body length:', body.length)

    // Get or create chat
    const chat = await getOrCreateChat({
        user1: sender,
        user2: recipient,
        postId
    })

    console.log('✅ [SEND_MESSAGE_TO_USER] Chat ready:', chat.id)

    // Send message using existing chat
    const message = await sendMessage({
        chatId: chat.id,
        sender,
        body
    })

    console.log('✅ [SEND_MESSAGE_TO_USER] Message sent successfully')
    return { message, chat }
}

export async function markDelivered(chatId: string, messageIds: string[]): Promise<void> {
    const { error } = await supabase
        .from('messages')
        .update({ delivered_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .in('id', messageIds)
        .is('delivered_at', null)

    if (error) {
        throw new Error(`Failed to mark messages as delivered: ${error.message}`)
    }
}

export async function markThreadRead(chatId: string, me: string) {
    console.log('🔖 [MARK_THREAD_READ] chatId:', chatId, 'user:', me)

    // Get chat details first to determine which field to update
    const chat = await getChatById(chatId)
    if (!chat) {
        throw new Error('Chat not found')
    }

    // First mark messages as read
    const { data: updatedMessages, error: messageError } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .neq('sender', me)
        .eq('is_read', false)
        .select()

    if (messageError) {
        console.error('❌ [MARK_THREAD_READ] Failed to mark messages as read:', messageError)
        throw new Error(`Failed to mark thread read: ${messageError.message}`)
    }

    console.log(`✅ [MARK_THREAD_READ] Marked ${updatedMessages?.length || 0} messages as read`)

    // Reset unread counter for current user in chat table
    const updateField = chat.user1 === me ? 'unread_user1' : 'unread_user2'
    const { error: chatError } = await supabase
        .from('chats')
        .update({ [updateField]: 0 })
        .eq('id', chatId)

    if (chatError) {
        console.error('❌ [MARK_THREAD_READ] Failed to reset unread counter:', chatError)
        // Don't throw here - messages were marked as read successfully
    } else {
        console.log('✅ [MARK_THREAD_READ] Reset unread counter in chat table')
    }

    return updatedMessages
}

export async function deleteChatForMe(chatId: string, me: string, user1: string, user2: string) {
    const field = me === user1 ? 'deleted_by_user1' : 'deleted_by_user2';
    console.log("🗑 deleteChatForMe", chatId, field);
    return supabase.from('chats').update({ [field]: true }).eq('id', chatId);
}

export async function deleteChat(chatId: string, currentUser: string): Promise<void> {
    // First get the chat to determine which user field to update
    const { data: chat, error: fetchError } = await supabase
        .from('chats')
        .select('user1, user2')
        .eq('id', chatId)
        .single()

    if (fetchError) {
        throw new Error(`Failed to fetch chat: ${fetchError.message}`)
    }

    if (!chat) {
        throw new Error('Chat not found')
    }

    // Determine which field to update based on current user
    const updateField = chat.user1 === currentUser ? 'deleted_by_user1' : 'deleted_by_user2'

    const { error } = await supabase
        .from('chats')
        .update({ [updateField]: true })
        .eq('id', chatId)

    if (error) {
        throw new Error(`Failed to delete chat: ${error.message}`)
    }
}

export async function blockUser(blocker: string, blocked: string): Promise<void> {
    const { error } = await supabase
        .from('blocked_users')
        .insert({
            blocker_id: blocker,
            blocked_id: blocked,
        })

    if (error) {
        throw new Error(`Failed to block user: ${error.message}`)
    }
}

export async function isUserBlocked(currentUser: string, targetUser: string) {
    try {
        const { data, error } = await supabase
            .from('blocked_users')
            .select('*')
            .eq('blocker_id', currentUser)
            .eq('blocked_id', targetUser)
            .single()
        if (error && error.code !== 'PGRST116') throw error
        return !!data
    } catch (err) {
        console.error('Error checking block status:', err)
        return false
    }
}

// Chat preview functions for chat list
export interface ChatPreview {
    id: string
    user1: string
    user2: string
    post_id?: string
    created_at: string
    updated_at?: string
    posts?: {
        title: string
        image_url: string
    } | null
    lastMessage?: Message
    unreadCount: number
    outgoingPendingCount: number
    otherUser: string
}

export async function getVisibleChats(username: string): Promise<ChatPreview[]> {
    console.log(`👀 [GET_VISIBLE_CHATS] Fetching visible chats for user: ${username}`)

    // Get all chats for user that are not deleted by current user
    // Use a more efficient query that gets chats with their last message in one go
    const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select(`
            *,
            posts (
                title,
                image_url
            )
        `)
        .or(`user1.eq.${username},user2.eq.${username}`)
        .order('updated_at', { ascending: false, nullsFirst: false })

    if (chatsError) {
        console.error('❌ [GET_VISIBLE_CHATS] Failed to get chats:', chatsError)
        throw new Error(`Failed to get chats: ${chatsError.message}`)
    }

    if (!chats || chats.length === 0) {
        console.log('ℹ️ [GET_VISIBLE_CHATS] No chats found for user')
        return []
    }

    console.log(`📋 [GET_VISIBLE_CHATS] Found ${chats.length} total chats, filtering visible ones...`)

    // Filter chats based on visibility rules and get message data
    const visibleChats: ChatPreview[] = []

    for (const chat of chats) {
        // Check if chat is deleted by current user
        const isDeletedByMe = (chat.user1 === username && chat.deleted_by_user1) ||
            (chat.user2 === username && chat.deleted_by_user2)

        if (isDeletedByMe) {
            console.log(`🚫 [GET_VISIBLE_CHATS] Skipping deleted chat: ${chat.id}`)
            continue
        }

        const otherUser = chat.user1 === username ? chat.user2 : chat.user1

        // Check if the other user is blocked by current user
        const isBlockedByMe = await isUserBlocked(username, otherUser)
        if (isBlockedByMe) {
            console.log(`🚫 [GET_VISIBLE_CHATS] Skipping chat with blocked user: ${chat.id}`)
            continue
        }

        // Check if current user is blocked by the other user
        const isBlockedByOther = await isUserBlocked(otherUser, username)
        if (isBlockedByOther) {
            console.log(`🚫 [GET_VISIBLE_CHATS] Skipping chat where current user is blocked: ${chat.id}`)
            continue
        }

        // Get all messages for this chat to calculate unread counts
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })

        if (messagesError) {
            console.error(`❌ [GET_VISIBLE_CHATS] Error getting messages for chat ${chat.id}:`, messagesError)
            continue
        }

        // Skip chats with no messages (shouldn't happen with proper upsert, but safety check)
        if (!messages || messages.length === 0) {
            console.log(`⚠️ [GET_VISIBLE_CHATS] Skipping chat ${chat.id} with no messages`)
            continue
        }

        // Get the last message
        const lastMessage = messages[0]

        // Calculate unread counts using the stored unread counters from the chat table
        // This is more efficient than recalculating from all messages
        const unreadCount = chat.user1 === username ? (chat.unread_user1 || 0) : (chat.unread_user2 || 0)
        const outgoingPendingCount = chat.user1 === username ? (chat.unread_user2 || 0) : (chat.unread_user1 || 0)

        console.log(`✅ [GET_VISIBLE_CHATS] Including chat ${chat.id} with ${messages.length} messages, unread: ${unreadCount}`)

        visibleChats.push({
            ...chat,
            lastMessage,
            unreadCount,
            outgoingPendingCount,
            otherUser,
        })
    }

    console.log(`🎯 [GET_VISIBLE_CHATS] Returning ${visibleChats.length} visible chats`)
    return visibleChats
}

export async function getChatMessages(chatId: string): Promise<Message[]> {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true, nullsFirst: false })

    if (error) {
        throw new Error(`Failed to get messages: ${error.message}`)
    }

    return data || []
}

export function computePreview(me: string, messages: Message[]): string {
    if (!messages || messages.length === 0) return 'Say hi 👋'

    const unreadIncoming = messages.filter(m => m.sender !== me && !m.is_read).length
    const unreadOutgoing = messages.filter(m => m.sender === me && !m.is_read).length
    const last = messages[messages.length - 1]

    // Priority 1: unreadIncoming > 0 → bold "{unreadIncoming} unread messages"
    if (unreadIncoming > 0) {
        return `**${unreadIncoming} unread message${unreadIncoming > 1 ? 's' : ''}**`
    }

    // Priority 2: last.sender != me → last.body (truncate)
    if (last && last.sender !== me) {
        return last.body.length > 50 ? last.body.substring(0, 50) + '...' : last.body
    }

    // Priority 3: unreadOutgoing > 0 → "{unreadOutgoing} messages sent"
    if (unreadOutgoing > 0) {
        return `${unreadOutgoing} message${unreadOutgoing > 1 ? 's' : ''} sent`
    }

    // Priority 4: last.read_at exists → "Seen {timeAgo(last.read_at)}"
    if (last?.read_at) {
        return `Seen ${formatTimeAgo(last.read_at)}`
    }

    // Fallback
    return last?.body || 'Say hi 👋'
}

// Legacy function for backward compatibility
export async function getChatPreviews(username: string): Promise<ChatPreview[]> {
    return getVisibleChats(username)
}
