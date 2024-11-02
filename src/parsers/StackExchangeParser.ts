import { App, Platform, request } from 'obsidian';
import * as DOMPurify from 'isomorphic-dompurify';
import TemplateEngine from 'src/template/TemplateEngine';
import { normalizeFilename, replaceImages } from '../helpers';
import { ReadItLaterSettings } from '../settings';
import { Parser } from './Parser';
import { Note } from './Note';
import { parseHtmlContent } from './parsehtml';

interface StackExchangeQuestion {
    title: string;
    content: string;
    url: string;
    topAnswer: StackExchangeAnswer;
    answers: Array<StackExchangeAnswer>;
    author: StackExchangeUser;
}

interface StackExchangeAnswer {
    content: string;
    author: StackExchangeUser;
}

interface StackExchangeUser {
    name: string;
    profile: string;
}

class StackExchangeParser extends Parser {
    private PATTERN =
        /(https:\/\/|http:\/\/)(stackoverflow\.com|serverfault\.com|superuser\.com|askubuntu\.com|stackapps\.com|.*\.stackexchange\.com)\/(q|a|questions)\/(\d+)/;

    constructor(app: App, settings: ReadItLaterSettings, templateEngine: TemplateEngine) {
        super(app, settings, templateEngine);
    }

    test(clipboardContent: string): boolean {
        return this.isValidUrl(clipboardContent) && this.PATTERN.test(clipboardContent);
    }

    async prepareNote(clipboardContent: string): Promise<Note> {
        const response = await request({ method: 'GET', url: clipboardContent });
        const document = new DOMParser().parseFromString(response, 'text/html');
        const question = await this.parseDocument(document);

        const fileNameTemplate = this.settings.stackExchangeNoteTitle
            .replace(/%title%/g, () => question.title)
            .replace(/%date%/g, this.getFormattedDateForFilename());

        const topAnswer = question.topAnswer
            ? this.settings.stackExchangeAnswer
                  .replace(/%date%/g, this.getFormattedDateForContent())
                  .replace(/%answerContent%/g, () => question.topAnswer.content)
                  .replace(/%authorName%/g, () => question.topAnswer.author.name)
                  .replace(/%authorProfileURL%/g, () => question.topAnswer.author.profile)
            : '';
        let answers = '';
        for (let i = 0; i < question.answers.length; i++) {
            const answer = this.settings.stackExchangeAnswer
                .replace(/%date%/g, this.getFormattedDateForContent())
                .replace(/%answerContent%/g, () => question.answers[i].content)
                .replace(/%authorName%/g, () => question.answers[i].author.name)
                .replace(/%authorProfileURL%/g, () => question.answers[i].author.profile);
            answers = answers.concat('\n\n***\n\n', answer);
        }

        let content = this.settings.stackExchangeNote
            .replace(/%date%/g, this.getFormattedDateForContent())
            .replace(/%questionTitle%/g, () => question.title)
            .replace(/%questionURL%/g, () => question.url)
            .replace(/%questionContent%/g, () => question.content)
            .replace(/%authorName%/g, () => question.author.name)
            .replace(/%authorProfileURL%/g, () => question.author.profile)
            .replace(/%topAnswer%/g, () => topAnswer)
            .replace(/%answers%/g, () => answers.trim());

        const assetsDir = this.settings.downloadStackExchangeAssetsInDir
            ? `${this.settings.assetsDir}/${normalizeFilename(fileNameTemplate)}/`
            : this.settings.assetsDir;

        if (this.settings.downloadStackExchangeAssets && Platform.isDesktop) {
            content = await replaceImages(this.app, content, assetsDir);
        }

        const fileName = `${fileNameTemplate}.md`;
        return new Note(fileName, content);
    }

    private async parseDocument(document: Document): Promise<StackExchangeQuestion> {
        let questionURL;
        try {
            questionURL = new URL(
                document.querySelector('link[rel="canonical"]')?.getAttribute('href') ??
                    document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
            );
        } catch (e) {
            questionURL = null;
        }

        const author = document.querySelector('#question [itemprop="author"]');

        const answers: Array<StackExchangeAnswer> = [];
        for (const el of document.querySelectorAll('.answer')) {
            const answerAuthor = el.querySelector('[itemprop="author"]');

            answers.push({
                content: await parseHtmlContent(DOMPurify.sanitize(el.querySelector('[itemprop="text"]') ?? '')),
                author: {
                    name: answerAuthor?.querySelector('[itemprop="name"]')?.textContent ?? '',
                    profile:
                        answerAuthor instanceof Element && questionURL instanceof URL
                            ? String.prototype.concat(
                                  questionURL.origin,
                                  answerAuthor.querySelector('a')?.getAttribute('href') ?? '',
                              )
                            : '',
                },
            });
        }

        return {
            title: document.querySelector('#question-header [itemprop="name"]')?.textContent ?? '',
            content: await parseHtmlContent(
                DOMPurify.sanitize(document.querySelector('#question [itemprop="text"]') ?? ''),
            ),
            url: questionURL?.href ?? '',
            topAnswer: answers.slice(0, 1).shift(),
            answers: answers.slice(1),
            author: {
                name: author?.querySelector('[itemprop="name"]')?.textContent ?? '',
                profile:
                    author instanceof Element && questionURL instanceof URL
                        ? String.prototype.concat(
                              questionURL.origin,
                              author.querySelector('a')?.getAttribute('href') ?? '',
                          )
                        : '',
            },
        };
    }
}

export default StackExchangeParser;
