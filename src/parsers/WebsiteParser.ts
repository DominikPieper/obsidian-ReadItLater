import { App, Notice, Platform, moment, request } from 'obsidian';
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

class WebsiteParser extends Parser {
    constructor(app: App, settings: ReadItLaterSettings) {
        super(app, settings);
    }

    test(url: string): boolean {
        return this.isValidUrl(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const originUrl = new URL(url);
        const response = await request({ method: 'GET', url: originUrl.href });
        const document = new DOMParser().parseFromString(response, 'text/html');

        //check for existing base element
        const originBasElements = document.getElementsByTagName('base');
        let originBaseUrl = null;
        if (originBasElements.length > 0) {
            originBaseUrl = originBasElements.item(0).getAttribute('href');
            Array.from(originBasElements).forEach((originBasEl) => {
                originBasEl.remove();
            });
        }

        // Set base to allow Readability to resolve relative path's
        const baseEl = document.createElement('base');
        baseEl.setAttribute('href', getBaseUrl(originBaseUrl ?? originUrl.href, originUrl.origin));
        document.head.append(baseEl);
        const cleanDocumentBody = DOMPurify.sanitize(document.body.innerHTML);
        document.body.innerHTML = cleanDocumentBody;

        if (!isProbablyReaderable(document)) {
            new Notice('@mozilla/readability considers this document to unlikely be readerable.');
        }

        const previewUrl = this.extractPreviewUrl(document);
        const readableDocument = new Readability(document).parse();

        if (!Object.prototype.hasOwnProperty.call(readableDocument, 'content')) {
            this.notParsableArticle(originUrl.href, previewUrl);
        }

        return this.parsableArticle({
            url: originUrl.href,
            previewImageUrl: previewUrl,
            ...readableDocument,
        });
    }

    private async parsableArticle(article: Article) {
        const title = article.title || 'No title';
        const content = await parseHtmlContent(article.content);
        const formattedPublishedTime =
            article.publishedTime !== null ? formatDate(article.publishedTime, this.settings.dateContentFmt) : '';

        const fileNameTemplate = this.settings.parseableArticleNoteTitle
            .replace(/%title%/g, title)
            .replace(/%date%/g, this.getFormattedDateForFilename());

        let processedContent = this.settings.parsableArticleNote
            .replace(/%date%/g, this.getFormattedDateForContent())
            .replace(/%articleTitle%/g, title)
            .replace(/%articleURL%/g, article.url)
            .replace(/%articleReadingTime%/g, `${this.getEstimatedReadingTime(article)}`)
            .replace(/%articleContent%/g, content)
            .replace(/%siteName%/g, article.siteName || '')
            .replace(/%author%/g, article.byline || '')
            .replace(/%previewURL%/g, article.previewImageUrl || '')
            .replace(/%publishedTime%/g, formattedPublishedTime);

        if (this.settings.downloadImages && Platform.isDesktop) {
            processedContent = await this.replaceImages(fileNameTemplate, processedContent);
        }

        return new Note(`${fileNameTemplate}.md`, processedContent);
    }

    private async notParsableArticle(url: string, previewUrl: string | null) {
        console.error('Website not parseable');

        let content = this.settings.notParsableArticleNote
            .replace(/%articleURL%/g, url)
            .replace(/%previewURL%/g, previewUrl || '');

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

    /**
     * Extracts a preview URL from the document.
     * Searches for OpenGraph `og:image` and Twitter `twitter:image` meta tags.
     * @param document The document to extract preview URL from
     */
    private extractPreviewUrl(document: Document): string | null {
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
    private async replaceImages(noteName: string, content: string): Promise<string> {
        const assetsDir = this.settings.downloadImagesInArticleDir
            ? `${this.settings.assetsDir}/${normalizeFilename(noteName)}/`
            : this.settings.assetsDir;
        return replaceImages(this.app, content, assetsDir);
    }
}

export default WebsiteParser;
