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

        containerEl.createEl('h2', { text: 'General' });

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
            .setName('Assets dir')
            .setDesc(
                'Enter valid folder name. For nested folders use this format: Folder A/Folder B. If no folder is enetred, new note will be created in vault root.',
            )
            .addText((text) =>
                text
                    .setPlaceholder('Defaults to root')
                    .setValue(this.plugin.settings.assetsDir || DEFAULT_SETTINGS.inboxDir + '/assets')
                    .onChange(async (value) => {
                        this.plugin.settings.assetsDir = value;
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
            .setName('Date format string')
            .setDesc('Format of the %date% variable. NOTE: do not use symbols forbidden in file names.')
            .addText((text) =>
                text
                    .setPlaceholder('Defaults to YYYY-MM-DD HH-mm-ss')
                    .setValue(this.plugin.settings.dateTitleFmt || DEFAULT_SETTINGS.dateTitleFmt)
                    .onChange(async (value) => {
                        this.plugin.settings.dateTitleFmt = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Date format string in contents')
            .setDesc('Format of the %date% variable for contents')
            .addText((text) =>
                text
                    .setPlaceholder('Defaults to YYYY-MM-DD')
                    .setValue(this.plugin.settings.dateContentFmt || DEFAULT_SETTINGS.dateContentFmt)
                    .onChange(async (value) => {
                        this.plugin.settings.dateContentFmt = value;
                        await this.plugin.saveSettings();
                    }),
            );

        containerEl.createEl('h2', { text: 'YouTube' });

        new Setting(containerEl)
            .setName('Youtube note template title')
            .setDesc('Available variables: %title%, %date%')
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

        containerEl.createEl('h2', { text: 'Bilibili' });

        new Setting(containerEl)
            .setName('Bilibili note template title')
            .setDesc('Available variables: %title%')
            .addText((text) =>
                text
                    .setPlaceholder('Defaults to %title%')
                    .setValue(this.plugin.settings.bilibiliNoteTitle || DEFAULT_SETTINGS.bilibiliNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.bilibiliNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Bilibili note template')
            .setDesc('Available variables: %videoTitle%, %videoURL%, %videoId%, %videoPlayer%')
            .addTextArea((textarea) => {
                textarea
                    .setValue(this.plugin.settings.bilibiliNote || DEFAULT_SETTINGS.bilibiliNote)
                    .onChange(async (value) => {
                        this.plugin.settings.bilibiliNote = value;
                        await this.plugin.saveSettings();
                    });
                textarea.inputEl.rows = 10;
                textarea.inputEl.cols = 25;
            });

        containerEl.createEl('h2', { text: 'Twitter' });

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

        containerEl.createEl('h2', { text: 'Mastodon' });

        new Setting(containerEl)
            .setName('Mastodon note template title')
            .setDesc('Available variables: %tootAuthorName%, %date%')
            .addText((text) =>
                text
                    .setPlaceholder('Defaults to %tootAuthorName%')
                    .setValue(this.plugin.settings.mastodonNoteTitle || DEFAULT_SETTINGS.mastodonNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.mastodonNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );
        new Setting(containerEl)
            .setName('Mastodon note template')
            .setDesc('Available variables: %date%, %tootAuthorName%, %tootURL%, %tootContent%, %tootMedia%')
            .addTextArea((textarea) => {
                textarea
                    .setValue(this.plugin.settings.mastodonNote || DEFAULT_SETTINGS.mastodonNote)
                    .onChange(async (value) => {
                        this.plugin.settings.mastodonNote = value;
                        await this.plugin.saveSettings();
                    });
                textarea.inputEl.rows = 10;
                textarea.inputEl.cols = 25;
            });

        new Setting(containerEl)
            .setName('Download media attachments')
            .setDesc('If enabled, media attachments of toot are downloaded to the assets folder (only Desktop App feature)')
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        this.plugin.settings.hasOwnProperty('downloadMastodonMediaAttachments')
                        ? this.plugin.settings.downloadMastodonMediaAttachments
                        : DEFAULT_SETTINGS.downloadMastodonMediaAttachments
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.downloadMastodonMediaAttachments = value;
                        mastodonMediaAttachmentsInDirSetting.setDisabled(!value);
                        await this.plugin.saveSettings();
                    }),
            );

        const mastodonMediaAttachmentsInDirSetting = new Setting(containerEl)
            .setName('Download media attachments to folder')
            .setDesc('If enabled, the media attachments of toot are stored in their own folder.')
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        this.plugin.settings.hasOwnProperty('downloadMastodonMediaAttachmentsInDir')
                        ? this.plugin.settings.downloadMastodonMediaAttachmentsInDir
                        : DEFAULT_SETTINGS.downloadMastodonMediaAttachmentsInDir
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.downloadMastodonMediaAttachmentsInDir = value;
                        await this.plugin.saveSettings();
                    }),
            );

        containerEl.createEl('h2', { text: 'Readble Article' });

        new Setting(containerEl)
            .setName('Readable article note template title')
            .setDesc('Available variables: %title%, %date%')
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
            .setName('Readable article note template')
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
            .setName('Download images')
            .setDesc('If enabled, images in note are downloaded to the defined folder (only Desktop App feature)')
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        this.plugin.settings.hasOwnProperty('downloadImages')
                        ? this.plugin.settings.downloadImages
                        : DEFAULT_SETTINGS.downloadImages
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.downloadImages = value;
                        imagesInArticleDirSettings.setDisabled(!value);
                        await this.plugin.saveSettings();
                    }),
            );

        const imagesInArticleDirSettings = new Setting(containerEl)
            .setName('Download images to note folder')
            .setDesc('If enabled, the images of an note are stored in their own folder.')
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        this.plugin.settings.hasOwnProperty('downloadImagesInArticleDir')
                        ? this.plugin.settings.downloadImagesInArticleDir
                        : DEFAULT_SETTINGS.downloadImagesInArticleDir
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.downloadImagesInArticleDir = value;
                        await this.plugin.saveSettings();
                    }),
            );

        containerEl.createEl('h2', { text: 'Nonreadable Article' });

        new Setting(containerEl)
            .setName('Nonreadable article note template title')
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
            .setName('Nonreadable article note template')
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

        containerEl.createEl('h2', { text: 'Text Snippet' });

        new Setting(containerEl)
            .setName('Text snippet note template title')
            .setDesc('Available variables: %date%')
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to 'Note %date%'`)
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
