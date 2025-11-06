export type PostMode = 'selling' | 'requesting'

export interface User {
    id: string
    name: string
    username: string
    avatar_url?: string
    password_hash: string
    created_at: string
}

export interface Post {
    id: string
    title: string
    description: string
    image_url: string
    username: string
    mode: PostMode
    price: string
    created_at: string
}

export interface Chat {
    id: string
    user1: string
    user2: string
    post_id?: string
    created_at: string
    updated_at?: string
    last_message?: string
    last_sender?: string
    unread_user1?: number
    unread_user2?: number
    deleted_by_user1?: boolean
    deleted_by_user2?: boolean
}

export interface Message {
    id: string
    chat_id: string
    sender: string
    body: string
    created_at: string
    delivered_at?: string
    read_at?: string
    is_read?: boolean
}

export interface PostWithUser extends Post {
    users: User | null
}

export interface ChatWithPost extends Chat {
    posts?: {
        title: string
        image_url: string
    } | null
}

export interface ChatWithMessages extends Chat {
    messages: Message[]
}
