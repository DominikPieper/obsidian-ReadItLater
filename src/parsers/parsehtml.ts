import { App } from 'obsidian';
import TurndownService from 'turndown';
import * as DOMPurify from 'isomorphic-dompurify';
import * as turndownPluginGfm from '@guyplusplus/turndown-plugin-gfm';
import { replaceImages } from 'src/helpers';

export async function parseHtmlContent(app: App, content: string, assetsDir: string) {
    const gfm = turndownPluginGfm.gfm;
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
    });
    turndownService.use(gfm);
    const articleContent = turndownService.turndown(content);
    const fixedContent = await replaceImages(app, articleContent, assetsDir);

    return fixedContent;
}
