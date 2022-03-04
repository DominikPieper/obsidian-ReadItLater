import { App, PluginSettingTab, Setting } from 'obsidian';
import ReadItLaterPlugin from './main';

export interface ReadItLaterSettings {
    inboxDir: string;
    assetsDir: string;
    openNewNote: boolean;
    youtubeNote: string;
    twitterNote: string;
    parsableArticleNote: string;
    notParsableArticleNote: string;
    textSnippetNote: string;
    downloadImages: boolean;
}

export const DEFAULT_SETTINGS: ReadItLaterSettings = {
    inboxDir: 'ReadItLater Inbox',
    assetsDir: 'ReadItLater Inbox/assets',
    openNewNote: false,
    youtubeNote: `[[ReadItLater]] [[Youtube]]\n\n# [%videoTitle%](%videoURL%)\n\n%videoPlayer%`,
    twitterNote: `[[ReadItLater]] [[Tweet]]\n\n# [%tweetAuthorName%](%tweetURL%)\n\n%tweetContent%`,
    parsableArticleNote: `[[ReadItLater]] [[Article]]\n\n# [%articleTitle%](%articleURL%)\n\n%articleContent%`,
    notParsableArticleNote: `[[ReadItLater]] [[Article]]\n\n[%articleURL%](%articleURL%)`,
    textSnippetNote: `[[ReadItLater]] [[Textsnippet]]\n\n%content%`,
    downloadImages: false,
};

export class ReadItLaterSettingsTab extends PluginSettingTab {
    plugin: ReadItLaterPlugin;

    constructor(app: App, plugin: ReadItLaterPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Settings for the ReadItLater plugin.' });

        new Setting(containerEl)
            .setName('Inbox dir')
            .setDesc(
                'Enter valid folder name. For nested folders use this format: Folder A/Folder B. If no folder is enetred, new note will be created in vault root.',
            )
            .addText((text) =>
                text
                    .setPlaceholder('Defaults to root')
                    .setValue(this.plugin.settings.inboxDir || DEFAULT_SETTINGS.inboxDir)
                    .onChange(async (value) => {
                        this.plugin.settings.inboxDir = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Open new note')
            .setDesc('If enabled, new note will open in current workspace')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.openNewNote || DEFAULT_SETTINGS.openNewNote)
                    .onChange(async (value) => {
                        this.plugin.settings.openNewNote = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Download images')
            .setDesc('If this is true, the used images are downloaded to the defined folder')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.downloadImages || DEFAULT_SETTINGS.downloadImages)
                    .onChange(async (value) => {
                        this.plugin.settings.downloadImages = value;
                        assetDirSetting.setDisabled(!value);
                        await this.plugin.saveSettings();
                    }),
            );

        const assetDirSetting = new Setting(containerEl)
            .setName('Assets dir')
            .setDesc(
                'Enter valid folder name. For nested folders use this format: Folder A/Folder B. If no folder is enetred, new note will be created in vault root.',
            )
            .addText((text) =>
                text
                    .setPlaceholder('Defaults to root')
                    .setValue(this.plugin.settings.assetsDir || DEFAULT_SETTINGS.inboxDir + '/assets')
                    .setDisabled(!this.plugin.settings.downloadImages)
                    .onChange(async (value) => {
                        this.plugin.settings.assetsDir = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Youtube note template')
            .setDesc('Available variables: %videoTitle%, %videoURL%, %videoId%, %videoPlayer%')
            .addTextArea((textarea) =>
                textarea
                    .setValue(this.plugin.settings.youtubeNote || DEFAULT_SETTINGS.youtubeNote)
                    .onChange(async (value) => {
                        this.plugin.settings.youtubeNote = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Twitter note template')
            .setDesc('Available variables: %tweetAuthorName%, %tweetURL%, %tweetContent%')
            .addTextArea((textarea) =>
                textarea
                    .setValue(this.plugin.settings.twitterNote || DEFAULT_SETTINGS.twitterNote)
                    .onChange(async (value) => {
                        this.plugin.settings.twitterNote = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Parsable article note template')
            .setDesc('Available variables: %articleTitle%, %articleURL%, %articleContent%')
            .addTextArea((textarea) =>
                textarea
                    .setValue(this.plugin.settings.parsableArticleNote || DEFAULT_SETTINGS.parsableArticleNote)
                    .onChange(async (value) => {
                        this.plugin.settings.parsableArticleNote = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Not parsable article note template')
            .setDesc('Available variables: %articleURL%')
            .addTextArea((textarea) =>
                textarea
                    .setValue(this.plugin.settings.notParsableArticleNote || DEFAULT_SETTINGS.notParsableArticleNote)
                    .onChange(async (value) => {
                        this.plugin.settings.notParsableArticleNote = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Text snippet note template')
            .setDesc('Available variables: %content%')
            .addTextArea((textarea) =>
                textarea
                    .setValue(this.plugin.settings.textSnippetNote || DEFAULT_SETTINGS.textSnippetNote)
                    .onChange(async (value) => {
                        this.plugin.settings.textSnippetNote = value;
                        await this.plugin.saveSettings();
                    }),
            );
    }
}
