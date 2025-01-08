import { Notice, Platform, RequestUrlResponse, requestUrl } from 'obsidian';
import { Readability, isProbablyReaderable } from '@mozilla/readability';
import * as DOMPurify from 'isomorphic-dompurify';
import { getBaseUrl, normalizeFilename } from 'src/helpers/fileutils';
import { replaceImages } from 'src/helpers/replaceImages';
import { desktopBrowserUserAgent } from 'src/helpers/networkUtils';
import { Note } from './Note';
import { Parser } from './Parser';
import { parseHtmlContent } from './parsehtml';

interface ReadabilityArticle {
    title: string;
    content: string;
    textContent: string;
    length: number;
    excerpt: string;
    byline: string;
    dir: string;
    siteName: string;
    lang: string;
    publishedTime: string;
}

interface WebsiteNoteData {
    date: string;
    articleTitle: string;
    articleURL: string;
    articleReadingTime: number;
    articleContent: string;
    siteName: string;
    author: string;
    previewURL: string;
    publishedTime: string;
    readabilityArticle: ReadabilityArticle;
}

class WebsiteParser extends Parser {
    test(url: string): boolean {
        return this.isValidUrl(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const originUrl = new URL(url);
        const document = await this.getDocument(originUrl);

        return this.makeNote(document, originUrl);
    }

    protected async makeNote(document: Document, originUrl: URL): Promise<Note> {
        if (!isProbablyReaderable(document)) {
            new Notice('@mozilla/readability considers this document to unlikely be readerable.');
        }

        const createdAt = new Date();
        const previewUrl = this.extractPreviewUrl(document);
        const readableDocument = new Readability(document).parse();

        if (readableDocument === null || !Object.prototype.hasOwnProperty.call(readableDocument, 'content')) {
            return this.notParsableArticle(originUrl.href, previewUrl, createdAt);
        }

        const content = await parseHtmlContent(readableDocument.content);

        return this.parsableArticle(
            {
                date: this.getFormattedDateForContent(createdAt),
                articleTitle: readableDocument.title || 'No title',
                articleURL: originUrl.href,
                articleReadingTime: this.getEstimatedReadingTime(readableDocument),
                articleContent: content,
                siteName: readableDocument.siteName || '',
                author: readableDocument.byline || '',
                previewURL: previewUrl || '',
                publishedTime:
                    readableDocument.publishedTime !== null
                        ? this.getFormattedDateForContent(readableDocument.publishedTime)
                        : '',
                readabilityArticle: readableDocument,
            },
            createdAt,
        );
    }

    protected async getDocument(url: URL): Promise<Document> {
        const document = await this.parseHtmlDom(url);

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
        baseEl.setAttribute('href', getBaseUrl(originBaseUrl ?? url.href, url.origin));
        document.head.append(baseEl);
        const cleanDocumentBody = DOMPurify.sanitize(document.body.innerHTML);
        document.body.innerHTML = cleanDocumentBody;

        /*
        DOM optimizations from MarkDownload. Distributed under an Apache License 2.0: https://github.com/deathau/markdownload/blob/main/LICENSE
        */
        document.body.querySelectorAll('pre br')?.forEach((br) => {
            // we need to keep <br> tags because they are removed by Readability.js
            br.outerHTML = '<br-keep></br-keep>';
        });

        document.body.querySelectorAll('h1, h2, h3, h4, h5, h6')?.forEach((header) => {
            // Readability.js will strip out headings from the dom if certain words appear in their className
            // See: https://github.com/mozilla/readability/issues/807
            header.className = '';
        });

        document.body.querySelectorAll('[class*=highlight-text],[class*=highlight-source]')?.forEach((codeSource) => {
            const language = codeSource.className.match(/highlight-(?:text|source)-([a-z0-9]+)/)?.[1];
            if (codeSource.firstElementChild.nodeName == 'PRE') {
                codeSource.removeAttribute('data-snippet-clipboard-copy-content');
                codeSource.firstElementChild.id = `code-lang-${language}`;
            }
        });

        document.body.querySelectorAll('[class*=language-]')?.forEach((codeSource) => {
            const language = codeSource.className.match(/language-([a-z0-9]+)/)?.[1];
            codeSource.id = `code-lang-${language}`;
        });

        document.body.querySelectorAll('.codehilite > pre')?.forEach((codeSource) => {
            if (codeSource.firstChild.nodeName !== 'CODE' && !codeSource.className.includes('language')) {
                codeSource.id = 'code-lang-text';
            }
        });

        //fix for substack images
        document.body.querySelectorAll('.captioned-image-container figure')?.forEach((figure) => {
            const imgEl = figure.querySelector('img');
            if (!imgEl) {
                return;
            }

            figure.querySelector('.image-link').remove();
            figure.prepend(imgEl);
        });

        return document;
    }

    protected async parsableArticle(data: WebsiteNoteData, createdAt: Date): Promise<Note> {
        const fileNameTemplate = this.templateEngine.render(this.plugin.settings.parseableArticleNoteTitle, {
            title: data.articleTitle,
            date: this.getFormattedDateForFilename(createdAt),
        });

        let processedContent = this.templateEngine.render(this.plugin.settings.parsableArticleNote, data);

        if (this.plugin.settings.downloadImages && Platform.isDesktop) {
            processedContent = await replaceImages(
                this.plugin,
                normalizeFilename(fileNameTemplate),
                processedContent,
                this.getAssetsDir(fileNameTemplate, createdAt),
            );
        }

        return new Note(
            fileNameTemplate,
            'md',
            processedContent,
            this.plugin.settings.parseableArticleContentType,
            createdAt,
        );
    }

    protected async notParsableArticle(url: string, previewUrl: string | null, createdAt: Date): Promise<Note> {
        console.error('Website not parseable');

        let content = this.templateEngine.render(this.plugin.settings.notParsableArticleNote, {
            articleURL: url,
            previewURL: previewUrl,
        });

        const fileNameTemplate = this.templateEngine.render(this.plugin.settings.notParseableArticleNoteTitle, {
            date: this.getFormattedDateForFilename(createdAt),
        });

        if (this.plugin.settings.downloadImages && Platform.isDesktop) {
            content = await replaceImages(
                this.plugin,
                normalizeFilename(fileNameTemplate),
                content,
                this.getAssetsDir(fileNameTemplate, createdAt),
            );
        }

        return new Note(
            fileNameTemplate,
            'md',
            content,
            this.plugin.settings.notParseableArticleContentType,
            createdAt,
        );
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

    protected getAssetsDir(fileName: string, createdAt: Date): string {
        if (this.plugin.settings.downloadImagesInArticleDir) {
            const assetsDir = this.templateEngine.render(this.plugin.settings.assetsDir, {
                date: '',
                fileName: '',
                contentType: '',
            });
            return `${assetsDir}/${normalizeFilename(fileName)}`;
        }

        return this.templateEngine.render(this.plugin.settings.assetsDir, {
            date: this.getFormattedDateForFilename(createdAt),
            fileName: normalizeFilename(fileName),
            contentType: this.plugin.settings.parseableArticleContentType,
        });
    }

    /**
     * Returns estimated reading time of article in minutes
     */
    private getEstimatedReadingTime(article: ReadabilityArticle): number {
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

    private async parseHtmlDom(url: URL, charsetOverride: string | null = null): Promise<Document> {
        const response = await requestUrl({
            method: 'GET',
            url: url.href,
            headers: { ...desktopBrowserUserAgent },
        });

        const charset: string = charsetOverride ?? this.getCharsetFromResponseHeader(response);

        const buffer = response.arrayBuffer;
        const decoder = new TextDecoder(charset);
        const text = decoder.decode(buffer);

        const parser = new DOMParser();
        const document = parser.parseFromString(text, 'text/html');

        // Double-check meta tags for charset
        const metaCharset = document.querySelector('meta[charset], meta[http-equiv="Content-Type"]');
        if (metaCharset) {
            const docCharset =
                metaCharset.getAttribute('charset') ||
                metaCharset.getAttribute('content')?.match(/charset=([^;]+)/i)?.[1];
            if (docCharset && docCharset !== charset) {
                // If different charset found in meta, re-decode
                return this.parseHtmlDom(url, docCharset);
            }
        }

        return document;
    }

    private getCharsetFromResponseHeader(response: RequestUrlResponse): string {
        const contentType = response.headers?.['content-type'];
        let charset = 'UTF-8';

        // Try to extract charset from content-type header
        const charsetMatch = contentType?.match(/charset=([^;]+)/i);
        if (charsetMatch) {
            charset = charsetMatch[1];
        }

        return charset;
    }
}

export default WebsiteParser;
