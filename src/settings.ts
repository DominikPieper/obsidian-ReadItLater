import { App, PluginSettingTab, Setting } from "obsidian";
import ReadItLaterPlugin from "./main";

export interface ReadItLaterSettings {
	inboxDir: string;
	twitterDefaultTag: string;
	youtubeDefaultTag: string;
    articleDefaultTag: string;
    textsnippetDefaultTag: string;
    preventTags: boolean;
}

export const DEFAULT_SETTINGS: ReadItLaterSettings = {
	inboxDir: 'ReadItLater Inbox',
	twitterDefaultTag: 'Tweet',
	youtubeDefaultTag: 'Youtube',
    articleDefaultTag: 'Article',
    textsnippetDefaultTag: 'Textsnippet',
    preventTags: false
}

export class ReadItLaterSettingsTab extends PluginSettingTab {
	plugin: ReadItLaterPlugin;

	constructor(app: App, plugin: ReadItLaterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for the ReadItLater plugin.'});

		new Setting(containerEl)
			.setName('Inbox dir')
			.setDesc('By default, the plugin will add the files to the root folder')
			.addText(text => text
				.setPlaceholder('Defaults to root')
				.setValue(DEFAULT_SETTINGS.inboxDir)
				.onChange(async (value) => {
					this.plugin.settings.inboxDir = value;
					await this.plugin.saveSettings();
				}));

        new Setting(containerEl)
            .setName('Prevent all added tags')
            .setDesc('If this is true, no tags will be added')
            .addToggle(tg => tg
                .onChange(async (value) => {
					this.plugin.settings.preventTags = value;
					await this.plugin.saveSettings();
				}));
        new Setting(containerEl)
            .setName('Article default tag')
            .setDesc('This tag will be added to the header of every Article pasted')
            .addText(text => text
				.setPlaceholder('')
				.setValue(DEFAULT_SETTINGS.articleDefaultTag)
				.onChange(async (value) => {
					this.plugin.settings.articleDefaultTag = value;
					await this.plugin.saveSettings();
				}));
        new Setting(containerEl)
            .setName('Tweet default tag')
            .setDesc('This tag will be added to the header of every Tweet pasted')
            .addText(text => text
                .setPlaceholder('')
                .setValue(DEFAULT_SETTINGS.twitterDefaultTag)
                .onChange(async (value) => {
                    this.plugin.settings.twitterDefaultTag = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('Youtube default tag')
            .setDesc('This tag will be added to the header of every Youtube video pasted')
            .addText(text => text
                .setPlaceholder('')
                .setValue(DEFAULT_SETTINGS.youtubeDefaultTag)
                .onChange(async (value) => {
                    this.plugin.settings.youtubeDefaultTag = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('Textsnippet default tag')
            .setDesc('This tag will be added to the header of every Textsnippets pasted')
            .addText(text => text
                .setPlaceholder('')
                .setValue(DEFAULT_SETTINGS.textsnippetDefaultTag)
                .onChange(async (value) => {
                    this.plugin.settings.textsnippetDefaultTag = value;
                    await this.plugin.saveSettings();
                }));
	}
}
