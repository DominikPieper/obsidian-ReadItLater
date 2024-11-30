import { CapacitorAdapter, FileSystemAdapter, Platform, normalizePath } from 'obsidian';
import { ReadItLaterSettings } from 'src/settings';
import mime from 'mime';

export interface FilesystemLimits {
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

export function getOsOptimizedPath(
    path: string,
    fileName: string,
    dataAdapter: CapacitorAdapter | FileSystemAdapter,
    filesystemLimits: FilesystemLimits,
): string {
    const fileExtension = `.${getFileExtension(fileName)}`;

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

export function getFileSystemLimits(platform: typeof Platform, settings: ReadItLaterSettings): FilesystemLimits {
    const defaultFilesystenLimits = getDefaultFilesystenLimits(platform);

    return {
        path: settings.filesystemLimitPath ?? defaultFilesystenLimits.path,
        fileName: settings.filesystemLimitFileName ?? defaultFilesystenLimits.fileName,
    };
}

export function getDefaultFilesystenLimits(platform: typeof Platform): FilesystemLimits {
    if (platform.isLinux) {
        return createFilesystemLimits(4096, 255);
    }
    if (platform.isMacOS || platform.isIosApp || platform.isAndroidApp || platform.isMobile) {
        return createFilesystemLimits(1024, 255);
    }

    return createFilesystemLimits(256, 256);
}

export function getFileExtension(fileName: string): string {
    if (!fileName.includes('.')) {
        return '';
    }

    return fileName.split('.').pop();
}

export function getFileExtensionFromMimeType(mimeType: string): string {
    return mime.getExtension(mimeType) ?? '';
}

function createFilesystemLimits(path: number, fileName: number): FilesystemLimits {
    return { path: path, fileName: fileName };
}
