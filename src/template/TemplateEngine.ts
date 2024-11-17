interface TemplateData {
    [key: string]: any;
}

type ModifierFunction = (value: any, ...args: any[]) => string;

interface Modifiers {
    [key: string]: ModifierFunction;
}

export default class TemplateEngine {
    private modifiers: Modifiers;

    constructor() {
        this.modifiers = {
            blockquote: (value: string) => {
                if (typeof value !== 'string') {
                    return value;
                }
                return value
                    .split('\n')
                    .map((line) => `> ${line}`)
                    .join('\n');
            },
            lower: (value: string) => String(value).toLowerCase(),
            upper: (value: string) => String(value).toUpperCase(),
            capitalize: (value: string) => {
                const str = String(value);
                return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
            },
            replace: (value: string, search: string, replacement: string = '') => {
                return value.replaceAll(search, replacement);
            },
            striptags: (value: string, allowedTags: string = '') => {
                if (typeof value !== 'string') return String(value);
                const regex = new RegExp(
                    `<(?!/?(${allowedTags.replace(/[<>]/g, '').split(',').join('|')})s*/?)[^>]+>`,
                    'gi',
                );
                return value.replace(regex, '');
            },
            join: (value: any[], separator: string = ',') => {
                if (!Array.isArray(value)) return String(value);
                return value.join(separator);
            },
            map: (value: any[], transform: (item: any) => any) => {
                if (!Array.isArray(value)) return String(value);
                try {
                    return value.map(transform).join('');
                } catch (e) {
                    console.warn('Error in map modifier:', e);
                    return String(value);
                }
            },
        };
    }

    public render(template: string, data: TemplateData): string {
        try {
            // First process any loops in the template
            let result = this.processLoops(template, data);

            // Then process variables with modifiers
            result = this.processVariables(result, data);

            // Finally process simple pattern substitutions
            result = this.processSimplePattern(result, data);

            return result;
        } catch (e) {
            console.error('Error rendering template:', e);
            return template; // Return original template on error
        }
    }

    private processSimplePattern(template: string, data: TemplateData): string {
        const simplePatternRegex = /%(\w+(?:\.\w+)*)%/g;

        return template.replace(simplePatternRegex, (match: string, path: string) => {
            try {
                const value = this.resolveValue(path, data);
                return value !== undefined ? String(value) : '';
            } catch (e) {
                console.warn(`Error processing simple pattern "${match}":`, e);
                return match;
            }
        });
    }

    private processVariables(template: string, data: TemplateData): string {
        const variableRegex = /{{(.*?)}}/g;

        return template.replace(variableRegex, (match: string, content: string) => {
            try {
                const [key, ...modifiers] = content.split('|').map((item) => item.trim());
                const value = this.resolveValue(key, data);

                if (value === undefined) {
                    console.warn(`Unable to resolve ${key}`);
                    return '';
                }

                let processedValue = value;
                for (const modifier of modifiers) {
                    processedValue = this.applyModifier(processedValue, modifier);
                }
                return String(processedValue);
            } catch (e) {
                console.warn(`Error processing variable "${match}":`, e);
                return match;
            }
        });
    }

    private processLoops(template: string, data: TemplateData): string {
        const loopRegex = /{%\s*for\s+(\w+)\s+in\s+(\w+(?:\.\w+)*)\s*%}([\s\S]*?){%\s*endfor\s*%}/g;

        return template.replace(loopRegex, (match: string, itemName: string, arrayPath: string, content: string) => {
            try {
                const arrayValue = this.resolveValue(arrayPath, data);

                if (!Array.isArray(arrayValue)) {
                    console.warn(`Value at "${arrayPath}" is not an array`);
                    return '';
                }

                return arrayValue
                    .map((item: any) => {
                        const loopContext = { ...data, [itemName]: item };
                        return this.render(content, loopContext);
                    })
                    .join('');
            } catch (e) {
                console.warn(`Error processing loop "${match}":`, e);
                return '';
            }
        });
    }

    private resolveValue(path: string, data: TemplateData): any {
        const parts = path.trim().split('.');
        let value = data;

        for (const part of parts) {
            if (value === undefined || value === null) return undefined;
            value = value[part];
        }

        return value;
    }

    public addModifier(name: string, func: ModifierFunction): void {
        if (typeof func !== 'function') {
            throw new Error('Modifier must be a function');
        }
        this.modifiers[name] = func;
    }

    private parseModifier(modifierString: string): { name: string; args: any[] } {
        const match = modifierString.match(/(\w+)(?:\((.*?)\))?/);
        if (!match) return { name: modifierString, args: [] };

        const [, name, argsString] = match;
        const args = argsString ? this.parseArguments(argsString) : [];
        return { name, args };
    }

    private parseArguments(argsString: string): any[] {
        const args: any[] = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        let inArrowFunction = false;
        let bracketCount = 0;
        let escapeNext = false;

        const pushArg = () => {
            const trimmed = current.trim();
            if (trimmed || inQuotes) {
                // Consider empty strings when in quotes
                args.push(this.evaluateArgument(current.trim()));
            }
            current = '';
        };

        for (let i = 0; i < argsString.length; i++) {
            const char = argsString[i];

            if (escapeNext) {
                current += char;
                escapeNext = false;
                continue;
            }

            switch (char) {
                case '\\':
                    escapeNext = true;
                    break;
                case '"':
                case "'":
                    if (!inArrowFunction) {
                        if (inQuotes && char === quoteChar) {
                            inQuotes = false;
                        } else if (!inQuotes) {
                            inQuotes = true;
                            quoteChar = char;
                        }
                    }
                    current += char;
                    break;
                case '(':
                    bracketCount++;
                    current += char;
                    break;
                case ')':
                    bracketCount--;
                    current += char;
                    break;
                case '=':
                    if (argsString[i + 1] === '>') {
                        inArrowFunction = true;
                        current += '=>';
                        i++; // Skip next character
                    } else {
                        current += char;
                    }
                    break;
                case ',':
                    if (!inQuotes && !inArrowFunction && bracketCount === 0) {
                        pushArg();
                    } else {
                        current += char;
                    }
                    break;
                default:
                    current += char;
            }
        }

        if (current || inQuotes) {
            // Consider empty strings when in quotes
            pushArg();
        }

        return args;
    }

    private evaluateArgument(arg: string): any {
        try {
            // Handle arrow functions
            if (arg.includes('=>')) {
                const arrowFunc = Function(`return ${arg}`)();
                return typeof arrowFunc === 'function' ? arrowFunc : arg;
            }

            // Handle quoted strings
            if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
                return arg.slice(1, -1);
            }

            // Handle empty strings (when quotes were present but removed)
            if (arg === '') {
                return '';
            }

            // Handle numbers
            if (!isNaN(Number(arg))) {
                return Number(arg);
            }

            // Handle arrays
            if (arg.startsWith('[') && arg.endsWith(']')) {
                try {
                    return JSON.parse(arg);
                } catch (e) {
                    return arg;
                }
            }

            return arg;
        } catch (e) {
            console.warn('Error evaluating argument:', arg, e);
            return arg;
        }
    }

    private applyModifier(value: any, modifierString: string): any {
        try {
            const { name, args } = this.parseModifier(modifierString);
            if (this.modifiers[name]) {
                return this.modifiers[name](value, ...args);
            }
            console.warn(`Modifier "${name}" not found`);
            return value;
        } catch (e) {
            console.warn(`Error applying modifier "${modifierString}":`, e);
            return value;
        }
    }
}
