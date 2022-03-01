import { Parser } from './Parser';
import { Note } from './Note';
import { Notice, request } from 'obsidian';
import { getBaseUrl } from '../helper';
import { isProbablyReaderable, Readability } from '@mozilla/readability';
import { ReadItLaterSettings } from '../settings';
import TurndownService from 'turndown';
import * as DOMPurify from 'isomorphic-dompurify';
import * as turndownPluginGfm from '@guyplusplus/turndown-plugin-gfm';

type Article = {
    title: string;
    content: string;
};

class WebsiteParser extends Parser {
    constructor(settings: ReadItLaterSettings) {
        super(settings);
    }

    test(url: string): boolean {
        return this.isValidUrl(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const response = await request({ method: 'GET', url });
        const document = new DOMParser().parseFromString(response, 'text/html');

        // Set base to allow Readability to resolve relative path's
        const baseEl = document.createElement('base');
        baseEl.setAttribute('href', getBaseUrl(url));
        document.head.append(baseEl);
        const cleanDocumentBody = DOMPurify.sanitize(document.body.innerHTML);
        document.body.innerHTML = cleanDocumentBody;

        if (!isProbablyReaderable(document)) {
            new Notice('@mozilla/readability considers this document to unlikely be readerable.');
        }
        const readableDocument = new Readability(document).parse();

        return readableDocument?.content ? this.parsableArticle(readableDocument, url) : this.notParsableArticle(url);
    }

    private parsableArticle(article: Article, url: string) {
        const gfm = turndownPluginGfm.gfm;
        const turndownService = new TurndownService({
            headingStyle: 'atx',
            hr: '---',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced',
            emDelimiter: '*',
        });
        turndownService.use(gfm);
        const articleTitle = article.title || 'No title';
        const articleContent = turndownService.turndown(article.content);

        const content = this.settings.parsableArticleNote
            .replace(/%articleTitle%/g, articleTitle)
            .replace(/%articleURL%/g, url)
            .replace(/%articleContent%/g, articleContent);

        const fileName = `${articleTitle}.md`;
        return new Note(fileName, content);
    }

    private notParsableArticle(url: string) {
        console.error('Website not parseable');

        const content = this.settings.notParsableArticleNote.replace('%articleURL%', url);

        const fileName = `Article (${this.getFormattedDateForFilename()}).md`;
        return new Note(fileName, content);
    }
}

export default WebsiteParser;
