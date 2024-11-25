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
    topAnswer: StackExchangeAnswer | null;
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

interface StackExchangeNoteData {
    date: string;
    questionTitle: string;
    questionURL: string;
    questionContent: string;
    authorName: string;
    authorProfileURL: string;
    topAnswer: string;
    answers: string;
    extra: {
        question: StackExchangeQuestion;
    };
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
        const createdAt = new Date();
        const response = await request({ method: 'GET', url: clipboardContent });
        const document = new DOMParser().parseFromString(response, 'text/html');
        const question = await this.parseDocument(document);

        const fileNameTemplate = this.templateEngine.render(this.settings.stackExchangeNoteTitle, {
            title: question.title,
            date: this.getFormattedDateForFilename(createdAt),
        });

        let assetsDir;
        if (this.settings.downloadStackExchangeAssetsInDir) {
            assetsDir = this.templateEngine.render(this.settings.assetsDir, {
                date: '',
                fileName: '',
                contentType: '',
            });
            assetsDir = `${assetsDir}/${normalizeFilename(fileNameTemplate)}`;
        } else {
            assetsDir = this.templateEngine.render(this.settings.assetsDir, {
                date: this.getFormattedDateForFilename(createdAt),
                fileName: normalizeFilename(fileNameTemplate),
                contentType: this.settings.stackExchangeContentType,
            });
        }

        let content = this.templateEngine.render(
            this.settings.stackExchangeNote,
            this.getNoteData(question, createdAt),
        );

        if (this.settings.downloadStackExchangeAssets && Platform.isDesktop) {
            content = await replaceImages(this.app, content, assetsDir);
        }

        return new Note(fileNameTemplate, 'md', content, this.settings.stackExchangeContentType, createdAt);
    }

    private getNoteData(question: StackExchangeQuestion, createdAt: Date): StackExchangeNoteData {
        const topAnswer = question.topAnswer
            ? this.templateEngine.render(this.settings.stackExchangeAnswer, {
                  date: this.getFormattedDateForContent(createdAt),
                  answerContent: question.topAnswer.content,
                  authorName: question.topAnswer.author.name,
                  authorProfileURL: question.topAnswer.author.profile,
              })
            : '';

        let answers = '';
        for (let i = 0; i < question.answers.length; i++) {
            answers = answers.concat(
                '\n\n***\n\n',
                this.templateEngine.render(this.settings.stackExchangeAnswer, {
                    date: this.getFormattedDateForContent(createdAt),
                    answerContent: question.answers[i].content,
                    authorName: question.answers[i].author.name,
                    authorProfileURL: question.answers[i].author.profile,
                }),
            );
        }

        return {
            date: this.getFormattedDateForContent(createdAt),
            questionTitle: question.title,
            questionURL: question.url,
            questionContent: question.content,
            authorName: question.author.name,
            authorProfileURL: question.author.profile,
            topAnswer: topAnswer,
            answers: answers.trim(),
            extra: {
                question: question,
            },
        };
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
