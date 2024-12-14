export function createHTMLDiv(html: string): DocumentFragment {
    return createFragment((documentFragment) => (documentFragment.createDiv().innerHTML = html));
}
