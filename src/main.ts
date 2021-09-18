import { normalizePath, Plugin } from 'obsidian';
import ContentConverter from './converter';
import { DEFAULT_SETTINGS, ReadItLaterSettings, ReadItLaterSettingsTab } from './settings';

export default class ReadItLaterPlugin extends Plugin {
	settings: ReadItLaterSettings;

	async onload() {
		await this.loadSettings();

		if(!(await this.app.vault.adapter.exists(normalizePath(this.settings.inboxDir)))) {
			await this.app.vault.adapter.mkdir(this.settings.inboxDir);
		}

		this.addRibbonIcon('dice', 'Save clipboard', async () => {
			const converter = new ContentConverter(this.app, this.settings);
			await converter.processClipboard();
		});

		this.addCommand({
			id: 'save-clipboard-to-notice',
			name: 'Save clipboard',
			callback: async () => {
				const converter = new ContentConverter(this.app, this.settings);
				await converter.processClipboard();
			}
		});

		this.addSettingTab(new ReadItLaterSettingsTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}