import { request } from 'obsidian';
import { getDesktopBrowserUserAgent } from 'src/helpers/networkUtils';
import { Note } from './Note';
import { Parser } from './Parser';

interface PinAuthor {
    name: string;
    profileURL: string;
}

interface PinImage {
    url: string;
    alt: string;
}

interface Pin {
    id: string;
    url: string;
    title: string | null;
    description: string;
    image: PinImage;
    author: PinAuthor;
    likeCount: number;
    tags: string[];
}

interface PinterestNoteData {
    date: string;
    pinId: string;
    pinURL: string;
    title: string;
    image: string;
    imageAlt: string;
    description: string;
    tags: string;
    likeCount: number;
    authorName: string;
    authorProfileURL: string;
}

export class PinterestParser extends Parser {
    private PATTERN = /^https?:\/\/(?:[a-z]{2}\.)?pinterest\.(?:com|ca|co\.uk|fr|de|es|it)\/pin\/(\d+)\/?/i;

    public test(clipboardContent: string): boolean {
        return this.isValidUrl(clipboardContent) && this.PATTERN.test(clipboardContent);
    }

    public async prepareNote(clipboardContent: string): Promise<Note> {
        const createdAt = new Date();
        const pin = await this.parseHtml(clipboardContent);

        return new Note('', '', '', '', createdAt);
    }

    private async parseHtml(url: string): Promise<Pin> {
        const response = await request({
            method: 'GET',
            url: url,
            headers: { ...getDesktopBrowserUserAgent() },
        });
        const document = new DOMParser().parseFromString(response, 'text/html');

        return {
            id: url.match(this.PATTERN)[1],
            url: url,
            title: document.querySelector('h1')?.textContent ?? '',
        }
    }
}
