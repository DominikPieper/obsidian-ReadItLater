import { Notice } from 'obsidian';

export function handleError(error: Error, noticeMessage: string) {
    new Notice(`${noticeMessage} Check the console output.`);
    throw error;
}
