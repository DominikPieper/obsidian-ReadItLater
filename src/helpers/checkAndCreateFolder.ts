import { normalizePath, TFolder, Vault } from 'obsidian';

/**
 * Open or create a folderpath if it does not exist
 * @param vault
 * @param folderpath
 */
export async function checkAndCreateFolder(vault: Vault, folderpath: string) {
    folderpath = normalizePath(folderpath);
    const folder = vault.getAbstractFileByPath(folderpath);
    if (folder && folder instanceof TFolder) {
        return;
    }
    await vault.createFolder(folderpath);
}
