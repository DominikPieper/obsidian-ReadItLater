import { App, Modal, Setting } from 'obsidian';
import { FileExistsStrategy } from 'src/enums/fileExistsStrategy';
import { createHTMLDiv } from 'src/helpers/setting';
import { Note } from 'src/parsers/Note';

export default class FileExistsAsk extends Modal {
    constructor(app: App, notes: Note[], onSubmit: (strategy: FileExistsStrategy, doNotAskAgain: boolean) => void) {
        super(app);

        this.setTitle('Duplicate notes detected');

        const fileNames = notes.map((note) => `<li>${note.fileName}</li>`).join('');
        this.setContent(createHTMLDiv(`<ul>${fileNames}</ul>`));

        let doNotAskAgain = false;

        new Setting(this.contentEl).setName('Do not ask again').addToggle((toggle) => {
            toggle.setValue(false).onChange(() => (doNotAskAgain = true));
        });

        new Setting(this.contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Append to existing')
                    .setCta()
                    .onClick(() => {
                        this.close();
                        onSubmit(FileExistsStrategy.AppendToExisting, doNotAskAgain);
                    }),
            )
            .addButton((btn) =>
                btn.setButtonText('Nothing').onClick(() => {
                    this.close();
                    onSubmit(FileExistsStrategy.Nothing, doNotAskAgain);
                }),
            );
    }
}
