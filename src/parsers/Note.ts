import { normalizeFilename } from 'src/helpers/fileutils';

export class Note {
    private _filePath: string | null = null;

    constructor(
        public readonly fileName: string,
        public readonly fileExtension: string,
        public readonly content: string,
        public readonly contentType: string,
        public readonly createdAt: Date,
    ) {
        this.fileName = normalizeFilename(this.fileName);
    }

    public getFullFilename(): string {
        return `${this.fileName}.${this.fileExtension}`;
    }

    public get filePath() {
        return this._filePath;
    }

    public set filePath(filePath: string) {
        this._filePath = filePath;
    }
}
