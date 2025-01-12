import { App, Notice, Platform, PluginSettingTab, Setting } from 'obsidian';
import { Delimiter, getDelimiterOptions } from 'src/enums/delimiter';
import { FileExistsStrategy, getFileExistStrategyOptions } from 'src/enums/fileExistsStrategy';
import { getDefaultFilesystenLimits } from 'src/helpers/fileutils';
import { createHTMLDiv } from 'src/helpers/setting';
import ReadItLaterPlugin from 'src/main';
import { DEFAULT_SETTINGS } from 'src/settings';

enum DetailsItem {
    ReadableArticle = 'readableArticle',
    Youtube = 'youtube',
    YoutubeChannel = 'youtubeChannel',
    X = 'x',
    Bluesky = 'bluesky',
    StackExchange = 'stackExchange',
    Pinterest = 'pinterest',
    Mastodon = 'mastodon',
    Vimeo = 'vimeo',
    Bilibili = 'bilibili',
    TikTok = 'tikTok',
    NonReadableArticle = 'nonReadableArticle',
    TextSnippet = 'textSnippet',
}

export class ReadItLaterSettingsTab extends PluginSettingTab {
    plugin: ReadItLaterPlugin;

    private activeDetatils: string[] = [];

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
            .setName('Duplicate note filename behavior')
            .setDesc('Applied when note with the same filename already exists')
            .addDropdown((dropdown) => {
                getFileExistStrategyOptions().forEach((fileExistsStrategyOption) =>
                    dropdown.addOption(fileExistsStrategyOption.option, fileExistsStrategyOption.label),
                );

                dropdown.setValue(this.plugin.settings.fileExistsStrategy || DEFAULT_SETTINGS.fileExistsStrategy);

                dropdown.onChange(async (value) => {
                    this.plugin.settings.fileExistsStrategy = value as FileExistsStrategy;
                    await this.plugin.saveSettings();
                });
            });

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
        containerEl.createDiv({ text: 'Settings for each content. Click on caret to expand.' });

        let detailsEl: HTMLElement;

        containerEl.createEl('hr', { cls: 'readitlater-setting-hr' });
        detailsEl = this.createDetailsElement(containerEl, DetailsItem.ReadableArticle);
        detailsEl.createEl('summary', {
            text: 'Readable Article',
            cls: 'readitlater-setting-h3',
        });

