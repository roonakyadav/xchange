import { z } from 'zod'
import type { PostMode } from '@/types'

export const usernameSchema = z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')

export const signupSchema = z.object({
    name: z
        .string()
        .min(1, 'Name is required')
        .max(100, 'Name must be at most 100 characters')
        .trim(),
    username: usernameSchema,
    password: z
        .string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password must be at most 100 characters'),
    avatar: z.instanceof(File).optional(),
})

export const signinSchema = z.object({
    username: usernameSchema,
    password: z
        .string()
        .min(1, 'Password is required'),
})

export const postSchema = z.object({
    title: z
        .string()
        .min(1, 'Title is required')
        .max(120, 'Title must be at most 120 characters')
        .trim(),
    description: z
        .string()
        .min(1, 'Description is required')
        .max(2000, 'Description must be at most 2000 characters')
        .trim(),
    mode: z.enum(['selling', 'requesting'] as const),
    price: z
        .string()
        .min(1, 'Price is required'),
    image: z
        .instanceof(File)
        .refine((file) => file.size <= 5 * 1024 * 1024, 'Image must be less than 5MB')
        .refine((file) => file.type.startsWith('image/'), 'Must be an image file'),
})

export const profileSchema = z.object({
    name: z
        .string()
        .min(1, 'Name is required')
        .max(100, 'Name must be at most 100 characters')
        .trim(),
    username: usernameSchema,
})

export const messageSchema = z.object({
    body: z
        .string()
        .min(1, 'Message cannot be empty')
        .max(1000, 'Message must be at most 1000 characters')
        .trim(),
})

export type SignupInput = z.infer<typeof signupSchema>
export type SigninInput = z.infer<typeof signinSchema>
export type PostInput = Omit<z.infer<typeof postSchema>, 'price'> & { price: string }
export type PostInputRaw = {
    title: string
    description: string
    mode: 'selling' | 'requesting'
    price: string
    image: File
}
export type ProfileInput = z.infer<typeof profileSchema>
export type MessageInput = z.infer<typeof messageSchema>
