interface TemplateData {
  [key: string]: string | number;
}

type ModifierFunction = (value: string, ...args: any[]) => string;

interface Modifiers {
  [key: string]: ModifierFunction;
}

interface Pattern {
  start: string;
  end: string;
}

export default class TemplateEngine {
  private patterns: Pattern[];
  private modifiers: Modifiers;

  constructor() {
    this.patterns = [
      { start: '{{', end: '}}' },
      { start: '%', end: '%' }
    ];
    this.modifiers = {
      lower: (value: string) => value.toLowerCase(),
      upper: (value: string) => value.toUpperCase(),
      capitalize: (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
      striptags: (value: string, allowedTags: string = '') => {
        const regex = new RegExp(`<(?!\/?(${allowedTags.replace(/[<>]/g, '').split(',').join('|')})\s*\/?)[^>]+>`, 'gi');
        return value.replace(regex, '');
      }
    };
  }

  private parseModifier(modifierString: string): { name: string; args: string[] } {
    const match = modifierString.match(/(\w+)(?:\((.*?)\))?/);
    if (match) {
      const [, name, argsString] = match;
      const args = argsString ? this.parseArguments(argsString) : [];
      return { name, args };
    }
    return { name: modifierString, args: [] };
  }

  private parseArguments(argsString: string): string[] {
    const args: string[] = [];
    let current = '';
    let inQuotes = false;
    let escapeNext = false;

    for (const char of argsString) {
      if (escapeNext) {
        current += char;
        escapeNext = false;
      } else if (char === '\\') {
        escapeNext = true;
      } else if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        args.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current) {
      args.push(current.trim());
    }

    return args.map(arg => arg.replace(/^['"](.*)['"]$/, '$1'));
  }

  private applyModifier(value: string, modifierString: string): string {
    const { name, args } = this.parseModifier(modifierString);
    if (this.modifiers[name]) {
      return this.modifiers[name](value, ...args);
    }
    return value;
  }

  public render(template: string, data: TemplateData): string {
    let result = template;
    for (const pattern of this.patterns) {
      const regex = new RegExp(`${pattern.start}\\s*(.*?)\\s*${pattern.end}`, 'g');
      result = result.replace(regex, (match: string, content: string) => {
        const [key, ...modifiers] = content.split('|').map(item => item.trim());
        if (!(key in data)) return match;
        let value = String(data[key]);
        for (const modifier of modifiers) {
          value = this.applyModifier(value, modifier);
        }
        return value;
      });
    }
    return result;
  }

  public addModifier(name: string, func: ModifierFunction): void {
    this.modifiers[name] = func;
  }
}
