import { requestUrl } from 'obsidian';

export async function downloadImage(url: URL): Promise<{ fileContent: ArrayBuffer; fileExtension: string | false }> {
    const res = await requestUrl({
        url: url.href,
        method: 'get',
    });

    return {
        fileContent: await res.arrayBuffer,
        fileExtension: url.pathname.slice(url.pathname.lastIndexOf('.') + 1),
    };
}
