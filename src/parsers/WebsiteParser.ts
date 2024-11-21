import { App, Notice, Platform, request } from 'obsidian';
import { Readability, isProbablyReaderable } from '@mozilla/readability';
import * as DOMPurify from 'isomorphic-dompurify';
import { formatDate, getBaseUrl, normalizeFilename, replaceImages } from '../helpers';
import { ReadItLaterSettings } from '../settings';
import { Note } from './Note';
import { Parser } from './Parser';
import { parseHtmlContent } from './parsehtml';

type Article = {
    url: string;
    previewImageUrl: string | null;
    title: string;
    content: string;
    textContent: string;
    length: number;
    excerpt: string;
    byline: string;
    dir: string;
    siteName: string;
    lang: string;
    publishedTime: string | null;
};

type JinaReaderResponse = {
    code: number;
    status: number;
    data: {
        title: string;
        description: string;
        url: string;
        content: string;
        images?: Record<string, string>;
        links?: Record<string, string>;
    };
};

class WebsiteParser extends Parser {
    constructor(app: App, settings: ReadItLaterSettings) {
        super(app, settings);
    }

    test(url: string): boolean {
        return this.isValidUrl(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const originUrl = new URL(url);
        const document = await this.getDocument(originUrl);

        return this.makeNote(document, originUrl);
    }

    protected async makeNote(document: Document, originUrl: URL): Promise<Note> {
        const content = document.body.innerHTML;
        const title = document.querySelector('h1')?.textContent || 'No title';

        return this.parsableArticle({
            url: originUrl.href,
            previewImageUrl: null,
            title: title,
            content: content,
            textContent: document.body.textContent || '',
            length: content.length,
            excerpt: '',
            byline: '',
            dir: 'ltr',
            siteName: '',
            lang: 'en',
            publishedTime: null
        });
    }

    protected async getDocument(url: URL): Promise<Document> {

        const response = await request({
            url: 'https://r.jina.ai/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Return-Format': 'markdown'
                'X-Remove-Selector': 'header, .class, #id',
                'X-Timeout': '30'
            },
            body: JSON.stringify({
                url: url.href,
                options: 'Markdown'
            })
        });

        const jinaResponse = JSON.parse(response) as JinaReaderResponse;
        
        if (jinaResponse.code !== 200) {
            throw new Error(`Failed to fetch content: ${jinaResponse.status}`);
        }

        const doc = new DOMParser().parseFromString('<html><head></head><body></body></html>', 'text/html');
        
        const article = doc.createElement('article');
        article.innerHTML = jinaResponse.data.content;
        doc.body.appendChild(article);

        const title = doc.createElement('h1');
        title.textContent = jinaResponse.data.title;
        doc.body.insertBefore(title, article);

        return doc;
    }

    protected async parsableArticle(article: Article): Promise<Note> {
        const title = article.title || 'No title';
        const content = await parseHtmlContent(article.content);
        const formattedPublishedTime =
            article.publishedTime !== null ? formatDate(article.publishedTime, this.settings.dateContentFmt) : '';

        const fileNameTemplate = this.settings.parseableArticleNoteTitle
            .replace(/%title%/g, () => title)
            .replace(/%date%/g, this.getFormattedDateForFilename());

        let processedContent = this.settings.parsableArticleNote
            .replace(/%date%/g, this.getFormattedDateForContent())
            .replace(/%articleTitle%/g, () => title)
            .replace(/%articleURL%/g, () => article.url)
            .replace(/%articleReadingTime%/g, `${this.getEstimatedReadingTime(article)}`)
            .replace(/%siteName%/g, () => article.siteName || '')
            .replace(/%author%/g, () => article.byline || '')
            .replace(/%previewURL%/g, () => article.previewImageUrl || '')
            .replace(/%publishedTime%/g, formattedPublishedTime)
            // Content must be the last replaced variable in order to prevent replacing website content.
            .replace(/%articleContent%/g, () => content);

        if (this.settings.downloadImages && Platform.isDesktop) {
            processedContent = await this.replaceImages(fileNameTemplate, processedContent);
        }

        return new Note(`${fileNameTemplate}.md`, processedContent);
    }

    protected async notParsableArticle(url: string, previewUrl: string | null): Promise<Note> {
        console.error('Website not parseable');

        let content = this.settings.notParsableArticleNote
            .replace(/%articleURL%/g, () => url)
            .replace(/%previewURL%/g, () => previewUrl || '');

        const fileNameTemplate = this.settings.notParseableArticleNoteTitle.replace(
            /%date%/g,
            this.getFormattedDateForFilename(),
        );

        if (this.settings.downloadImages && Platform.isDesktop) {
            content = await this.replaceImages(fileNameTemplate, content);
        }

        return new Note(`${fileNameTemplate}.md`, content);
    }

    /**
     * Extracts a preview URL from the document.
     * Searches for OpenGraph `og:image` and Twitter `twitter:image` meta tags.
     * @param document The document to extract preview URL from
     */
    protected extractPreviewUrl(document: Document): string | null {
        let previewMetaElement = document.querySelector('meta[property="og:image"]');
        if (previewMetaElement == null) {
            previewMetaElement = document.querySelector('meta[name="twitter:image"]');
        }
        return previewMetaElement?.getAttribute('content');
    }

    /**
     * Replaces distant images by their locally downloaded counterparts.
     * @param noteName The note name
     * @param content The note content
     */
    protected async replaceImages(noteName: string, content: string): Promise<string> {
        const assetsDir = this.settings.downloadImagesInArticleDir
            ? `${this.settings.assetsDir}/${normalizeFilename(noteName)}/`
            : this.settings.assetsDir;
        return replaceImages(this.app, content, assetsDir);
    }

    /**
     * Returns estimated reading time of article in minutes
     */
    private getEstimatedReadingTime(article: Article): number {
        const readingSpeed = this.getReadingSpeed(article.lang || 'en');
        const words = article.textContent.trim().split(/\s+/).length;

        return Math.ceil(words / readingSpeed);
    }

    /**
     * Reading speed in words per minute. Data are gathered from this study https://irisreading.com/average-reading-speed-in-various-languages/
     */
    private getReadingSpeed(lang: string): number {
        const readingSpeed = new Map([
            ['en', 228],
            ['ar', 138],
            ['de', 179],
            ['es', 218],
            ['fi', 161],
            ['fr', 195],
            ['he', 187],
            ['it', 188],
            ['ja', 193],
            ['nl', 202],
            ['pl', 166],
            ['pt', 181],
            ['ru', 184],
            ['sk', 190],
            ['sl', 180],
            ['sv', 199],
            ['tr', 166],
            ['zh', 158],
        ]);

        return readingSpeed.get(lang) || readingSpeed.get('en');
    }
}

export default WebsiteParser;
