import { App, Notice, Platform, PluginSettingTab, Setting } from 'obsidian';
import { Delimiter, getDelimiterOptions } from 'src/enums/delimiter';
import { getDefaultFilesystenLimits } from 'src/helpers/fileutils';
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
            .setName('Inbox directory')
            .setDesc(
                'Enter valid directory name. For nested directory use this format: Directory A/Directory B. If no directory is entered, new note will be created in vault root.',
            )
            .addText((text) =>
                text
                    .setPlaceholder('Defaults to vault root directory')
                    .setValue(
                        typeof this.plugin.settings.inboxDir === 'undefined'
                            ? DEFAULT_SETTINGS.inboxDir
                            : this.plugin.settings.inboxDir,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.inboxDir = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Assets directory')
            .setDesc(
                'Enter valid directory name. For nested directory use this format: Directory A/Directory B. If no directory is entered, new note will be created in Vault root.',
            )
            .addText((text) =>
                text
                    .setPlaceholder('Defaults to vault root directory')
                    .setValue(
                        typeof this.plugin.settings.assetsDir === 'undefined'
                            ? DEFAULT_SETTINGS.inboxDir + '/assets'
                            : this.plugin.settings.assetsDir,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.assetsDir = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Open new note in current workspace')
            .setDesc('If enabled, new note will open in current workspace')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.openNewNote || DEFAULT_SETTINGS.openNewNote)
                    .onChange(async (value) => {
                        this.plugin.settings.openNewNote = value;
                        if (value === true) {
                            this.plugin.settings.openNewNoteInNewTab = false;
                        }
                        await this.plugin.saveSettings();
                        this.display();
                    }),
            );

        new Setting(containerEl)
            .setName('Open new note in new tab')
            .setDesc('If enabled, new note will open in new tab')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.openNewNoteInNewTab || DEFAULT_SETTINGS.openNewNoteInNewTab)
                    .onChange(async (value) => {
                        this.plugin.settings.openNewNoteInNewTab = value;
                        if (value === true) {
                            this.plugin.settings.openNewNote = false;
                        }
                        await this.plugin.saveSettings();
                        this.display();
                    }),
            );

        new Setting(containerEl)
            .setName('Batch note creation delimiter')
            .setDesc('Delimiter for batch list of notes')
            .addDropdown((dropdown) => {
                getDelimiterOptions().forEach((delimiterOption) =>
                    dropdown.addOption(delimiterOption.option, delimiterOption.label),
                );

                dropdown.setValue(this.plugin.settings.batchProcessDelimiter || DEFAULT_SETTINGS.batchProcessDelimiter);

                dropdown.onChange(async (value) => {
                    this.plugin.settings.batchProcessDelimiter = value as Delimiter;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName('Date format string')
            .setDesc('Format of the %date% variable. NOTE: do not use symbols forbidden in file names.')
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to ${DEFAULT_SETTINGS.dateTitleFmt}`)
                    .setValue(
                        typeof this.plugin.settings.dateTitleFmt === 'undefined'
                            ? DEFAULT_SETTINGS.dateTitleFmt
                            : this.plugin.settings.dateTitleFmt,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.dateTitleFmt = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Date format string in content')
            .setDesc('Format of the %date% variable for content')
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to ${DEFAULT_SETTINGS.dateContentFmt}`)
                    .setValue(
                        typeof this.plugin.settings.dateContentFmt === 'undefined'
                            ? DEFAULT_SETTINGS.dateContentFmt
                            : this.plugin.settings.dateContentFmt,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.dateContentFmt = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Extend share menu')
            .setDesc(
                'If enabled, share menu will be extended with shortcut to create note directly from it. Requires plugin reload or Obsidian restart to apply change.',
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        Object.prototype.hasOwnProperty.call(this.plugin.settings, 'extendShareMenu')
                            ? this.plugin.settings.extendShareMenu
                            : DEFAULT_SETTINGS.extendShareMenu,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.extendShareMenu = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Youtube Data API v3 key')
            .setDesc('If entered, Youtube related content types will use Youtube API to fetc the data.')
            .addText((text) =>
                text
                    .setPlaceholder('')
                    .setValue(this.plugin.settings.youtubeApiKey || DEFAULT_SETTINGS.youtubeApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.youtubeApiKey = value;
                        await this.plugin.saveSettings();
                    }),
            );

        containerEl.createEl('h1', { text: 'Content Types' });

        containerEl.createEl('h2', { text: 'YouTube' });

        new Setting(containerEl)
            .setName('Youtube content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to ${DEFAULT_SETTINGS.youtubeContentTypeSlug}`)
                    .setValue(
                        typeof this.plugin.settings.youtubeContentTypeSlug === 'undefined'
                            ? DEFAULT_SETTINGS.youtubeContentTypeSlug
                            : this.plugin.settings.youtubeContentTypeSlug,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.youtubeContentTypeSlug = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Youtube note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to ${DEFAULT_SETTINGS.youtubeNoteTitle}`)
                    .setValue(this.plugin.settings.youtubeNoteTitle || DEFAULT_SETTINGS.youtubeNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.youtubeNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Youtube note template')
            .setDesc(this.createTemplateVariableReferenceDiv())
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

        new Setting(containerEl).setName('Youtube embed player width').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.youtubeEmbedWidth)
                .setValue(this.plugin.settings.youtubeEmbedWidth || DEFAULT_SETTINGS.youtubeEmbedWidth)
                .onChange(async (value) => {
                    this.plugin.settings.youtubeEmbedWidth = value;
                    await this.plugin.saveSettings();
                }),
        );

        new Setting(containerEl).setName('Youtube embed player height').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.youtubeEmbedHeight)
                .setValue(this.plugin.settings.youtubeEmbedHeight || DEFAULT_SETTINGS.youtubeEmbedHeight)
                .onChange(async (value) => {
                    this.plugin.settings.youtubeEmbedHeight = value;
                    await this.plugin.saveSettings();
                }),
        );

        new Setting(containerEl)
            .setName('Embed in privacy enhanced mode')
            .setDesc(
                'If enabled, content will be embeded in privacy enhanced mode, which prevents the use of views of it from influencing the viewer’s browsing experience on YouTube.',
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        Object.prototype.hasOwnProperty.call(this.plugin.settings, 'youtubeUsePrivacyEnhancedEmbed')
                            ? this.plugin.settings.youtubeUsePrivacyEnhancedEmbed
                            : DEFAULT_SETTINGS.youtubeUsePrivacyEnhancedEmbed,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.youtubeUsePrivacyEnhancedEmbed = value;
                        await this.plugin.saveSettings();
                    }),
            );

        containerEl.createEl('h2', { text: 'YouTube Channel' });

        new Setting(containerEl)
            .setName('Youtube channel content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to ${DEFAULT_SETTINGS.youtubeChannelContentTypeSlug}`)
                    .setValue(
                        typeof this.plugin.settings.youtubeChannelContentTypeSlug === 'undefined'
                            ? DEFAULT_SETTINGS.youtubeChannelContentTypeSlug
                            : this.plugin.settings.youtubeChannelContentTypeSlug,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.youtubeChannelContentTypeSlug = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Youtube channel note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to ${DEFAULT_SETTINGS.youtubeChannelNoteTitle}`)
                    .setValue(this.plugin.settings.youtubeChannelNoteTitle || DEFAULT_SETTINGS.youtubeChannelNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.youtubeChannelNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Youtube channel note template')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addTextArea((textarea) => {
                textarea
                    .setValue(this.plugin.settings.youtubeChannelNote || DEFAULT_SETTINGS.youtubeChannelNote)
                    .onChange(async (value) => {
                        this.plugin.settings.youtubeChannelNote = value;
                        await this.plugin.saveSettings();
                    });
                textarea.inputEl.rows = 10;
                textarea.inputEl.cols = 25;
            });

        containerEl.createEl('h2', { text: 'Vimeo' });

        new Setting(containerEl)
            .setName('Vimeo content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to ${DEFAULT_SETTINGS.vimeoContentTypeSlug}`)
                    .setValue(
                        typeof this.plugin.settings.vimeoContentTypeSlug === 'undefined'
                            ? DEFAULT_SETTINGS.vimeoContentTypeSlug
                            : this.plugin.settings.vimeoContentTypeSlug,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.vimeoContentTypeSlug = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Vimeo note title template')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder('Defaults to %title%')
                    .setValue(this.plugin.settings.vimeoNoteTitle || DEFAULT_SETTINGS.vimeoNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.vimeoNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Vimeo note template')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addTextArea((textarea) => {
                textarea
                    .setValue(this.plugin.settings.vimeoNote || DEFAULT_SETTINGS.vimeoNote)
                    .onChange(async (value) => {
                        this.plugin.settings.vimeoNote = value;
                        await this.plugin.saveSettings();
                    });
                textarea.inputEl.rows = 10;
                textarea.inputEl.cols = 25;
            });

        new Setting(containerEl).setName('Vimeo embed player width').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.vimeoEmbedWidth)
                .setValue(this.plugin.settings.vimeoEmbedWidth || DEFAULT_SETTINGS.vimeoEmbedWidth)
                .onChange(async (value) => {
                    this.plugin.settings.vimeoEmbedWidth = value;
                    await this.plugin.saveSettings();
                }),
        );

        new Setting(containerEl).setName('Vimeo embed player height').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.vimeoEmbedHeight)
                .setValue(this.plugin.settings.vimeoEmbedHeight || DEFAULT_SETTINGS.vimeoEmbedHeight)
                .onChange(async (value) => {
                    this.plugin.settings.vimeoEmbedHeight = value;
                    await this.plugin.saveSettings();
                }),
        );

        containerEl.createEl('h2', { text: 'Bilibili' });

        new Setting(containerEl)
            .setName('Bilibili content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to ${DEFAULT_SETTINGS.bilibiliContentTypeSlug}`)
                    .setValue(
                        typeof this.plugin.settings.bilibiliContentTypeSlug === 'undefined'
                            ? DEFAULT_SETTINGS.bilibiliContentTypeSlug
                            : this.plugin.settings.bilibiliContentTypeSlug,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.bilibiliContentTypeSlug = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Bilibili note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
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
            .setDesc(this.createTemplateVariableReferenceDiv())
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

        new Setting(containerEl).setName('Bilibili embed player width').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.bilibiliEmbedWidth)
                .setValue(this.plugin.settings.bilibiliEmbedWidth || DEFAULT_SETTINGS.bilibiliEmbedWidth)
                .onChange(async (value) => {
                    this.plugin.settings.bilibiliEmbedWidth = value;
                    await this.plugin.saveSettings();
                }),
        );

        new Setting(containerEl).setName('Bilibili embed player height').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.bilibiliEmbedHeight)
                .setValue(this.plugin.settings.bilibiliEmbedHeight || DEFAULT_SETTINGS.bilibiliEmbedHeight)
                .onChange(async (value) => {
                    this.plugin.settings.bilibiliEmbedHeight = value;
                    await this.plugin.saveSettings();
                }),
        );

        containerEl.createEl('h2', { text: 'Twitter' });

        new Setting(containerEl)
            .setName('Twitter content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to ${DEFAULT_SETTINGS.twitterContentTypeSlug}`)
                    .setValue(
                        typeof this.plugin.settings.twitterContentTypeSlug === 'undefined'
                            ? DEFAULT_SETTINGS.twitterContentTypeSlug
                            : this.plugin.settings.twitterContentTypeSlug,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.twitterContentTypeSlug = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Twitter note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
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
            .setDesc(this.createTemplateVariableReferenceDiv())
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

        containerEl.createEl('h2', { text: 'Stack Exchange' });

        new Setting(containerEl)
            .setName('Stack Exchange content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to ${DEFAULT_SETTINGS.stackExchangeContentType}`)
                    .setValue(
                        typeof this.plugin.settings.stackExchangeContentType === 'undefined'
                            ? DEFAULT_SETTINGS.stackExchangeContentType
                            : this.plugin.settings.stackExchangeContentType,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.stackExchangeContentType = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl).setName('Stack Exchange note title template').addText((text) =>
            text
                .setPlaceholder('Defaults to %title%')
                .setValue(this.plugin.settings.stackExchangeNoteTitle || DEFAULT_SETTINGS.stackExchangeNoteTitle)
                .onChange(async (value) => {
                    this.plugin.settings.stackExchangeNoteTitle = value;
                    await this.plugin.saveSettings();
                }),
        );

        new Setting(containerEl)
            .setName('Stack Exchange question note template')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addTextArea((textarea) => {
                textarea
                    .setValue(this.plugin.settings.stackExchangeNote || DEFAULT_SETTINGS.stackExchangeNote)
                    .onChange(async (value) => {
                        this.plugin.settings.stackExchangeNote = value;
                        await this.plugin.saveSettings();
                    });
                textarea.inputEl.rows = 10;
                textarea.inputEl.cols = 25;
            });

        new Setting(containerEl)
            .setName('Stack Exchange answer template')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addTextArea((textarea) => {
                textarea
                    .setValue(this.plugin.settings.stackExchangeAnswer || DEFAULT_SETTINGS.stackExchangeAnswer)
                    .onChange(async (value) => {
                        this.plugin.settings.stackExchangeAnswer = value;
                        await this.plugin.saveSettings();
                    });
                textarea.inputEl.rows = 10;
                textarea.inputEl.cols = 25;
            });

        new Setting(containerEl)
            .setName('Download media attachments')
            .setDesc(
                'Media attachments will be downloaded to the assets directory (Desktop App feature only). To dynamically change destination directory you can use variables. Check variables reference to learn more.',
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        Object.prototype.hasOwnProperty.call(this.plugin.settings, 'downloadStackExchangeAssets')
                            ? this.plugin.settings.downloadStackExchangeAssets
                            : DEFAULT_SETTINGS.downloadStackExchangeAssets,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.downloadStackExchangeAssets = value;
                        if (value === false) {
                            this.plugin.settings.downloadStackExchangeAssetsInDir = false;
                        }
                        await this.plugin.saveSettings();
                        this.display();
                    }),
            );

        new Setting(containerEl)
            .setName('Download media attachments to note directory')
            .setDesc(
                'Media attachments will be downloaded to the dedicated note assets directory (Desktop App feature only). Overrides assets directory template.',
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        Object.prototype.hasOwnProperty.call(this.plugin.settings, 'downloadStackExchangeAssetsInDir')
                            ? this.plugin.settings.downloadStackExchangeAssetsInDir
                            : DEFAULT_SETTINGS.downloadStackExchangeAssetsInDir,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.downloadStackExchangeAssetsInDir = value;
                        if (value === true) {
                            this.plugin.settings.downloadStackExchangeAssets = true;
                        }
                        await this.plugin.saveSettings();
                        this.display();
                    }),
            );

        containerEl.createEl('h2', { text: 'Mastodon' });

        new Setting(containerEl)
            .setName('Mastodon content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to ${DEFAULT_SETTINGS.mastodonContentTypeSlug}`)
                    .setValue(
                        typeof this.plugin.settings.mastodonContentTypeSlug === 'undefined'
                            ? DEFAULT_SETTINGS.mastodonContentTypeSlug
                            : this.plugin.settings.mastodonContentTypeSlug,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.mastodonContentTypeSlug = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Mastodon note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
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
            .setDesc(this.createTemplateVariableReferenceDiv())
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
            .setDesc(
                'Media attachments will be downloaded to the assets directory (Desktop App feature only). To dynamically change destination directory you can use variables. Check variables reference to learn more.',
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        Object.prototype.hasOwnProperty.call(this.plugin.settings, 'downloadMastodonMediaAttachments')
                            ? this.plugin.settings.downloadMastodonMediaAttachments
                            : DEFAULT_SETTINGS.downloadMastodonMediaAttachments,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.downloadMastodonMediaAttachments = value;
                        if (value === false) {
                            this.plugin.settings.downloadMastodonMediaAttachmentsInDir = false;
                        }
                        await this.plugin.saveSettings();
                        this.display();
                    }),
            );

        new Setting(containerEl)
            .setName('Download media attachments to note directory')
            .setDesc(
                'Media attachments will be downloaded to the dedicated note assets directory (Desktop App feature only). Overrides assets directory template.',
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        Object.prototype.hasOwnProperty.call(
                            this.plugin.settings,
                            'downloadMastodonMediaAttachmentsInDir',
                        )
                            ? this.plugin.settings.downloadMastodonMediaAttachmentsInDir
                            : DEFAULT_SETTINGS.downloadMastodonMediaAttachmentsInDir,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.downloadMastodonMediaAttachmentsInDir = value;
                        if (value === true) {
                            this.plugin.settings.downloadMastodonMediaAttachments = true;
                        }
                        await this.plugin.saveSettings();
                        this.display();
                    }),
            );

        new Setting(containerEl)
            .setName('Save replies')
            .setDesc('If enabled, replies of toot will be saved.')
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        Object.prototype.hasOwnProperty.call(this.plugin.settings, 'saveMastodonReplies')
                            ? this.plugin.settings.saveMastodonReplies
                            : DEFAULT_SETTINGS.saveMastodonReplies,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.saveMastodonReplies = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl).setName('Mastodon reply template').addTextArea((textarea) => {
            textarea
                .setValue(this.plugin.settings.mastodonReply || DEFAULT_SETTINGS.mastodonReply)
                .onChange(async (value) => {
                    this.plugin.settings.mastodonReply = value;
                    await this.plugin.saveSettings();
                });
            textarea.inputEl.rows = 10;
            textarea.inputEl.cols = 25;
        });

        containerEl.createEl('h2', { text: 'TikTok' });

        new Setting(containerEl)
            .setName('TikTok content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to ${DEFAULT_SETTINGS.tikTokContentTypeSlug}`)
                    .setValue(
                        typeof this.plugin.settings.tikTokContentTypeSlug === 'undefined'
                            ? DEFAULT_SETTINGS.tikTokContentTypeSlug
                            : this.plugin.settings.tikTokContentTypeSlug,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.tikTokContentTypeSlug = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('TikTok note title template')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder('TikTok from %authorName% (%date%)')
                    .setValue(this.plugin.settings.tikTokNoteTitle || DEFAULT_SETTINGS.tikTokNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.tikTokNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('TikTok note template')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addTextArea((textarea) => {
                textarea
                    .setValue(this.plugin.settings.tikTokNote || DEFAULT_SETTINGS.tikTokNote)
                    .onChange(async (value) => {
                        this.plugin.settings.tikTokNote = value;
                        await this.plugin.saveSettings();
                    });
                textarea.inputEl.rows = 10;
                textarea.inputEl.cols = 25;
            });

        new Setting(containerEl).setName('TikTok embed player width').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.tikTokEmbedWidth)
                .setValue(this.plugin.settings.tikTokEmbedWidth || DEFAULT_SETTINGS.tikTokEmbedWidth)
                .onChange(async (value) => {
                    this.plugin.settings.tikTokEmbedWidth = value;
                    await this.plugin.saveSettings();
                }),
        );

        new Setting(containerEl).setName('TikTok embed player height').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.tikTokEmbedHeight)
                .setValue(this.plugin.settings.tikTokEmbedHeight || DEFAULT_SETTINGS.tikTokEmbedHeight)
                .onChange(async (value) => {
                    this.plugin.settings.tikTokEmbedHeight = value;
                    await this.plugin.saveSettings();
                }),
        );

        containerEl.createEl('h2', { text: 'Readable Article' });

        new Setting(containerEl)
            .setName('Readable content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to ${DEFAULT_SETTINGS.parseableArticleContentType}`)
                    .setValue(
                        typeof this.plugin.settings.parseableArticleContentType === 'undefined'
                            ? DEFAULT_SETTINGS.parseableArticleContentType
                            : this.plugin.settings.parseableArticleContentType,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.parseableArticleContentType = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Readable article note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
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
            .setDesc(this.createTemplateVariableReferenceDiv())
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
            .setDesc(
                'Images from article will be downloaded to the assets directory (Desktop App feature only). To dynamically change destination directory you can use variables. Check variables reference to learn more.',
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        Object.prototype.hasOwnProperty.call(this.plugin.settings, 'downloadImages')
                            ? this.plugin.settings.downloadImages
                            : DEFAULT_SETTINGS.downloadImages,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.downloadImages = value;
                        if (value === false) {
                            this.plugin.settings.downloadImagesInArticleDir = false;
                        }
                        await this.plugin.saveSettings();
                        this.display();
                    }),
            );

        new Setting(containerEl)
            .setName('Download images to note directory')
            .setDesc(
                'Images from article will be downloaded to the dedicated note assets directory (Desktop App feature only). Overrides assets directory template.',
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        Object.prototype.hasOwnProperty.call(this.plugin.settings, 'downloadImagesInArticleDir')
                            ? this.plugin.settings.downloadImagesInArticleDir
                            : DEFAULT_SETTINGS.downloadImagesInArticleDir,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.downloadImagesInArticleDir = value;
                        if (value === true) {
                            this.plugin.settings.downloadImages = true;
                        }
                        await this.plugin.saveSettings();
                        this.display();
                    }),
            );

        containerEl.createEl('h2', { text: 'Nonreadable Article' });

        new Setting(containerEl)
            .setName('Nonreadable content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to ${DEFAULT_SETTINGS.notParseableArticleContentType}`)
                    .setValue(
                        typeof this.plugin.settings.notParseableArticleContentType === 'undefined'
                            ? DEFAULT_SETTINGS.notParseableArticleContentType
                            : this.plugin.settings.notParseableArticleContentType,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.notParseableArticleContentType = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Nonreadable article note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder("Defaults to 'Article %date%'")
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
            .setDesc(this.createTemplateVariableReferenceDiv())
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
            .setName('Text Snippet content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(`Defaults to ${DEFAULT_SETTINGS.textSnippetContentType}`)
                    .setValue(
                        typeof this.plugin.settings.textSnippetContentType === 'undefined'
                            ? DEFAULT_SETTINGS.textSnippetContentType
                            : this.plugin.settings.textSnippetContentType,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.textSnippetContentType = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Text snippet note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder("Defaults to 'Note %date%'")
                    .setValue(this.plugin.settings.textSnippetNoteTitle || DEFAULT_SETTINGS.textSnippetNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.textSnippetNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Text snippet note template')
            .setDesc(this.createTemplateVariableReferenceDiv())
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

        containerEl.createEl('h2', { text: 'Advanced' });

        const defaultFilesystemLimits = getDefaultFilesystenLimits(Platform);

        new Setting(containerEl)
            .setName('Maximum file path length')
            .setDesc(`Defaults to ${defaultFilesystemLimits.path} characters on your current platform.`)
            .addText((text) =>
                text.setPlaceholder(String(defaultFilesystemLimits.path)).onChange(async (value) => {
                    const trimmedValue = value.trim();
                    if (trimmedValue !== '' && Number.isNaN(Number(trimmedValue))) {
                        new Notice('Maximum file path length must be a number.');
                        return;
                    }
                    if (trimmedValue === '') {
                        this.plugin.settings.filesystemLimitPath = null;
                    } else {
                        this.plugin.settings.filesystemLimitPath = Number(trimmedValue);
                    }
                    await this.plugin.saveSettings();
                }),
            );

        new Setting(containerEl)
            .setName('Maximum file name length')
            .setDesc(`Defaults to ${defaultFilesystemLimits.fileName} characters on your current platform.`)
            .addText((text) =>
                text.setPlaceholder(String(defaultFilesystemLimits.fileName)).onChange(async (value) => {
                    const trimmedValue = value.trim();
                    if (trimmedValue !== '' && Number.isNaN(Number(trimmedValue))) {
                        new Notice('Maximum file name length must be a number.');
                        return;
                    }
                    if (trimmedValue === '') {
                        this.plugin.settings.filesystemLimitFileName = null;
                    } else {
                        this.plugin.settings.filesystemLimitFileName = Number(trimmedValue);
                    }
                    await this.plugin.saveSettings();
                }),
            );
    }

    private createHTMLDiv(html: string): DocumentFragment {
        return createFragment((documentFragment) => (documentFragment.createDiv().innerHTML = html));
    }

    private createTemplateVariableReferenceDiv(prepend: string = ''): DocumentFragment {
        return this.createHTMLDiv(
            `<p>${prepend} See the <a href="https://github.com/DominikPieper/obsidian-ReadItLater?tab=readme-ov-file#template-engine">template variables reference</a></p>`,
        );
    }
}
