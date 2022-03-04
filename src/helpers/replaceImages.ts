import { App, DataAdapter } from 'obsidian';
import { basename } from 'path';
import { isValidUrl, normalizeFilename, pathJoin } from './fileutils';
import { checkAndCreateFolder } from './checkAndCreateFolder';
import { downloadImage } from './downloadImage';
import { linkHashes } from './linkHash';

export const EXTERNAL_MEDIA_LINK_PATTERN = /\!\[(?<anchor>.*?)\]\((?<link>.+?)\)/g;
export async function replaceImages(app: App, content: string, assetsDir: string) {
    return await replaceAsync(content, EXTERNAL_MEDIA_LINK_PATTERN, imageTagProcessor(app, assetsDir));
}

export function replaceAsync(string: string, searchValue: string | RegExp, replacer: any) {
    try {
        if (typeof replacer === 'function') {
            // 1. Run fake pass of `replace`, collect values from `replacer` calls
            // 2. Resolve them with `Promise.all`
            // 3. Run `replace` with resolved values
            var values: any[] = [];
            String.prototype.replace.call(string, searchValue, function () {
                values.push(replacer.apply(undefined, arguments));
                return '';
            });
            return Promise.all(values).then(function (resolvedValues) {
                return String.prototype.replace.call(string, searchValue, function () {
                    return resolvedValues.shift();
                });
            });
        } else {
            return Promise.resolve(String.prototype.replace.call(string, searchValue, replacer));
        }
    } catch (error) {
        return Promise.reject(error);
    }
}

export const FILENAME_ATTEMPTS = 5;
export function imageTagProcessor(app: App, mediaDir: string) {
    return async function processImageTag(match: string, anchor: string, link: string) {
        if (!isValidUrl(link)) {
            return match;
        }
        await checkAndCreateFolder(app.vault, mediaDir);

        try {
            const { fileContent, fileExtension } = await downloadImage(link);

            let attempt = 0;
            while (attempt < FILENAME_ATTEMPTS) {
                try {
                    const { fileName, needWrite } = await chooseFileName(
                        app.vault.adapter,
                        mediaDir,
                        anchor,
                        link,
                        fileContent,
                        fileExtension,
                    );

                    if (needWrite && fileName) {
                        await app.vault.createBinary(fileName, fileContent);
                    }

                    if (fileName) {
                        const maskedFilename = fileName.replace(/\s/g, '%20');
                        return `![${anchor}](${maskedFilename})`;
                    } else {
                        return match;
                    }
                } catch (error) {
                    if (error.message === 'File already exists.') {
                        attempt++;
                    } else {
                        throw error;
                    }
                }
            }
            return match;
        } catch (error) {
            console.warn('Image processing failed: ', error);
            return match;
        }
    };
}

export const FORBIDDEN_SYMBOLS_FILENAME_PATTERN = /\s+/g;

export const FILENAME_TEMPLATE = 'media';
export const MAX_FILENAME_INDEX = 1000;

async function chooseFileName(
    adapter: DataAdapter,
    dir: string,
    baseName: string,
    link: string,
    contentData: ArrayBuffer,
    fileExtension: string | false,
): Promise<{ fileName: string; needWrite: boolean }> {
    if (!fileExtension) {
        return { fileName: '', needWrite: false };
    }
    // if there is no anchor try get file name from url
    if (!baseName) {
        const parsedUrl = new URL(link);

        baseName = basename(parsedUrl.pathname);
    }
    // if there is no part for file name from url use name template
    if (!baseName) {
        baseName = FILENAME_TEMPLATE;
    }

    // if filename already ends with correct extension, remove it to work with base name
    if (baseName.endsWith(`.${fileExtension}`)) {
        baseName = baseName.slice(0, -1 * (fileExtension.length + 1));
    }

    baseName = normalizeFilename(baseName);

    let fileName = '';
    let needWrite = true;
    let index = 0;
    while (!fileName && index < MAX_FILENAME_INDEX) {
        const suggestedName = index
            ? pathJoin(dir, `${baseName}-${index}.${fileExtension}`)
            : pathJoin(dir, `${baseName}.${fileExtension}`);

        if (await adapter.exists(suggestedName, false)) {
            linkHashes.ensureHashGenerated(link, contentData);

            const fileData = await adapter.readBinary(suggestedName);

            if (linkHashes.isSame(link, fileData)) {
                fileName = suggestedName;
                needWrite = false;
            }
        } else {
            fileName = suggestedName;
        }

        index++;
    }
    if (!fileName) {
        throw new Error('Failed to generate file name for media file.');
    }

    linkHashes.ensureHashGenerated(link, contentData);

    return { fileName, needWrite };
}
