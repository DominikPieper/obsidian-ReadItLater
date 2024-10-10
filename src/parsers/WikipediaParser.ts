import { Note } from './Note';
import WebsiteParser from './WebsiteParser';

export default class WikipediaParser extends WebsiteParser {
    private PATTERN = /^(?:https?:\/\/)?(?:[a-z]{2,3}(?:-[a-z]{2,3})?)\.wikipedia\.org\/wiki\/([^/]+)$/i;

    test(url: string): boolean {
        return this.isValidUrl(url) && this.PATTERN.test(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const originUrl = new URL(url);
        const document = await this.getDocument(originUrl);

        document.querySelectorAll('.infobox caption').forEach((element) => {
            let newParagraph = document.createElement('p');
            newParagraph.innerHTML = element.innerHTML;

            element.parentElement.insertBefore(newParagraph, element);
            element.remove();
        });

        document.querySelectorAll('.wikitable caption').forEach((element) => {
            let newParagraph = document.createElement('p');
            newParagraph.innerHTML = element.innerHTML;

            element.parentElement.insertBefore(newParagraph, element);
            element.remove();
        });

        return this.makeNote(document, originUrl);
    }
}
