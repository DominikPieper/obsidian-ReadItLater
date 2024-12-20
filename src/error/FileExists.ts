export default class FileExistsError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FileExistsError';
    }
}