        new Setting(detailsEl)
            .setName('Readable content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.parseableArticleContentType)
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

        new Setting(detailsEl)
            .setName('Readable article note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.parseableArticleNoteTitle)
                    .setValue(
                        this.plugin.settings.parseableArticleNoteTitle || DEFAULT_SETTINGS.parseableArticleNoteTitle,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.parseableArticleNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(detailsEl)
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

        new Setting(detailsEl)
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

        new Setting(detailsEl)
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

        containerEl.createEl('hr', { cls: 'readitlater-setting-hr' });
        detailsEl = this.createDetailsElement(containerEl, DetailsItem.Youtube);
        detailsEl.createEl('summary', {
            text: 'YouTube',
            cls: 'readitlater-setting-h3',
        });

        new Setting(detailsEl)
            .setName('Youtube content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.youtubeContentTypeSlug)
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

        new Setting(detailsEl)
            .setName('Youtube note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.youtubeNoteTitle)
                    .setValue(this.plugin.settings.youtubeNoteTitle || DEFAULT_SETTINGS.youtubeNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.youtubeNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(detailsEl)
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

        new Setting(detailsEl).setName('Youtube embed player width').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.youtubeEmbedWidth)
                .setValue(this.plugin.settings.youtubeEmbedWidth || DEFAULT_SETTINGS.youtubeEmbedWidth)
                .onChange(async (value) => {
                    this.plugin.settings.youtubeEmbedWidth = value;
                    await this.plugin.saveSettings();
                }),
        );

        new Setting(detailsEl).setName('Youtube embed player height').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.youtubeEmbedHeight)
                .setValue(this.plugin.settings.youtubeEmbedHeight || DEFAULT_SETTINGS.youtubeEmbedHeight)
                .onChange(async (value) => {
                    this.plugin.settings.youtubeEmbedHeight = value;
                    await this.plugin.saveSettings();
                }),
        );

        new Setting(detailsEl)
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

        containerEl.createEl('hr', { cls: 'readitlater-setting-hr' });
        detailsEl = this.createDetailsElement(containerEl, DetailsItem.YoutubeChannel);
        detailsEl.createEl('summary', {
            text: 'YouTube channel',
            cls: 'readitlater-setting-h3',
        });

        new Setting(detailsEl)
            .setName('Youtube channel content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.youtubeChannelContentTypeSlug)
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

        new Setting(detailsEl)
            .setName('Youtube channel note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.youtubeChannelNoteTitle)
                    .setValue(this.plugin.settings.youtubeChannelNoteTitle || DEFAULT_SETTINGS.youtubeChannelNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.youtubeChannelNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(detailsEl)
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

        containerEl.createEl('hr', { cls: 'readitlater-setting-hr' });
        detailsEl = this.createDetailsElement(containerEl, DetailsItem.X);
        detailsEl.createEl('summary', {
            text: 'X.com',
            cls: 'readitlater-setting-h3',
        });

        new Setting(detailsEl)
            .setName('X.com content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.twitterContentTypeSlug)
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

        new Setting(detailsEl)
            .setName('X.com note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.twitterNoteTitle)
                    .setValue(this.plugin.settings.twitterNoteTitle || DEFAULT_SETTINGS.twitterNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.twitterNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );
        new Setting(detailsEl)
            .setName('X.com note template')
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

        containerEl.createEl('hr', { cls: 'readitlater-setting-hr' });
        detailsEl = this.createDetailsElement(containerEl, DetailsItem.Bluesky);
        detailsEl.createEl('summary', {
            text: 'Bluesky',
            cls: 'readitlater-setting-h3',
        });

        new Setting(detailsEl)
            .setName('Bluesky content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.blueskyContentTypeSlug)
                    .setValue(
                        typeof this.plugin.settings.blueskyContentTypeSlug === 'undefined'
                            ? DEFAULT_SETTINGS.blueskyContentTypeSlug
                            : this.plugin.settings.blueskyContentTypeSlug,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.blueskyContentTypeSlug = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(detailsEl)
            .setName('Bluesky note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.blueskyNoteTitle)
                    .setValue(this.plugin.settings.blueskyNoteTitle || DEFAULT_SETTINGS.blueskyNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.blueskyNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(detailsEl)
            .setName('Bluesky note template')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addTextArea((textarea) => {
                textarea
                    .setValue(this.plugin.settings.blueskyNote || DEFAULT_SETTINGS.blueskyNote)
                    .onChange(async (value) => {
                        this.plugin.settings.blueskyNote = value;
                        await this.plugin.saveSettings();
                    });
                textarea.inputEl.rows = 10;
                textarea.inputEl.cols = 25;
            });

        new Setting(detailsEl)
            .setName('Download embedded content')
            .setDesc(
                'Embedded content will be downloaded to the assets directory (Desktop App feature only). To dynamically change destination directory you can use variables. Check variables reference to learn more.',
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        Object.prototype.hasOwnProperty.call(this.plugin.settings, 'downloadBlueskyEmbeds')
                            ? this.plugin.settings.downloadBlueskyEmbeds
                            : DEFAULT_SETTINGS.downloadBlueskyEmbeds,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.downloadBlueskyEmbeds = value;
                        if (value === false) {
                            this.plugin.settings.downloadBlueskyEmbedsInDir = false;
                        }
                        await this.plugin.saveSettings();
                        this.display();
                    }),
            );

        new Setting(detailsEl)
            .setName('Download embedded content to note directory')
            .setDesc(
                'Embedded content will be downloaded to the dedicated note assets directory (Desktop App feature only). Overrides assets directory template.',
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        Object.prototype.hasOwnProperty.call(this.plugin.settings, 'downloadBlueskyEmbedsInDir')
                            ? this.plugin.settings.downloadBlueskyEmbedsInDir
                            : DEFAULT_SETTINGS.downloadBlueskyEmbedsInDir,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.downloadBlueskyEmbedsInDir = value;
                        if (value === true) {
                            this.plugin.settings.downloadBlueskyEmbeds = true;
                        }
                        await this.plugin.saveSettings();
                        this.display();
                    }),
            );

        new Setting(detailsEl)
            .setName('Save replies')
            .setDesc('If enabled, post replies will be saved.')
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        Object.prototype.hasOwnProperty.call(this.plugin.settings, 'saveBlueskyPostReplies')
                            ? this.plugin.settings.saveBlueskyPostReplies
                            : DEFAULT_SETTINGS.saveBlueskyPostReplies,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.saveBlueskyPostReplies = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(detailsEl).setName('Bluesky post reply template').addTextArea((textarea) => {
            textarea
                .setValue(this.plugin.settings.blueskyPostReply || DEFAULT_SETTINGS.blueskyPostReply)
                .onChange(async (value) => {
                    this.plugin.settings.blueskyPostReply = value;
                    await this.plugin.saveSettings();
                });
            textarea.inputEl.rows = 10;
            textarea.inputEl.cols = 25;
        });

        containerEl.createEl('hr', { cls: 'readitlater-setting-hr' });
        detailsEl = this.createDetailsElement(containerEl, DetailsItem.StackExchange);
        detailsEl.createEl('summary', {
            text: 'Stack Exchange',
            cls: 'readitlater-setting-h3',
        });

        new Setting(detailsEl)
            .setName('Stack Exchange content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.stackExchangeContentType)
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

        new Setting(detailsEl).setName('Stack Exchange note title template').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.stackExchangeNoteTitle)
                .setValue(this.plugin.settings.stackExchangeNoteTitle || DEFAULT_SETTINGS.stackExchangeNoteTitle)
                .onChange(async (value) => {
                    this.plugin.settings.stackExchangeNoteTitle = value;
                    await this.plugin.saveSettings();
                }),
        );

        new Setting(detailsEl)
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

        new Setting(detailsEl)
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

        new Setting(detailsEl)
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

        new Setting(detailsEl)
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

        containerEl.createEl('hr', { cls: 'readitlater-setting-hr' });
        detailsEl = this.createDetailsElement(containerEl, DetailsItem.Pinterest);
        detailsEl.createEl('summary', {
            text: 'Pinterest',
            cls: 'readitlater-setting-h3',
        });

        new Setting(detailsEl)
            .setName('Pinterest content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.pinterestContentTypeSlug)
                    .setValue(
                        typeof this.plugin.settings.pinterestContentTypeSlug === 'undefined'
                            ? DEFAULT_SETTINGS.pinterestContentTypeSlug
                            : this.plugin.settings.pinterestContentTypeSlug,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.pinterestContentTypeSlug = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(detailsEl)
            .setName('Pinterest note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.pinterestNoteTitle)
                    .setValue(this.plugin.settings.pinterestNoteTitle || DEFAULT_SETTINGS.pinterestNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.pinterestNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(detailsEl)
            .setName('Pinterest note template')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addTextArea((textarea) => {
                textarea
                    .setValue(this.plugin.settings.pinterestNote || DEFAULT_SETTINGS.pinterestNote)
                    .onChange(async (value) => {
                        this.plugin.settings.pinterestNote = value;
                        await this.plugin.saveSettings();
                    });
                textarea.inputEl.rows = 10;
                textarea.inputEl.cols = 25;
            });

        new Setting(detailsEl)
            .setName('Download image')
            .setDesc(
                'Image will be downloaded to the assets directory (Desktop App feature only). To dynamically change destination directory you can use variables. Check variables reference to learn more.',
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        Object.prototype.hasOwnProperty.call(this.plugin.settings, 'downloadPinterestImage')
                            ? this.plugin.settings.downloadPinterestImage
                            : DEFAULT_SETTINGS.downloadPinterestImage,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.downloadPinterestImage = value;
                        await this.plugin.saveSettings();
                    }),
            );

        containerEl.createEl('hr', { cls: 'readitlater-setting-hr' });
        detailsEl = this.createDetailsElement(containerEl, DetailsItem.Mastodon);
        detailsEl.createEl('summary', {
            text: 'Mastodon',
            cls: 'readitlater-setting-h3',
        });

        new Setting(detailsEl)
            .setName('Mastodon content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.mastodonContentTypeSlug)
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

        new Setting(detailsEl)
            .setName('Mastodon note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.mastodonNoteTitle)
                    .setValue(this.plugin.settings.mastodonNoteTitle || DEFAULT_SETTINGS.mastodonNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.mastodonNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(detailsEl)
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

        new Setting(detailsEl)
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

        new Setting(detailsEl)
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

        new Setting(detailsEl)
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

        new Setting(detailsEl).setName('Mastodon reply template').addTextArea((textarea) => {
            textarea
                .setValue(this.plugin.settings.mastodonReply || DEFAULT_SETTINGS.mastodonReply)
                .onChange(async (value) => {
                    this.plugin.settings.mastodonReply = value;
                    await this.plugin.saveSettings();
                });
            textarea.inputEl.rows = 10;
            textarea.inputEl.cols = 25;
        });

        containerEl.createEl('hr', { cls: 'readitlater-setting-hr' });
        detailsEl = this.createDetailsElement(containerEl, DetailsItem.Vimeo);
        detailsEl.createEl('summary', {
            text: 'Vimeo',
            cls: 'readitlater-setting-h3',
        });

        new Setting(detailsEl)
            .setName('Vimeo content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.vimeoContentTypeSlug)
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

        new Setting(detailsEl)
            .setName('Vimeo note title template')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.vimeoNoteTitle)
                    .setValue(this.plugin.settings.vimeoNoteTitle || DEFAULT_SETTINGS.vimeoNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.vimeoNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(detailsEl)
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

        new Setting(detailsEl).setName('Vimeo embed player width').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.vimeoEmbedWidth)
                .setValue(this.plugin.settings.vimeoEmbedWidth || DEFAULT_SETTINGS.vimeoEmbedWidth)
                .onChange(async (value) => {
                    this.plugin.settings.vimeoEmbedWidth = value;
                    await this.plugin.saveSettings();
                }),
        );

        new Setting(detailsEl).setName('Vimeo embed player height').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.vimeoEmbedHeight)
                .setValue(this.plugin.settings.vimeoEmbedHeight || DEFAULT_SETTINGS.vimeoEmbedHeight)
                .onChange(async (value) => {
                    this.plugin.settings.vimeoEmbedHeight = value;
                    await this.plugin.saveSettings();
                }),
        );

        containerEl.createEl('hr', { cls: 'readitlater-setting-hr' });
        detailsEl = this.createDetailsElement(containerEl, DetailsItem.Bilibili);
        detailsEl.createEl('summary', {
            text: 'Bilibili',
            cls: 'readitlater-setting-h3',
        });

        new Setting(detailsEl)
            .setName('Bilibili content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.bilibiliContentTypeSlug)
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

        new Setting(detailsEl)
            .setName('Bilibili note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.bilibiliNoteTitle)
                    .setValue(this.plugin.settings.bilibiliNoteTitle || DEFAULT_SETTINGS.bilibiliNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.bilibiliNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(detailsEl)
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

        new Setting(detailsEl).setName('Bilibili embed player width').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.bilibiliEmbedWidth)
                .setValue(this.plugin.settings.bilibiliEmbedWidth || DEFAULT_SETTINGS.bilibiliEmbedWidth)
                .onChange(async (value) => {
                    this.plugin.settings.bilibiliEmbedWidth = value;
                    await this.plugin.saveSettings();
                }),
        );

        new Setting(detailsEl).setName('Bilibili embed player height').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.bilibiliEmbedHeight)
                .setValue(this.plugin.settings.bilibiliEmbedHeight || DEFAULT_SETTINGS.bilibiliEmbedHeight)
                .onChange(async (value) => {
                    this.plugin.settings.bilibiliEmbedHeight = value;
                    await this.plugin.saveSettings();
                }),
        );

        containerEl.createEl('hr', { cls: 'readitlater-setting-hr' });
        detailsEl = this.createDetailsElement(containerEl, DetailsItem.TikTok);
        detailsEl.createEl('summary', {
            text: 'TikTok',
            cls: 'readitlater-setting-h3',
        });

        new Setting(detailsEl)
            .setName('TikTok content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.tikTokContentTypeSlug)
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

        new Setting(detailsEl)
            .setName('TikTok note title template')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.tikTokNoteTitle)
                    .setValue(this.plugin.settings.tikTokNoteTitle || DEFAULT_SETTINGS.tikTokNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.tikTokNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(detailsEl)
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

        new Setting(detailsEl).setName('TikTok embed player width').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.tikTokEmbedWidth)
                .setValue(this.plugin.settings.tikTokEmbedWidth || DEFAULT_SETTINGS.tikTokEmbedWidth)
                .onChange(async (value) => {
                    this.plugin.settings.tikTokEmbedWidth = value;
                    await this.plugin.saveSettings();
                }),
        );

        new Setting(detailsEl).setName('TikTok embed player height').addText((text) =>
            text
                .setPlaceholder(DEFAULT_SETTINGS.tikTokEmbedHeight)
                .setValue(this.plugin.settings.tikTokEmbedHeight || DEFAULT_SETTINGS.tikTokEmbedHeight)
                .onChange(async (value) => {
                    this.plugin.settings.tikTokEmbedHeight = value;
                    await this.plugin.saveSettings();
                }),
        );

        containerEl.createEl('hr', { cls: 'readitlater-setting-hr' });
        detailsEl = this.createDetailsElement(containerEl, DetailsItem.NonReadableArticle);
        detailsEl.createEl('summary', {
            text: 'Nonreadable Article',
            cls: 'readitlater-setting-h3',
        });

        new Setting(detailsEl)
            .setName('Nonreadable content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.notParseableArticleContentType)
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

        new Setting(detailsEl)
            .setName('Nonreadable article note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.notParseableArticleNoteTitle)
                    .setValue(
                        this.plugin.settings.notParseableArticleNoteTitle ||
                            DEFAULT_SETTINGS.notParseableArticleNoteTitle,
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.notParseableArticleNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(detailsEl)
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

        containerEl.createEl('hr', { cls: 'readitlater-setting-hr' });
        detailsEl = this.createDetailsElement(containerEl, DetailsItem.TextSnippet);
        detailsEl.createEl('summary', {
            text: 'Text Snippet',
            cls: 'readitlater-setting-h3',
        });

        new Setting(detailsEl)
            .setName('Text Snippet content type slug')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.textSnippetContentType)
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

        new Setting(detailsEl)
            .setName('Text snippet note template title')
            .setDesc(this.createTemplateVariableReferenceDiv())
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.textSnippetNoteTitle)
                    .setValue(this.plugin.settings.textSnippetNoteTitle || DEFAULT_SETTINGS.textSnippetNoteTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.textSnippetNoteTitle = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(detailsEl)
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

    private createDetailsElement(parentElement: HTMLElement, itemId: DetailsItem): HTMLElement {
        const details = parentElement.createEl('details');
        details.addEventListener('toggle', () => {
            if (details.open) {
                this.activeDetatils.push(itemId);
            } else {
                this.activeDetatils = this.activeDetatils.filter((item) => item !== itemId);
            }
        });

        if (this.activeDetatils.includes(itemId)) {
            details.setAttribute('open', '');
        }

        return details;
    }

    private createTemplateVariableReferenceDiv(prepend: string = ''): DocumentFragment {
        return createHTMLDiv(
            `<p>${prepend} See the <a href="https://github.com/DominikPieper/obsidian-ReadItLater?tab=readme-ov-file#template-engine">template variables reference</a></p>`,
        );
    }
}
