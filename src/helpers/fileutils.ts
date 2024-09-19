import path from 'path';
import { normalizePath } from 'obsidian';

export function isValidUrl(url: string, allowedProtocols: string[] = []): boolean {
    let urlObject;
    try {
        urlObject = new URL(url);
    } catch (e) {
        return false;
    }

    if (allowedProtocols.length === 0) {
        return true;
    }

    return allowedProtocols.includes(urlObject.protocol);
}

export function getBaseUrl(url: string, origin: string): string {
    const baseURL = new URL(url, origin);
    return baseURL.href;
}

export function normalizeFilename(fileName: string): string {
    return fileName.replace(/[:#/\\|?*<>"]/g, '');
}

export function pathJoin(dir: string, subpath: string): string {
    const result = path.join(dir, subpath);
    // it seems that obsidian do not understand paths with backslashes in Windows, so turn them into forward slashes
    return normalizePath(result.replace(/\\/g, '/'));
}
