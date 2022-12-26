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
};

class MastodonParser extends Parser {
    constructor(app: App, settings: ReadItLaterSettings) {
        super(app, settings);
    }

    async test(url: string): Promise<boolean> {
        return isValidUrl(url) && (await this.testIsMastodon(url));
    }

    async prepareNote(url: string): Promise<Note> {
        const mastodonUrl = new URL(url);
        const tootId = mastodonUrl.pathname.split('/')[2];

        const response = JSON.parse(
            await request({
                method: 'GET',
                contentType: 'application/json',
                url: `https://${mastodonUrl.hostname}${MASTODON_API.STATUS}/${tootId}`,
            }),
        );

        const { url: tootURL, content, account, media_attachments } = response;

        const fileNameTemplate = this.settings.mastodonNoteTitle
            .replace(/%tootAuthorName%/g, account.display_name)
            .replace(/%date%/g, this.getFormattedDateForFilename());

        const assetsDir = this.settings.downloadMastodonMediaAttachmentsInDir
            ? `${this.settings.assetsDir}/${normalizeFilename(fileNameTemplate)}/`
            : this.settings.assetsDir;

        const mediaAttachments = (this.settings.downloadMastodonMediaAttachments && Platform.isDesktop)
            ? await replaceImages(app, this.prepareMedia(media_attachments), assetsDir)
            : this.prepareMedia(media_attachments);

        const processedContent = this.settings.mastodonNote
            .replace(/%date%/g, this.getFormattedDateForContent())
            .replace(/%tootAuthorName%/g, account.display_name)
            .replace(/%tootURL%/g, tootURL)
            .replace(/%tootContent%/g, await parseHtmlContent(content))
            .replace(/%tootMedia%/g, mediaAttachments);

        const fileName = `${fileNameTemplate}.md`;

        return new Note(fileName, processedContent);
    }

    private prepareMedia(media: any[]): string {
        return media.reduce(
            (prev: string, { type, url, description }: { type: string; url: string; description: string }): string => {
                const processedDescription = description ? `> *${description}*` : '';

                return `${prev}\n![](${url})\n ${processedDescription}\n`;
            },
            '',
        );
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
