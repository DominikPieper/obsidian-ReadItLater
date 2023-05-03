import { Parser } from './Parser';

export default class ParserCreator {
    private parsers: Parser[];

    constructor(parsers: Parser[]) {
        this.parsers = parsers;
    }

    public async createParser(content: string): Promise<Parser> {
        for (const parser of this.parsers) {
            if (await parser.test(content)) {
                return parser;
            }
        }
    }
}
