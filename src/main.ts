import { Editor, Menu, MenuItem, Platform, Plugin, addIcon } from 'obsidian';
import { DEFAULT_SETTINGS, ReadItLaterSettingValue, ReadItLaterSettings } from './settings';
import { ReadItLaterSettingsTab } from './views/settings-tab';
import YoutubeParser from './parsers/YoutubeParser';
import VimeoParser from './parsers/VimeoParser';
import BilibiliParser from './parsers/BilibiliParser';
import TwitterParser from './parsers/TwitterParser';
import StackExchangeParser from './parsers/StackExchangeParser';
import WebsiteParser from './parsers/WebsiteParser';
import TextSnippetParser from './parsers/TextSnippetParser';
import MastodonParser from './parsers/MastodonParser';
import TikTokParser from './parsers/TikTokParser';
import ParserCreator from './parsers/ParserCreator';
import { HTTPS_PROTOCOL, HTTP_PROTOCOL } from './constants/urlProtocols';
import GithubParser from './parsers/GithubParser';
import WikipediaParser from './parsers/WikipediaParser';
import TemplateEngine from './template/TemplateEngine';
import { FilesystemLimits, getFileSystemLimits, isValidUrl } from './helpers/fileutils';
import YoutubeChannelParser from './parsers/YoutubeChannelParser';
import { VaultRepository } from './repository/VaultRepository';
import DefaultVaultRepository from './repository/DefaultVaultRepository';
import { NoteService } from './NoteService';
import { ReadItLaterApi } from './ReadtItLaterApi';
import { BlueskyParser } from './parsers/BlueskyParser';
import { PinterestParser } from './parsers/PinterestParser';

export default class ReadItLaterPlugin extends Plugin {
    public api: ReadItLaterApi;
    public settings: ReadItLaterSettings;

    private fileSystemLimits: FilesystemLimits;
    private noteService: NoteService;
    private parserCreator: ParserCreator;
    private templateEngine: TemplateEngine;
    private vaultRepository: VaultRepository;

    getFileSystemLimits(): FilesystemLimits {
        return this.fileSystemLimits;
    }

    getVaultRepository(): VaultRepository {
        return this.vaultRepository;
    }

    async onload(): Promise<void> {
        await this.loadSettings();

        this.fileSystemLimits = getFileSystemLimits(Platform, this.settings);
        this.templateEngine = new TemplateEngine();
        this.parserCreator = new ParserCreator([
            new YoutubeParser(this.app, this, this.templateEngine),
            new YoutubeChannelParser(this.app, this, this.templateEngine),
            new VimeoParser(this.app, this, this.templateEngine),
            new BilibiliParser(this.app, this, this.templateEngine),
            new TwitterParser(this.app, this, this.templateEngine),
            new StackExchangeParser(this.app, this, this.templateEngine),
            new TikTokParser(this.app, this, this.templateEngine),
            new GithubParser(this.app, this, this.templateEngine),
            new WikipediaParser(this.app, this, this.templateEngine),
            new BlueskyParser(this.app, this, this.templateEngine),
            new PinterestParser(this.app, this, this.templateEngine),
            new MastodonParser(this.app, this, this.templateEngine),
            new WebsiteParser(this.app, this, this.templateEngine),
            new TextSnippetParser(this.app, this, this.templateEngine),
        ]);
        this.vaultRepository = new DefaultVaultRepository(this, this.templateEngine);
        this.noteService = new NoteService(this.parserCreator, this, this.vaultRepository);
        this.api = new ReadItLaterApi(this.noteService);

        addIcon('read-it-later', clipboardIcon);

        this.addRibbonIcon('read-it-later', 'ReadItLater: Create from clipboard', async () => {
            await this.api.processContent(await this.getTextClipboardContent());
        });

        this.addCommand({
            id: 'save-clipboard-to-notice',
            name: 'Create from clipboard',
            callback: async () => {
                await this.api.processContent(await this.getTextClipboardContent());
            },
        });

        this.addCommand({
            id: 'create-from-clipboard-batch',
            name: 'Create from batch in clipboard',
            callback: async () => {
                await this.api.processContentBatch(await this.getTextClipboardContent());
            },
        });

        this.addCommand({
            id: 'insert-at-cursor',
            name: 'Insert at the cursor position',
            editorCallback: async (editor: Editor) => {
                await this.api.insertContentAtEditorCursorPosition(await this.getTextClipboardContent(), editor);
            },
        });

        this.addSettingTab(new ReadItLaterSettingsTab(this.app, this));

        if (this.settings.extendShareMenu) {
            this.registerEvent(
                //eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                this.app.workspace.on('receive-text-menu', (menu: Menu, shareText: string) => {
                    menu.addItem((item: MenuItem) => {
                        item.setTitle('ReadItLater');
                        item.setIcon('read-it-later');
                        item.onClick(() => this.api.processContent(shareText));
                    });
                }),
            );
        }

        this.registerEvent(
            this.app.workspace.on('url-menu', (menu: Menu, url: string) => {
                if (isValidUrl(url, [HTTP_PROTOCOL, HTTPS_PROTOCOL])) {
                    menu.addItem((item: MenuItem) => {
                        item.setTitle('ReadItLater');
                        item.setIcon('read-it-later');
                        item.onClick(() => this.api.processContent(url));
                    });
                }
            }),
        );
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSetting(setting: string, value: ReadItLaterSettingValue): Promise<void> {
        this.settings[setting] = value;
        await this.saveSettings();
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }

    async getTextClipboardContent(): Promise<string> {
        return await navigator.clipboard.readText();
    }
}

const clipboardIcon = `
<svg fill="currentColor" stroke="currentColor" version="1.1" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
	<g>
		<path d="m365.9,144.9c-12.3,0-24.2,1.8-35.4,5.2v-114.7h-96.9l7.3-35.4h-150.2l6.8,35.4h-97.5v454.6h330.5v-102.1c11.2,3.4 23.1,5.2 35.4,5.2 68.8-0.1 124.1-56.4 124.1-124.1 0-67.8-55.3-124.1-124.1-124.1zm-150.1-124l-10.4,50h-79.2l-9.4-50h99zm93.8,448.2h-288.7v-412.8h80.7l6.8,35.4h113.6l7.3-35.4h80.3v102.2c-27.3,14-48.8,37.9-59.7,66.7h-200.9v20.8h195c-1.4,7.4-2.2,15.1-2.2,22.9 0,13.4 2.2,26.4 6.2,38.6h-199v20.9h208.1c12,21.8 30.3,39.7 52.5,51.1v89.6zm56.3-98c-57.3,0-103.2-46.9-103.2-103.2s46.9-103.2 103.2-103.2c57.3,0 103.2,46.9 103.2,103.2s-45.8,103.2-103.2,103.2z"/>
		<polygon points="426.4,223.1 346.1,303.4 313.8,271.1 299.2,285.7 346.1,332.6 441,237.7   "/>
		<rect width="233.5" x="49" y="143.9" height="20.9"/>
		<rect width="233.5" x="49" y="388.9" height="20.9"/>
	</g>
</svg>`;
