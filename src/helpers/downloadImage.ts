export async function downloadImage(url: string): Promise<{ fileContent: ArrayBuffer; fileExtension: string | false }> {
    const res = await fetch(url);

    return {
        fileContent: await res.arrayBuffer(),
        fileExtension: url.slice(url.lastIndexOf('.')),
    };
}
