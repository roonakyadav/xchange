import { supabase } from './supabase'
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
    const { data, error } = await supabase
        .from('messages')
        .insert({
            chat_id: chatId,
            sender,
            body,
            // Don't set is_read or read_at for new messages - they get marked as read when recipient opens chat
        })
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to send message: ${error.message}`)
    }

    return data
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
    return supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .neq('sender', me)
        .eq('is_read', false)
}

export async function deleteChat(chatId: string): Promise<void> {
    const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId)

    if (error) throw error
}

export async function blockUser(blocker: string, blocked: string): Promise<void> {
    const { error } = await supabase
        .from('blocks')
        .insert({
            blocker,
            blocked,
        })

    if (error) {
        throw new Error(`Failed to block user: ${error.message}`)
    }
}

export async function isUserBlocked(user1: string, user2: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('blocks')
        .select('id')
        .or(`and(blocker.eq.${user1},blocked.eq.${user2}),and(blocker.eq.${user2},blocked.eq.${user1})`)
        .single()

    if (error && error.code !== 'PGRST116') {
        console.error('Error checking block status:', error)
        return false
    }

    return !!data
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

export async function getChatPreviews(username: string): Promise<ChatPreview[]> {
    // Get all chats for user that have at least one message
    const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select(`
            *,
            posts (
                title,
                image_url
            ),
            messages!inner(*)
        `)
        .or(`user1.eq.${username},user2.eq.${username}`)
        .order('updated_at', { ascending: false })

    if (chatsError) {
        throw new Error(`Failed to get chats: ${chatsError.message}`)
    }

    if (!chats || chats.length === 0) {
        return []
    }

    // Get last message and unread counts for each chat
    const chatPreviews: ChatPreview[] = []

    for (const chat of chats) {
        const otherUser = chat.user1 === username ? chat.user2 : chat.user1

        // Get last message (we know it exists since we used inner join)
        const { data: lastMessage, error: messageError } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (messageError) {
            console.error('Error getting last message:', messageError)
            continue // Skip this chat if we can't get the last message
        }

        // Calculate unreadIncoming: messages from other user that are not read by me
        const unreadIncoming = chat.messages.filter((m: Message) =>
            m.sender !== username && !m.is_read
        ).length

        // Calculate unreadOutgoing: messages from me that are not read by them
        const unreadOutgoing = chat.messages.filter((m: Message) =>
            m.sender === username && !m.is_read
        ).length

        chatPreviews.push({
            ...chat,
            lastMessage: lastMessage || undefined,
            unreadCount: unreadIncoming,
            outgoingPendingCount: unreadOutgoing,
            otherUser,
        })
    }

    return chatPreviews
}
