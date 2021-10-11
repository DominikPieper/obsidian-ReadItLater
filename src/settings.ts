import { App, PluginSettingTab, Setting } from 'obsidian';
import ReadItLaterPlugin from './main';

export interface ReadItLaterSettings {
    inboxDir: string;
    twitterDefaultTag: string;
    youtubeDefaultTag: string;
    articleDefaultTag: string;
    textsnippetDefaultTag: string;
    preventTags: boolean;
    ytLinkOrEmbed: LinkOrEmbed;
    tweetLinkOrEmbed: LinkOrEmbed;
}

export enum LinkOrEmbed {
    EMBED = 'EMBED',
    MARKDOWN_LINK = 'MARKDOWN_LINK',
}

export const DEFAULT_SETTINGS: ReadItLaterSettings = {
    inboxDir: 'ReadItLater Inbox',
    twitterDefaultTag: 'Tweet',
    youtubeDefaultTag: 'Youtube',
    articleDefaultTag: 'Article',
    textsnippetDefaultTag: 'Textsnippet',
    preventTags: false,
    ytLinkOrEmbed: LinkOrEmbed.EMBED,
    tweetLinkOrEmbed: LinkOrEmbed.EMBED,
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
            .setDesc('By default, the plugin will add the files to the root folder')
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
            .setName('Prevent all added tags')
            .setDesc('If this is true, no tags will be added')
            .addToggle((tg) =>
                tg
                    .setValue(this.plugin.settings.preventTags || DEFAULT_SETTINGS.preventTags)
                    .onChange(async (value) => {
                        this.plugin.settings.preventTags = value;
                        await this.plugin.saveSettings();
                    }),
            );
        new Setting(containerEl)
            .setName('Article default tag')
            .setDesc('This tag will be added to the header of every Article pasted')
            .addText((text) =>
                text
                    .setPlaceholder('')
                    .setValue(this.plugin.settings.articleDefaultTag || DEFAULT_SETTINGS.articleDefaultTag)
                    .onChange(async (value) => {
                        this.plugin.settings.articleDefaultTag = value;
                        await this.plugin.saveSettings();
                    }),
            );
        new Setting(containerEl)
            .setName('Tweet default tag')
            .setDesc('This tag will be added to the header of every Tweet pasted')
            .addText((text) =>
                text
                    .setPlaceholder('')
                    .setValue(this.plugin.settings.twitterDefaultTag || DEFAULT_SETTINGS.twitterDefaultTag)
                    .onChange(async (value) => {
                        this.plugin.settings.twitterDefaultTag = value;
                        await this.plugin.saveSettings();
                    }),
            );
        new Setting(containerEl)
            .setName('Tweet Link or Embed')
            .setDesc('Tweet link as a markdown link or embedded')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption(LinkOrEmbed.MARKDOWN_LINK, 'Markdown link')
                    .addOption(LinkOrEmbed.EMBED, 'Embedded Tweet')
                    .setValue(this.plugin.settings.tweetLinkOrEmbed || DEFAULT_SETTINGS.tweetLinkOrEmbed)
                    .onChange(async (value: LinkOrEmbed) => {
                        this.plugin.settings.tweetLinkOrEmbed = value;
                        await this.plugin.saveSettings();
                    }),
            );
        new Setting(containerEl)
            .setName('Youtube default tag')
            .setDesc('This tag will be added to the header of every Youtube video pasted')
            .addText((text) =>
                text
                    .setPlaceholder('')
                    .setValue(this.plugin.settings.youtubeDefaultTag || DEFAULT_SETTINGS.youtubeDefaultTag)
                    .onChange(async (value) => {
                        this.plugin.settings.youtubeDefaultTag = value;
                        await this.plugin.saveSettings();
                    }),
            );
        new Setting(containerEl)
            .setName('Youtube Link or Embed')
            .setDesc('Youtube link as a markdown link or embedded')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption(LinkOrEmbed.MARKDOWN_LINK, 'Markdown link')
                    .addOption(LinkOrEmbed.EMBED, 'Embedded Video')
                    .setValue(this.plugin.settings.ytLinkOrEmbed || DEFAULT_SETTINGS.ytLinkOrEmbed)
                    .onChange(async (value: LinkOrEmbed) => {
                        this.plugin.settings.ytLinkOrEmbed = value;
                        await this.plugin.saveSettings();
                    }),
            );
        new Setting(containerEl)
            .setName('Textsnippet default tag')
            .setDesc('This tag will be added to the header of every Textsnippets pasted')
            .addText((text) =>
                text
                    .setPlaceholder('')
                    .setValue(this.plugin.settings.textsnippetDefaultTag || DEFAULT_SETTINGS.textsnippetDefaultTag)
                    .onChange(async (value) => {
                        this.plugin.settings.textsnippetDefaultTag = value;
                        await this.plugin.saveSettings();
                    }),
            );
    }
}
