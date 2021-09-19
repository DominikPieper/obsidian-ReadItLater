export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
    } catch (e) {
        return false;
    }
    return true;
}

export function getBaseUrl(url?: string, prefix?: string): string {
    const dir = '/';
    const urlAsArray = url.split(dir);
    const doubleSlashIndex = url.indexOf('://');
    if (doubleSlashIndex !== -1 && doubleSlashIndex === url.indexOf(dir) - 1) {
        urlAsArray.length = 3;
        let url = urlAsArray.join(dir);
        if (prefix !== undefined) url = url.replace(/http:\/\/|https:\/\//, prefix);
        return url;
    } else {
        const pointIndex = url.indexOf('.');
        if (pointIndex !== -1 && pointIndex !== 0) {
            return (prefix !== undefined ? prefix : 'https://') + urlAsArray[0];
        }
    }
}
