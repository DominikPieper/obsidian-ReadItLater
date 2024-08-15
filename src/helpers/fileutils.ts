import path from 'path';
import { FileSystemAdapter, normalizePath } from 'obsidian';
import ReadItLaterPlugin from '../main';

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
    return fileName.replace(/[:#/\\|?*<>"]/g, '');
}

export function pathJoin(dir: string, subpath: string): string {
    const result = path.join(dir, subpath);
    // it seems that obsidian do not understand paths with backslashes in Windows, so turn them into forward slashes
    return normalizePath(result.replace(/\\/g, '/'));
}

export function clampFilePath(filePath: string, plugin: ReadItLaterPlugin): string {
    if (!(plugin.app.vault.adapter instanceof FileSystemAdapter)) return filePath;
    const fullPath = plugin.app.vault.adapter.getFullPath(filePath);
    const maxFilePath = parseInt(plugin.settings.maxFilePathLength);

    let exceedingCharacterCount = 0;
    if (maxFilePath > 0) exceedingCharacterCount = fullPath.length - maxFilePath;

    const noteSuffix = plugin.settings.maxFilePathExceededSuffix + '.md';
    if (exceedingCharacterCount > 0)
        filePath = filePath.substring(0, filePath.length - exceedingCharacterCount - noteSuffix.length) + noteSuffix;
    return filePath;
}
