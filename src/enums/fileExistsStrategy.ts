import { DropdownEnumOption } from './enum';

export enum FileExistsStrategy {
    AppendToExisting = 'appendToExisting',
    Ask = 'ask',
    Nothing = 'nothing',
}

export function getFileExistStrategyOptions(): DropdownEnumOption[] {
    return [
        { label: 'Ask', option: FileExistsStrategy.Ask },
        { label: 'Nothing', option: FileExistsStrategy.Nothing },
        { label: 'Append to the existing note', option: FileExistsStrategy.AppendToExisting },
    ];
}
