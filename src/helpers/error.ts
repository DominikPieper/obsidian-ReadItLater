import { Notice } from 'obsidian';

export function handleError(e: Error) {
    new Notice('Error occured. Please check console output for detailed information.');
    throw e;
}
