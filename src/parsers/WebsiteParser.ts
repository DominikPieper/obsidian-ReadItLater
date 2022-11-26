import { Parser } from './Parser';
import { Note } from './Note';
import { App, Notice, Platform, request } from 'obsidian';
import { getBaseUrl, replaceImages } from '../helpers';
import { isProbablyReaderable, Readability } from '@mozilla/readability';
import { ReadItLaterSettings } from '../settings';
import * as DOMPurify from 'isomorphic-dompurify';
import { parseHtmlContent } from './parsehtml';

type Article = {
    title: string;
    content: string;
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
        const readableDocument = new Readability(document).parse();

        return readableDocument?.content
            ? await this.parsableArticle(this.app, readableDocument, originUrl.href)
            : this.notParsableArticle(originUrl.href);
    }

    private async parsableArticle(app: App, article: Article, url: string) {
        const title = article.title || 'No title';
        let content = await parseHtmlContent(article.content);

        const fileNameTemplate = this.settings.parseableArticleNoteTitle
            .replace(/%title%/g, title)
            .replace(/%date%/g, this.getFormattedDateForFilename());

        const assetsDir = `${this.settings.assetsDir}/${fileNameTemplate}/`;

        if (this.settings.downloadImages && Platform.isDesktop) {
            content = await replaceImages(app, content, assetsDir);
        }

        const processedContent = this.settings.parsableArticleNote
            .replace(/%date%/g, this.getFormattedDateForContent())
            .replace(/%articleTitle%/g, title)
            .replace(/%articleURL%/g, url)
            .replace(/%articleContent%/g, content);

        const fileName = `${fileNameTemplate}.md`;
        return new Note(fileName, processedContent);
    }

    private notParsableArticle(url: string) {
        console.error('Website not parseable');

        const content = this.settings.notParsableArticleNote.replace('%articleURL%', url);

        const fileNameTemplate = this.settings.notParsableArticleNote.replace(
            /%date%/g,
            this.getFormattedDateForFilename(),
        );
        const fileName = `${fileNameTemplate}.md`;
        return new Note(fileName, content);
    }
}

export default WebsiteParser;
