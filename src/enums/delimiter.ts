import { DropdownEnumOption } from './enum';

export enum Delimiter {
    NewLine = 'newLine',
    Comma = 'comma',
    Period = 'period',
    Semicolon = 'semicolon',
}

export function getDelimiterOptions(): DropdownEnumOption[] {
    return [
        { label: 'New Line', option: Delimiter.NewLine },
        { label: 'Comma', option: Delimiter.Comma },
        { label: 'Period', option: Delimiter.Period },
        { label: 'Semicolon', option: Delimiter.Semicolon },
    ];
}

export function getDelimiterValue(type: Delimiter): string {
    switch (type) {
        case Delimiter.NewLine:
            return '\n';
        case Delimiter.Comma:
            return ',';
        case Delimiter.Period:
            return '.';
        case Delimiter.Semicolon:
            return ';';
    }
}
