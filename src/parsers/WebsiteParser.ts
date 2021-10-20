import { Parser } from './Parser';
import { Note } from './Note';
import { htmlToMarkdown, request } from 'obsidian';
import { getBaseUrl } from '../helper';
import { Readability } from '@mozilla/readability';
import { ReadItLaterSettings } from '../settings';

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
        const dom = new DOMParser().parseFromString(response, 'text/html');

        // Set base to allow Readability to resolve relative path's
        const baseEl = dom.createElement('base');
        baseEl.setAttribute('href', getBaseUrl(url));
        dom.head.append(baseEl);

        const article = new Readability(dom).parse();

        return article?.content ? this.parsableArticle(article, url) : this.notParsableArticle(url);
    }

    private parsableArticle(article: Article, url: string) {
        const articleTitle = article.title || 'No title';
        const articleContent = htmlToMarkdown(article.content);

        const content = this.settings.parsableArticleNote
            .replace('%articleTitle%', articleTitle)
            .replace('%articleURL%', url)
            .replace('%articleContent%', articleContent);

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
