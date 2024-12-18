import { Delimiter, getDelimiterValue } from 'src/enums/delimiter';
import { HTTPS_PROTOCOL, HTTP_PROTOCOL } from 'src/constants/urlProtocols';
import { isValidUrl } from './fileutils';

export function createRandomString(length: number) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export interface UrlCheckResult {
    urls: string[];
    everyLineIsURL: boolean;
}

export function getAndCheckUrls(content: string, delimiter: Delimiter): UrlCheckResult {
    const delimitedContent = content
        .trim()
        .split(getDelimiterValue(delimiter))
        .filter((line) => line.trim().length > 0);

    const everyLineIsURL = delimitedContent.reduce((status: boolean, url: string): boolean => {
        return status && isValidUrl(url, [HTTP_PROTOCOL, HTTPS_PROTOCOL]);
    }, true);

    return {
        urls: delimitedContent,
        everyLineIsURL: everyLineIsURL,
    };
}
