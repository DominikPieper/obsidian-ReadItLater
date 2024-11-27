import path from 'path';
import { CapacitorAdapter, FileSystemAdapter, normalizePath } from 'obsidian';
import { ReadItLaterSettings } from 'src/settings';
import { PlatformType, getPlatformType } from './platform';

interface FilesystemLimits {
    path: number;
    fileName: number;
}

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

export function getOsOptimizedPath(
    path: string,
    fileName: string,
    dataAdapter: CapacitorAdapter | FileSystemAdapter,
    filesystemLimits: FilesystemLimits,
): string {
    const fileExtension = `.${fileName.split('.').pop()}`;

    let optimizedFileName = fileName;
    if (optimizedFileName.length > filesystemLimits.fileName) {
        optimizedFileName =
            optimizedFileName.substring(0, filesystemLimits.fileName - fileExtension.length) + `${fileExtension}`;
    }

    let optimizedFilePath = normalizePath(`${path}/${optimizedFileName}`);
    const fullPath = dataAdapter.getFullPath(optimizedFilePath);
    if (fullPath.length > filesystemLimits.path) {
        optimizedFilePath =
            optimizedFilePath.substring(
                0,
                optimizedFilePath.length - (fullPath.length - filesystemLimits.path) - fileExtension.length,
            ) + `${fileExtension}`;
    }

    return optimizedFilePath;
}

export function getFileSystemLimits(platformType: PlatformType, settings: ReadItLaterSettings): FilesystemLimits {
    const defaultFilesystenLimits = getDefaultFilesystenLimits(platformType);

    return {
        path: settings.filesystemLimitPath ?? defaultFilesystenLimits.path,
        fileName: settings.filesystemLimitFileName ?? defaultFilesystenLimits.fileName,
    };
}

export function getDefaultFilesystenLimits(platformType: PlatformType): FilesystemLimits {
    switch (platformType) {
        case PlatformType.Linux:
            return createFilesystemLimits(4096, 255);
        case PlatformType.MacOS:
        case PlatformType.iOS:
        case PlatformType.Android:
        case PlatformType.Mobile:
            return createFilesystemLimits(1024, 255);
        case PlatformType.Windows:
        default:
            return createFilesystemLimits(256, 256);
    }
}

function createFilesystemLimits(path: number, fileName: number): FilesystemLimits {
    return { path: path, fileName: fileName };
}
