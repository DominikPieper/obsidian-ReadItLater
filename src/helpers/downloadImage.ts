import got from 'got';
import { extension } from 'mime-types';

export async function downloadImage(url: string): Promise<{ fileContent: ArrayBuffer; fileExtension: string | false }> {
    const res = await got(url, { responseType: 'buffer' });

    return {
        fileContent: res.body,
        fileExtension: extension(res.headers['content-type']),
    };
}
