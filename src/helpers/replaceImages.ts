import { CapacitorAdapter, DataAdapter, FileSystemAdapter, normalizePath, requestUrl } from 'obsidian';
import { HTTPS_PROTOCOL, HTTP_PROTOCOL } from 'src/constants/urlProtocols';
import ReadItLaterPlugin from 'src/main';
import { FilesystemLimits, getFileExtensionFromMimeType, getOsOptimizedPath, isValidUrl } from './fileutils';
import { createRandomString } from './stringUtils';

type Replacer = {
    (match: string, anchor: string, link: string): Promise<string>;
};

const EXTERNAL_MEDIA_LINK_PATTERN = /!\[(?<anchor>.*?)\]\((?<link>.+?)\)/g;
const CREATE_FILENAME_ATTEMPTS = 5;
const MAX_FILENAME_INDEX = 1000;

export async function replaceImages(
    plugin: ReadItLaterPlugin,
    noteFileName: string,
    content: string,
    assetsDir: string,
): Promise<string> {
    return await replaceAsync(content, EXTERNAL_MEDIA_LINK_PATTERN, imageTagProcessor(plugin, noteFileName, assetsDir));
}

async function replaceAsync(content: string, searchValue: string | RegExp, replacer: Replacer) {
    try {
        if (typeof replacer === 'function') {
            // 1. Run fake pass of `replace`, collect values from `replacer` calls
            // 2. Resolve them with `Promise.all`
            // 3. Run `replace` with resolved values
            const values: Promise<string>[] = [];
            String.prototype.replace.call(content, searchValue, function (match: string, anchor: string, link: string) {
                values.push(replacer(match, anchor, link));
                return '';
            });
            return Promise.all(values).then(function (resolvedValues) {
                return String.prototype.replace.call(content, searchValue, function () {
                    return resolvedValues.shift();
                });
            });
        } else {
            return Promise.resolve(String.prototype.replace.call(content, searchValue, replacer));
        }
    } catch (error) {
        console.error();
        return Promise.reject(error);
    }
}

function imageTagProcessor(plugin: ReadItLaterPlugin, noteFileName: string, assetsDir: string): Replacer {
    return async function processImageTag(match: string, anchor: string, link: string): Promise<string> {
        if (!isValidUrl(link, [HTTP_PROTOCOL, HTTPS_PROTOCOL])) {
            return match;
        }
        const url = new URL(link);
        await plugin.getVaultRepository().createDirectory(assetsDir);

        try {
            const { fileContent, fileExtension } = await downloadImage(url);

            let attempt = 0;
            while (attempt < CREATE_FILENAME_ATTEMPTS) {
                try {
                    const { fileName, needWrite } = await chooseFileName(
                        plugin.app.vault.adapter,
                        plugin.getFileSystemLimits(),
                        assetsDir,
                        noteFileName,
                        fileExtension,
                    );

                    if (needWrite && fileName !== '') {
                        await plugin.app.vault.createBinary(fileName, fileContent);
                        const maskedFilename = fileName.replace(/\s/g, '%20');
                        return `![${anchor}](${maskedFilename})`;
                    } else {
                        return match;
                    }
                } catch (error) {
                    console.warn(error);
                    attempt++;
                }
            }
            return match;
        } catch (error) {
            console.warn(error);
            return match;
        }
    };
}

async function chooseFileName(
    dataAdapter: DataAdapter,
    filesystemLimits: FilesystemLimits,
    assetsDir: string,
    noteFileName: string,
    fileExtension: string,
): Promise<{ fileName: string; needWrite: boolean }> {
    if (fileExtension === '') {
        return { fileName: '', needWrite: false };
    }

    let needWrite = false;
    let fileName = '';
    let index = 0;
    while (fileName === '' && index < MAX_FILENAME_INDEX) {
        let suggestedName;
        if (dataAdapter instanceof CapacitorAdapter || dataAdapter instanceof FileSystemAdapter) {
            suggestedName = getOsOptimizedPath(
                assetsDir,
                `${noteFileName}-${createRandomString(10)}.${fileExtension}`,
                dataAdapter,
                filesystemLimits,
            );
        } else {
            suggestedName = `${assetsDir}/${noteFileName}-${createRandomString(10)}.${fileExtension}`;
        }

        if (!(await dataAdapter.exists(normalizePath(suggestedName), false))) {
            fileName = suggestedName;
            needWrite = true;
        }

        index++;
    }

    return { fileName, needWrite };
}

async function downloadImage(url: URL): Promise<{ fileContent: ArrayBuffer; fileExtension: string }> {
    const res = await requestUrl({
        url: url.href,
        method: 'get',
    });

    return {
        fileContent: res.arrayBuffer,
        fileExtension: getFileExtensionFromMimeType(res.headers['content-type'] || '') ?? '',
    };
}
