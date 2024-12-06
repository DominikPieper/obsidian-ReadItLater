export function lexify(number: number): string {
    if (number < 1000) {
        return String(number);
    }
    if (number < 1000000) {
        return `${toFixedWithoutZeros(Number(number / 1000), 1)}K`;
    }
    if (number < 1000000000) {
        return `${toFixedWithoutZeros(Number(number / 1000000), 1)}M`;
    }

    return String(number);
}

export function toFixedWithoutZeros(number: number, precision: number): string {
    return number.toFixed(precision).replace(/\.0+$/, '');
}
