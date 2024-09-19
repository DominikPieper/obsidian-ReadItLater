import TurndownService from 'turndown';
import * as turndownPluginGfm from '@guyplusplus/turndown-plugin-gfm';

export async function parseHtmlContent(content: string) {
    const gfm = turndownPluginGfm.gfm;
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
    });

    turndownService.use(gfm);

    turndownService.addRule('fencedCodeLangBlock', {
        filter: (node) => {
            return (
                node.nodeName == 'PRE' &&
                (!node.firstChild || node.firstChild.nodeName != 'CODE') &&
                !node.querySelector('img')
            );
        },
        replacement: function (_content, node, options) {
            //eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            node.innerHTML = node.innerHTML.replaceAll('<br-keep></br-keep>', '<br>');
            //eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            const langMatch = node.id?.match(/code-lang-(.+)/);
            const language = langMatch?.length > 0 ? langMatch[1] : '';
            const code = node.textContent;

            const fenceChar = options.fence.charAt(0);
            let fenceSize = 3;
            const fenceInCodeRegex = new RegExp('^' + fenceChar + '{3,}', 'gm');

            let match;
            while ((match = fenceInCodeRegex.exec(code))) {
                if (match[0].length >= fenceSize) {
                    fenceSize = match[0].length + 1;
                }
            }

            const fence = Array(fenceSize + 1).join(fenceChar);

            return '\n\n' + fence + language + '\n' + code.replace(/\n$/, '') + '\n' + fence + '\n\n';
        },
    });

    const articleContent = turndownService.turndown(content);

    return articleContent;
}
