// Utility functions for ThumbnailGrid

/**
 * Formats seconds into a human-readable duration string (e.g., "1:23" or "1:02:34")
 */
export const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts: (string | number)[] = [];
    if (h > 0) parts.push(h);
    parts.push(h > 0 ? String(m).padStart(2, '0') : m);
    parts.push(String(s).padStart(2, '0'));

    return parts.join(':');
};

/**
 * Constructs the full URL for media items, adding token if available
 */
export const getFullMediaUrl = (url: string): string => {
    let finalUrl = url;
    const token = localStorage.getItem('token');
    const tokenSuffix = token ? `&token=${token}` : '';

    if (finalUrl.includes('/feed/media/') && !finalUrl.includes('?key=')) {
        const parts = finalUrl.split('/feed/media/');
        if (parts.length === 2) {
            const key = parts[1];
            finalUrl = `/feed/media?key=${encodeURIComponent(key)}${tokenSuffix}`;
        }
    } else if (finalUrl.includes('/feed/media?key=')) {
        // Already converted but might need token
        if (!finalUrl.includes('&token=')) {
            finalUrl += tokenSuffix;
        }
    }

    if (finalUrl.startsWith('http')) return finalUrl;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${baseUrl}${finalUrl}`;
};
