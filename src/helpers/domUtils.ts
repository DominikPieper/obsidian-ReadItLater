export interface JavascriptDeclaration {
    type: string;
    name: string;
    value: string;
}

const DECLARATION_REGEX = /(const|let|var)\s+(\w+)\s*=\s*(.+|\n+?)\s*(?=(?:^|\s+)(const|let|var)\s+|$)/g;

export function getJavascriptDeclarationByName(
    name: string,
    elements: Element[] | NodeList,
): JavascriptDeclaration | undefined {
    return getJavascriptDeclarationsFromElement(elements).find((declaration: JavascriptDeclaration) => {
        return declaration.name === name;
    });
}

function getJavascriptDeclarationsFromElement(elements: Element[] | NodeList): JavascriptDeclaration[] {
    const declarations: JavascriptDeclaration[] = [];
    let match;

    elements.forEach((element) => {
        while ((match = DECLARATION_REGEX.exec(element.textContent)) !== null) {
            declarations.push({
                type: match[1].trim(),
                name: match[2].trim(),
                value: match[3].trim().replace(/;+\s*$/, ''),
            });
        }
    });

    return declarations;
}
