import { App, request } from 'obsidian';
import { ReadItLaterSettings } from '../settings';
import { Note } from './Note';
import { Parser } from './Parser';

interface PinterestUser {
    name: string;
    url: string;
}


function imageExists(image_url: string): boolean{

    var http = new XMLHttpRequest();

    http.open('HEAD', image_url, false);
    http.send();

    return http.status != 404;

}

interface PinterestImage {
    // https://gist.github.com/jpsirois/7001965
    large: string;
    originals: string;
}

interface RelayData {
    link: string;
    imageLargeUrl: string;
    description: string;
    closeupDescription: string
    autoAltText: string;
    board: RelayBoard;
    imageSpec_orig: ImageSpec;
    pinJoin: RelayPinJoin
}
interface RelayBoard {
    url: string;
}
interface RelayPinJoin {
    visualAnnotation: Array<string>;
}
interface ImageSpec {
    url: string;
}

interface PinterestPin {
    id: string;
    url: string;
    title: string;
    description: string;
    descriptionLong: string;
    resource: string;
    altText: string;
    tags: Array<string>;

    author: PinterestUser;
    image: PinterestImage
}

class PinterestParser extends Parser {
    private PATTERN = /pinterest\.com\/pin\/.+/;

    constructor(app: App, settings: ReadItLaterSettings) {
        super(app, settings);
    }

    test(clipboardContent: string): boolean | Promise<boolean> {
        const x = this.isValidUrl(clipboardContent) && this.PATTERN.test(clipboardContent);
        // debugger;
        return x;
    }

    async prepareNote(clipboardContent: string): Promise<Note> {
        // debugger;
        const pinPage = await this.parseHtml(clipboardContent);

        const tags = pinPage.tags.reduce((a,i) =>{
            return this.settings.pinterestParentTag.length > 0 ?
                `${a}${this.settings.pinterestParentTag}/${i.replace(/ /g,'_')} ` :
                `${a}#${i.replace(/ /g,'_')} `;
        }
        ,'').trim()

        const content = this.settings.pinterestNote
            .replace(/%date%/g, this.getFormattedDateForContent())
            .replace(/%videoDescription%/g, pinPage.description)
            .replace(/%videoId%/g, pinPage.id)
            .replace(/%title%/g, pinPage.title)
            .replace(/%videoURL%/g, pinPage.url)
            .replace(/%authorName%/g, pinPage.author.name)
            .replace(/%authorURL%/g, pinPage.author.url)
            .replace(/%img%/g, pinPage.image.originals)
            .replace(/%imgLarge%/g, pinPage.image.large)
            .replace(/%altText%/g, pinPage.altText)
            .replace(/%resource%/g, pinPage.resource)
            .replace(/%descriptionLong%/g, pinPage.descriptionLong)
            .replace(/%tags%/g, tags)


        const fileNameTemplate = this.settings.pinterestNoteTitle
            .replace(/%authorName%/g, pinPage.author.name)
            .replace(/%date%/g, this.getFormattedDateForFilename());

        const fileName = `${fileNameTemplate}.md`;
        return new Note(fileName, content);
    }

    private async parseHtml(url: string): Promise<PinterestPin> {
        
        const response = await request({
            method: 'GET',
            url,
            headers: {
                'user-agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            },
        });

        const html = new DOMParser().parseFromString(response, 'text/html');
        const videoRegexExec = this.PATTERN.exec(url);
        

        const imageUrlRAW = html.querySelector('[data-test-id="pin-closeup-image"] img')?.getAttribute('src');
        const imageUrl = imageUrlRAW.replace(/(.+\.com\/).+?(\/.+$)/,'$1{number}$2');
        
        const authorName = html.querySelector('[data-test-id="creator-profile-name"]')?.textContent;
        const authorUrl = html.querySelector('[data-test-id="official-user-attribution"] a')?.getAttribute('href');

        const pinTitle = html.querySelector('[data-test-id="pinTitle"] h1')?.textContent;

        const dataRelayResponse: RelayData = JSON.parse(html.querySelector('script[data-relay-response]').textContent)?.response?.data?.v3GetPinQuery?.data;

        const tags = dataRelayResponse.pinJoin.visualAnnotation ?? []
        const link = dataRelayResponse.link ?? ''
        const desc = dataRelayResponse.description ?? ''
        const descLong = dataRelayResponse.closeupDescription ?? ''
        
        debugger;

        return {
            id: videoRegexExec[4],
            url: html.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? url,
            description: desc,
            descriptionLong: descLong ?? '',
            resource: link,
            title: pinTitle,
            tags: tags,
            author: {
                name: authorName,
                url: `https://www.pinterest.com${authorUrl}`,
            },
            altText: dataRelayResponse.autoAltText,
            image: {
                large: dataRelayResponse.imageLargeUrl,
                originals: dataRelayResponse.imageSpec_orig.url,
            }
        };
    }
}

export default PinterestParser;
