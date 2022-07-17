import { App, PluginSettingTab, Setting } from 'obsidian';
import ReadItLaterPlugin from 'src/main';
import { DEFAULT_SETTINGS } from 'src/settings';

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
            .setDesc('If this is true, the used images are downloaded to the defined folder (just on Desktop)')
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
            .setName('Youtube note template title')
            .setDesc('Available variables: %title%')
            .addText((text) =>
                text
                    .setPlaceholder('Defaults to %title%')
                    .setValue(this.plugin.settings.youtubeNoteTitle || DEFAULT_SETTINGS.youtubeNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.youtubeNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Youtube note template')
            .setDesc('Available variables: %date%, %videoTitle%, %videoURL%, %videoId%, %videoPlayer%')
            .addTextArea((textarea) => {
                textarea
                    .setValue(this.plugin.settings.youtubeNote || DEFAULT_SETTINGS.youtubeNote)
                    .onChange(async (value) => {
                        this.plugin.settings.youtubeNote = value;
                        await this.plugin.saveSettings();
                    });
                textarea.inputEl.rows = 10;
                textarea.inputEl.cols = 25;
            });

        new Setting(containerEl)
            .setName('Twitter note template title')
            .setDesc('Available variables: %tweetAuthorName%, %date%')
            .addText((text) =>
                text
                    .setPlaceholder('Defaults to %tweetAuthorName%')
                    .setValue(this.plugin.settings.twitterNoteTitle || DEFAULT_SETTINGS.twitterNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.twitterNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );
        new Setting(containerEl)
            .setName('Twitter note template')
            .setDesc('Available variables: %date%, %tweetAuthorName%, %tweetURL%, %tweetContent%')
            .addTextArea((textarea) => {
                textarea
                    .setValue(this.plugin.settings.twitterNote || DEFAULT_SETTINGS.twitterNote)
                    .onChange(async (value) => {
                        this.plugin.settings.twitterNote = value;
                        await this.plugin.saveSettings();
                    });
                textarea.inputEl.rows = 10;
                textarea.inputEl.cols = 25;
            });

        new Setting(containerEl)
            .setName('Parsable article note template title')
            .setDesc('Available variables: %title%')
            .addText((text) =>
                text
                    .setPlaceholder('Defaults to %title%')
                    .setValue(
                        this.plugin.settings.parseableArticleNoteTitle || DEFAULT_SETTINGS.parseableArticleNoteTitle,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.parseableArticleNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Parsable article note template')
            .setDesc('Available variables: %date%, %articleTitle%, %articleURL%, %articleContent%')
            .addTextArea((textarea) => {
                textarea
                    .setValue(this.plugin.settings.parsableArticleNote || DEFAULT_SETTINGS.parsableArticleNote)
                    .onChange(async (value) => {
                        this.plugin.settings.parsableArticleNote = value;
                        await this.plugin.saveSettings();
                    });
                textarea.inputEl.rows = 10;
                textarea.inputEl.cols = 25;
            });

        new Setting(containerEl)
            .setName('Not paresable article note template title')
            .setDesc('Available variables: %date%')
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to 'Article %date%'`)
                    .setValue(
                        this.plugin.settings.notParseableArticleNoteTitle ||
                            DEFAULT_SETTINGS.notParseableArticleNoteTitle,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.notParseableArticleNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Not parseable article note template')
            .setDesc('Available variables: %date%, %articleURL%')
            .addTextArea((textarea) => {
                textarea
                    .setValue(this.plugin.settings.notParsableArticleNote || DEFAULT_SETTINGS.notParsableArticleNote)
                    .onChange(async (value) => {
                        this.plugin.settings.notParsableArticleNote = value;
                        await this.plugin.saveSettings();
                    });
                textarea.inputEl.rows = 10;
                textarea.inputEl.cols = 25;
            });

        new Setting(containerEl)
            .setName('Text snippet note template title')
            .setDesc('Available variables: %date%')
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to 'Notice %date%'`)
                    .setValue(this.plugin.settings.textSnippetNoteTitle || DEFAULT_SETTINGS.textSnippetNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.textSnippetNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Text snippet note template')
            .setDesc('Available variables: %date%, %content%')
            .addTextArea((textarea) => {
                textarea
                    .setValue(this.plugin.settings.textSnippetNote || DEFAULT_SETTINGS.textSnippetNote)
                    .onChange(async (value) => {
                        this.plugin.settings.textSnippetNote = value;
                        await this.plugin.saveSettings();
                    });
                textarea.inputEl.rows = 10;
                textarea.inputEl.cols = 25;
            });
    }
}
