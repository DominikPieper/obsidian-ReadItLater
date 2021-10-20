export class Note {
    public readonly fileName: string;
    public readonly content: string;

    constructor(fileName: string, content: string) {
        this.fileName = fileName;
        this.content = content;
    }
}
