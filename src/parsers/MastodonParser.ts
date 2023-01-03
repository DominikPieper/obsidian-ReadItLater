import { Parser } from './Parser';
import { ReadItLaterSettings } from '../settings';
import { App, Platform, request } from 'obsidian';
import { Note } from './Note';
import { isValidUrl, normalizeFilename, replaceImages } from '../helpers';
import { parseHtmlContent } from './parsehtml';

const MASTODON_API = {
    INSTANCE: '/api/v2/instance',
    OEMBED: '/api/oembed',
    STATUS: '/api/v1/statuses',
    CONTEXT: '/api/v1/statuses/%id%/context',
};

interface MediaAttachment {
    id: string;
    type: string;
    url: string;
    preview_url: string;
    remote_url: string | null;
    meta: object;
    description: string | null;
    blurhash: string | null;
}

interface Account {
    id: string;
    display_name: string;
}

interface Status {
    url: string;
    content: string;
    account: Account;
    media_attachments: MediaAttachment[];
}

class MastodonParser extends Parser {
    constructor(app: App, settings: ReadItLaterSettings) {
        super(app, settings);
    }

    async test(url: string): Promise<boolean> {
        return isValidUrl(url) && (await this.testIsMastodon(url));
    }

    async prepareNote(url: string): Promise<Note> {
        const mastodonUrl = new URL(url);
        const statusId = mastodonUrl.pathname.split('/')[2];

        const status = await this.loadStatus(mastodonUrl.hostname, statusId);

        const fileNameTemplate = this.settings.mastodonNoteTitle
            .replace(/%tootAuthorName%/g, status.account.display_name)
            .replace(/%date%/g, this.getFormattedDateForFilename());

        const assetsDir = this.settings.downloadMastodonMediaAttachmentsInDir
            ? `${this.settings.assetsDir}/${normalizeFilename(fileNameTemplate)}/`
            : this.settings.assetsDir;

        let parsedStatusContent = await this.parseStatus(status, assetsDir);

        if (this.settings.saveMastodonReplies) {
            const replies = await this.loadReplies(mastodonUrl.hostname, statusId);
            for (let i = 0; i < replies.length; i++) {
                const parsedReply = await this.parseStatus(replies[i], assetsDir);
                const processedReply = this.settings.mastodonReply
                    .replace(/%tootAuthorName%/g, replies[i].account.display_name)
                    .replace(/%tootURL%/g, replies[i].url)
                    .replace(/%tootContent%/g, parsedReply);
                parsedStatusContent = parsedStatusContent.concat('\n\n***\n\n', processedReply);
            }
        }

        const processedContent = this.settings.mastodonNote
            .replace(/%date%/g, this.getFormattedDateForContent())
            .replace(/%tootAuthorName%/g, status.account.display_name)
            .replace(/%tootURL%/g, status.url)
            .replace(/%tootContent%/g, parsedStatusContent);

        const fileName = `${fileNameTemplate}.md`;

        return new Note(fileName, processedContent);
    }

    private async loadStatus(hostname: string, statusId: string): Promise<Status> {
        const response = JSON.parse(
            await request({
                method: 'GET',
                contentType: 'application/json',
                url: `https://${hostname}${MASTODON_API.STATUS}/${statusId}`,
            }),
        );

        return response;
    }

    private async loadReplies(hostname: string, statusId: string): Promise<Status[]> {
        const url = String.prototype.concat.call(
            'https://',
            hostname,
            String.prototype.replace.call(MASTODON_API.CONTEXT, '%id%', statusId),
        );

        const response = JSON.parse(
            await request({
                method: 'GET',
                contentType: 'application/json',
                url: url,
            }),
        );

        return response.descendants;
    }

    private async parseStatus(status: Status, assetsDir: string): Promise<string> {
        const parsedStatusContent = await parseHtmlContent(status.content);

        const mediaAttachments =
            this.settings.downloadMastodonMediaAttachments && Platform.isDesktop
                ? await replaceImages(app, this.prepareMedia(status.media_attachments), assetsDir)
                : this.prepareMedia(status.media_attachments);

        return parsedStatusContent.concat(mediaAttachments);
    }

    private prepareMedia(media: MediaAttachment[]): string {
        return media.reduce((prev: string, { url, description }: { url: string; description: string }): string => {
            const processedDescription = description ? `\n> *${description}*` : '';

            return `${prev}\n\n![](${url})${processedDescription}`;
        }, '');
    }

    private async testIsMastodon(url: string): Promise<boolean> {
        if (!url) return false;

        const urlDomain = new URL(url).hostname;

        try {
            const response = JSON.parse(
                await request({
                    method: 'GET',
                    contentType: 'application/json',
                    url: `https://${urlDomain}${MASTODON_API.INSTANCE}`,
                }),
            );

            return response?.domain === urlDomain;
        } catch (e) {
            return false;
        }
    }
}

export default MastodonParser;
