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
    readabilityArticle: ReadabilityArticle | null;
    articleOgDescription: string;
    articleMetaAuthor: string;
    articlePublishedTime: string;
}

// WeChat "picture message" image URLs captured from the page scripts before sanitization,
// stashed on the document so makeNote can fall back to them (see getDocument).
type WeChatPictureDocument = Document & { __weChatPictureImages?: string[] };

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
        const createdAt = new Date();
        const previewUrl = this.extractPreviewUrl(document);

        // Extract OG/meta fields for template variables and thin-content fallback
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? '';
        const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ?? '';
        const metaAuthor =
            document.querySelector('meta[name="author"]')?.getAttribute('content') ??
            document.querySelector('meta[property="article:author"]')?.getAttribute('content') ??
            '';
        const rawPublishedTime =
            document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ?? '';

        // WeChat picture-message posts have no readable article body; build the note from the
        // OG metadata plus the gallery images captured in getDocument before sanitization.
        const weChatImages = (document as WeChatPictureDocument).__weChatPictureImages;
        if (weChatImages && weChatImages.length > 0) {
            const { text: weChatDescription, topics } = this.parseWeChatDescription(ogDescription);
            const articleContent = [
                weChatDescription,
                // Inline code keeps the hashtags searchable without Obsidian indexing them as vault tags.
                topics.map((topic) => `\`#${topic}\``).join(' '),
                ...weChatImages.map((image) => `![](${image})`),
            ]
                .filter(Boolean)
                .join('\n\n');
            return this.parsableArticle(
                {
                    date: this.getFormattedDateForContent(createdAt),
                    articleTitle: ogTitle || 'No title',
                    articleURL: originUrl.href,
                    articleReadingTime: 0,
                    articleContent,
                    siteName: ogSiteName,
                    author: metaAuthor,
                    previewURL: previewUrl || '',
                    publishedTime: rawPublishedTime ? this.getFormattedDateForContent(rawPublishedTime) : '',
                    readabilityArticle: null,
                    articleOgDescription: ogDescription,
                    articleMetaAuthor: metaAuthor,
                    articlePublishedTime: rawPublishedTime ? this.getFormattedDateForContent(rawPublishedTime) : '',
                },
                createdAt,
            );
        }

        // Checked only after the WeChat picture-message branch: those pages have no readable
        // body by design, so warning about them would be a false alarm.
        if (!isProbablyReaderable(document)) {
            new Notice('@mozilla/readability considers this document to unlikely be readerable.');
        }

        const readableDocument = new Readability(document).parse();

        if (readableDocument === null || !Object.prototype.hasOwnProperty.call(readableDocument, 'content')) {
            return this.notParsableArticle(originUrl.href, previewUrl, createdAt, {
                title: ogTitle,
                description: ogDescription,
                siteName: ogSiteName,
            });
        }

        // Fall back to not-parsable path for thin content (JS-rendered pages, paywalls, etc.)
        if (readableDocument.textContent.trim().length < 100) {
            return this.notParsableArticle(originUrl.href, previewUrl, createdAt, {
                title: ogTitle,
                description: ogDescription,
                siteName: ogSiteName,
            });
        }

        const content = await parseHtmlContent(readableDocument.content);

        return this.parsableArticle(
            {
                date: this.getFormattedDateForContent(createdAt),
                articleTitle: readableDocument.title || ogTitle || 'No title',
                articleURL: originUrl.href,
                articleReadingTime: this.getEstimatedReadingTime(readableDocument),
                articleContent: content,
                siteName: readableDocument.siteName || ogSiteName || '',
                author: readableDocument.byline || metaAuthor || '',
                previewURL: previewUrl || '',
                publishedTime:
                    readableDocument.publishedTime !== null
                        ? this.getFormattedDateForContent(readableDocument.publishedTime)
                        : '',
                readabilityArticle: readableDocument,
                articleOgDescription: ogDescription,
                articleMetaAuthor: metaAuthor,
                articlePublishedTime: rawPublishedTime ? this.getFormattedDateForContent(rawPublishedTime) : '',
            },
            createdAt,
        );
    }

    protected async getDocument(url: URL): Promise<Document> {
        const document = await this.parseHtmlDom(url);

        // WeChat "picture message" posts (swipeable image galleries) have no readable article
        // body; their images live only in a window.picture_page_info_list script that the
        // DOMPurify pass below strips, so capture them now for makeNote to fall back on.
        // Regular WeChat articles can also carry picture_page_info_list scripts, so only treat
        // the page as a picture message when the article body container is absent — otherwise
        // Readability must handle it (https://github.com/DominikPieper/obsidian-ReadItLater/pull/241).
        if (
            url.hostname === 'mp.weixin.qq.com' &&
            document.querySelector('#js_content, .rich_media_content') === null
        ) {
            const weChatImages = this.extractWeChatPictureImages(document);
            if (weChatImages.length > 0) {
                (document as WeChatPictureDocument).__weChatPictureImages = weChatImages;
            }
        }

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

        //fix for Readability removing <figure> elements in <div>
        document.body.querySelectorAll('div > figure')?.forEach((figure) => {
            const figureEl = figure;
            figure.parentElement.before(figureEl);
        });

        //fix for WeChat site (https://github.com/DominikPieper/obsidian-ReadItLater/issues/187)
        document.body.querySelector('.rich_media_content.js_underline_content')?.removeAttribute('style');
        document.body.querySelectorAll('.rich_media_content.js_underline_content img[data-src]')?.forEach((imgEl) => {
            if (imgEl.getAttribute('src') === null) {
                imgEl.setAttribute('src', imgEl.getAttribute('data-src'));
            }
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

    protected async notParsableArticle(
        url: string,
        previewUrl: string | null,
        createdAt: Date,
        ogData?: { title?: string; description?: string; siteName?: string },
    ): Promise<Note> {
        console.error('Website not parseable');

        let content = this.templateEngine.render(this.plugin.settings.notParsableArticleNote, {
            articleURL: url,
            previewURL: previewUrl ?? '',
            articleTitle: ogData?.title ?? '',
            articleOgDescription: ogData?.description ?? '',
            siteName: ogData?.siteName ?? '',
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
    /**
     * Decodes the og:description of a WeChat picture-message page. WeChat escapes newlines and
     * ampersands as literal \xNN sequences and appends the post's topic hashtags as
     * double-escaped `<a class="wx_topic_link">#topic</a>` anchors. Restores the escapes,
     * decodes the entities, and splits the topics out of the body text.
     */
    private parseWeChatDescription(raw: string): { text: string; topics: string[] } {
        const unescaped = raw.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex: string) =>
            String.fromCharCode(parseInt(hex, 16)),
        );
        const decoded = new DOMParser().parseFromString(unescaped, 'text/html').documentElement.textContent ?? '';
        const fragment = new DOMParser().parseFromString(decoded, 'text/html');
        const topics: string[] = [];
        fragment.querySelectorAll('a.wx_topic_link').forEach((anchor) => {
            const topic = anchor.textContent?.replace(/^#/, '').trim();
            if (topic) {
                topics.push(topic);
            }
            anchor.remove();
        });
        return { text: fragment.body.textContent?.trim() ?? '', topics };
    }

    /**
     * Extracts image URLs from a WeChat picture-message page. The gallery lives in a
     * `window.picture_page_info_list` array where each item is `... height: 'NNN' * 1,
     * cdn_url: 'https://...'`; the top-level cdn_url is the image (nested watermark/share_cover
     * cdn_urls are not preceded by `height`, so this regex skips them). Returns [] if the page
     * is not a picture message.
     */
    private extractWeChatPictureImages(document: Document): string[] {
        const scripts = Array.from(document.querySelectorAll('script'))
            .map((script) => script.textContent ?? '')
            .join('\n');
        if (!scripts.includes('picture_page_info_list')) {
            return [];
        }
        return Array.from(scripts.matchAll(/height:\s*'\d+'\s*\*\s*1,\s*cdn_url:\s*'([^']+)'/g)).map(
            (match) => match[1],
        );
    }

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
