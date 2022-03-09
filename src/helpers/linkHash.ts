import { ArrayBuffer as SparkMD5 } from 'spark-md5';

class LinkHashes {
    private linksInfo: Record<string, string> = {};

    ensureHashGenerated(link: string, data: ArrayBuffer) {
        if (!this.linksInfo[link]) {
            this.linksInfo[link] = SparkMD5.hash(data);
        }
    }

    isSame(link: string, data: ArrayBuffer) {
        const fileHash = SparkMD5.hash(data);
        return this.linksInfo[link] == fileHash;
    }
}

export const linkHashes = new LinkHashes();
