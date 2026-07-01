import { Platform, requestUrl } from 'obsidian';
import { handleError } from 'src/helpers/error';
import { normalizeFilename } from 'src/helpers/fileutils';
import { replaceImages } from 'src/helpers/replaceImages';
import { desktopBrowserUserAgent } from 'src/helpers/networkUtils';
import { Note } from './Note';
import { Parser } from './Parser';

/**
 * Template variables exposed to the Xiaohongshu note template.
 * `media` is the ready-to-use block (all images, or the video); `image`/`video` are the
 * raw cover/stream URLs for users who want to build a custom layout.
 */
interface XiaohongshuNoteData {
    date: string;
    noteURL: string;
    title: string;
    content: string;
    image: string;
    video: string;
    media: string;
}

/**
 * Imports Xiaohongshu (RedNote) posts from a share link or the full share text copied from
 * the mobile app.
 *
 * Xiaohongshu is a client-rendered SPA, so the served HTML has no post content in the DOM and
 * Readability/WebsiteParser cannot read it. Instead the page ships the whole note payload as a
 * JSON blob in `window.__INITIAL_STATE__`; this parser reads that directly to get the title,
 * body text, every image, and (for video posts) the video stream URL.
 *
 * Media handling: images and the video are emitted as `![](url)` placeholders so the shared
 * `replaceImages` helper downloads them into the assets dir (Desktop only, when the
 * "Download media" setting is on). The video placeholder is then rewritten by embedVideos()
 * into a playable embed.
 *
 * The `window.__INITIAL_STATE__` extraction approach is adapted from the standalone
 * bnchiang96/xiaohongshu-importer plugin (MIT): https://github.com/bnchiang96/xiaohongshu-importer
 */
class XiaohongshuParser extends Parser {
    // Matches both the xhslink.com share short links and full xiaohongshu.com URLs. Handles
    // the /explore/ and /discovery/item/ formats alike since \S+ captures the whole path+query
    // (the xsec_token query param is required for the page to return note data).
    private PATTERN = /https?:\/\/(?:www\.)?(?:xhslink\.com|xiaohongshu\.com)\/\S+/;

    test(clipboardContent: string): boolean {
        return this.PATTERN.test(clipboardContent);
    }

    async prepareNote(clipboardContent: string): Promise<Note> {
        const createdAt = new Date();
        const url = this.PATTERN.exec(clipboardContent)[0];

        let data: XiaohongshuNoteData;
        try {
            data = await this.getNoteData(url, createdAt);
        } catch (error) {
            handleError(error, 'Unable to parse Xiaohongshu note.');
        }

        const fileName = this.templateEngine.render(this.plugin.settings.xiaohongshuNoteTitle, {
            title: data.title,
            date: this.getFormattedDateForFilename(createdAt),
        });

        let content = this.templateEngine.render(this.plugin.settings.xiaohongshuNote, data);

        if (this.plugin.settings.downloadXiaohongshuMedia && Platform.isDesktop) {
            const assetsDir = this.templateEngine.render(this.plugin.settings.assetsDir, {
                date: this.getFormattedDateForFilename(createdAt),
                fileName: normalizeFilename(fileName),
                contentType: this.plugin.settings.xiaohongshuContentType,
            });
            // Images and the video are all rendered as ![](url) so replaceImages downloads them.
            content = await replaceImages(this.plugin, normalizeFilename(fileName), content, assetsDir);
        }

        content = this.embedVideos(content);

        return new Note(fileName, 'md', content, this.plugin.settings.xiaohongshuContentType, createdAt);
    }

    /**
     * Turn the video's ![](url) placeholder into a playable embed. A downloaded file is
     * emitted as an Obsidian embed (![[...]]) so it resolves against the vault; a remaining
     * remote URL (download disabled) is wrapped in a <video> tag so it still plays inline.
     * Image ![](url) links are left untouched.
     */
    private embedVideos(content: string): string {
        const VIDEO_EXTENSION = /\.(?:mp4|mov|m4v|webm|mkv)$/i;
        return content.replace(/!\[[^\]]*\]\(([^)]+)\)/g, (match, link: string) => {
            const path = link.split('?')[0];
            if (!VIDEO_EXTENSION.test(path)) {
                return match;
            }
            if (/^https?:\/\//i.test(link)) {
                return `<video controls src="${link}" width="100%"></video>`;
            }
            return `![[${decodeURIComponent(path)}]]`;
        });
    }

    private async getNoteData(url: string, createdAt: Date): Promise<XiaohongshuNoteData> {
        const response = await requestUrl({ method: 'GET', url, headers: { ...desktopBrowserUserAgent } });
        if (response.status >= 400) {
            throw new Error(`HTTP ${response.status} error fetching ${url}`);
        }

        // The page is a JS-rendered SPA; the note payload (title, text, images, video) is
        // embedded as a JSON blob in window.__INITIAL_STATE__, so we read that directly
        // instead of relying on the DOM.
        const stateMatch = response.text.match(/window\.__INITIAL_STATE__=(.*?)<\/script>/s);
        if (!stateMatch) {
            throw new Error('Could not find note data in Xiaohongshu page.');
        }

        // The blob is JS, not strict JSON: it uses `undefined` as a value in places.
        const state = JSON.parse(stateMatch[1].trim().replace(/undefined/g, 'null'));
        const noteId = Object.keys(state?.note?.noteDetailMap ?? {})[0];
        const note = state?.note?.noteDetailMap?.[noteId]?.note;
        if (!note) {
            throw new Error('Xiaohongshu note data is empty. The note may be private or removed.');
        }

        const images: string[] = (note.imageList ?? [])
            .map((img: { urlDefault?: string }) => img?.urlDefault ?? '')
            .filter((imageUrl: string) => imageUrl.startsWith('http'));
        const videoURL = this.extractVideoURL(note);

        return {
            date: this.getFormattedDateForContent(createdAt),
            noteURL: url,
            title: note.title || 'Untitled',
            // Strip Xiaohongshu's inline tag markers ([话题], [xxx]) from the body text.
            content: String(note.desc ?? '')
                .replace(/\[[^\]]+\]/g, '')
                .trim(),
            image: images[0] ?? '',
            video: videoURL,
            // Everything is emitted as ![](url) so the download step can pick it up; the video
            // placeholder is converted to a playable embed afterwards in embedVideos().
            media: videoURL
                ? [images[0] ? `![](${images[0]})` : '', `![](${videoURL})`].filter(Boolean).join('\n\n')
                : images.map((imageUrl) => `![](${imageUrl})`).join('\n\n'),
        };
    }

    private extractVideoURL(note: {
        video?: { media?: { stream?: { h264?: { masterUrl?: string }[]; h265?: { masterUrl?: string }[] } } };
    }): string {
        const stream = note?.video?.media?.stream;
        return stream?.h264?.[0]?.masterUrl ?? stream?.h265?.[0]?.masterUrl ?? '';
    }
}

export default XiaohongshuParser;
