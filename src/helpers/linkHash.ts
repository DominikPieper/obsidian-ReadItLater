import { ArrayBuffer as SparkMD5 } from 'spark-md5';

class LinkHashes {
    private linksInfo: Record<string, string> = {};

    ensureHashGenerated(url: URL, data: ArrayBuffer) {
        if (!this.linksInfo[url.href]) {
            this.linksInfo[url.href] = SparkMD5.hash(data);
        }
    }

    isSame(url: URL, data: ArrayBuffer) {
        const fileHash = SparkMD5.hash(data);
        return this.linksInfo[url.href] == fileHash;
    }
}

export const linkHashes = new LinkHashes();
