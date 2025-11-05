export function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 1) {
        return 'Just now'
    }

    if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`
    }

    if (diffInHours < 24) {
        return `${diffInHours}h ago`
    }

    if (diffInDays < 7) {
        return `${diffInDays}d ago`
    }

    // Use Intl.RelativeTimeFormat for better i18n support
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

    if (diffInDays < 30) {
        return rtf.format(-diffInDays, 'day')
    }

    if (diffInDays < 365) {
        const diffInMonths = Math.floor(diffInDays / 30)
        return rtf.format(-diffInMonths, 'month')
    }

    const diffInYears = Math.floor(diffInDays / 365)
    return rtf.format(-diffInYears, 'year')
}

export function formatMessageTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const isThisYear = date.getFullYear() === now.getFullYear()
    if (isThisYear) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }

    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}
