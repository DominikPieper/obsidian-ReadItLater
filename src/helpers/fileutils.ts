import { normalizePath } from 'obsidian';
import path from 'path';

export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
    } catch (e) {
        return false;
    }
    return true;
}

export function getBaseUrl(url: string, origin: string): string {
    const baseURL = new URL(url, origin);
    return baseURL.href;
}

export function normalizeFilename(fileName: string): string {
    const illegalSymbols = [':', '#', '/', '\\', '|', '?', '*', '<', '>', '"'];
    if (illegalSymbols.some((el) => fileName.contains(el))) {
        illegalSymbols.forEach((ilSymbol) => {
            fileName = fileName.replace(ilSymbol, '');
        });

        return fileName;
    } else {
        return fileName;
    }
}

export function pathJoin(dir: string, subpath: string): string {
    const result = path.join(dir, subpath);
    // it seems that obsidian do not understand paths with backslashes in Windows, so turn them into forward slashes
    return normalizePath(result.replace(/\\/g, '/'));
}
