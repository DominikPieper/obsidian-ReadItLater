import { addIcon, normalizePath, Plugin } from 'obsidian';
import ContentConverter from './converter';
import { DEFAULT_SETTINGS, ReadItLaterSettings, ReadItLaterSettingsTab } from './settings';

export default class ReadItLaterPlugin extends Plugin {
	settings: ReadItLaterSettings;

	async onload() {
		await this.loadSettings();

		if(!(await this.app.vault.adapter.exists(normalizePath(this.settings.inboxDir)))) {
			await this.app.vault.adapter.mkdir(this.settings.inboxDir);
		}

		addIcon('read-it-later', sweepIcon);
		
		this.addRibbonIcon('read-it-later', 'ReadItLater: Save clipboard', async () => {
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

const sweepIcon = `
<svg fill="currentColor" stroke="currentColor" version="1.1" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
	<g>
		<path d="m365.9,144.9c-12.3,0-24.2,1.8-35.4,5.2v-114.7h-96.9l7.3-35.4h-150.2l6.8,35.4h-97.5v454.6h330.5v-102.1c11.2,3.4 23.1,5.2 35.4,5.2 68.8-0.1 124.1-56.4 124.1-124.1 0-67.8-55.3-124.1-124.1-124.1zm-150.1-124l-10.4,50h-79.2l-9.4-50h99zm93.8,448.2h-288.7v-412.8h80.7l6.8,35.4h113.6l7.3-35.4h80.3v102.2c-27.3,14-48.8,37.9-59.7,66.7h-200.9v20.8h195c-1.4,7.4-2.2,15.1-2.2,22.9 0,13.4 2.2,26.4 6.2,38.6h-199v20.9h208.1c12,21.8 30.3,39.7 52.5,51.1v89.6zm56.3-98c-57.3,0-103.2-46.9-103.2-103.2s46.9-103.2 103.2-103.2c57.3,0 103.2,46.9 103.2,103.2s-45.8,103.2-103.2,103.2z"/>
		<polygon points="426.4,223.1 346.1,303.4 313.8,271.1 299.2,285.7 346.1,332.6 441,237.7   "/>
		<rect width="233.5" x="49" y="143.9" height="20.9"/>
		<rect width="233.5" x="49" y="388.9" height="20.9"/>
	</g>
</svg>`;