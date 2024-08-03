import { moment } from 'obsidian';

export function formatCurrentDate(format: string): string {
    return formatDate(new Date(), format);
}

export function formatDate(date: Date | string, format: string): string {
    return moment(date).format(format);
}
