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

        // remove cite square brackets to enhance readability
        document.querySelectorAll('.reference .cite-bracket').forEach((element) => {
            element.remove();
        });

        // add non-breaking whitespace before cite reference
        document.querySelectorAll('.reference a').forEach((element) => {
            element.textContent = '\u00A0' + element.textContent;
        });

        // fix for https://github.com/DominikPieper/obsidian-ReadItLater/issues/176
        document.querySelectorAll('.mw-cite-backlink').forEach((element) => {
            element.remove();
        });

        // fix for https://github.com/DominikPieper/obsidian-ReadItLater/issues/174
        document.querySelectorAll('.infobox caption').forEach((element) => {
            const newParagraph = document.createElement('p');
            newParagraph.innerHTML = element.innerHTML;

            element.parentElement.insertBefore(newParagraph, element);
            element.remove();
        });

        document.querySelectorAll('.wikitable caption').forEach((element) => {
            const newParagraph = document.createElement('p');
            newParagraph.innerHTML = element.innerHTML;

            element.parentElement.insertBefore(newParagraph, element);
            element.remove();
        });

        return this.makeNote(document, originUrl);
    }
}
