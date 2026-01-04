import { twMerge } from 'tailwind-merge';

export const cn = twMerge;

export function prettyPrintInt(value: number): string {
    const abs = Math.abs(value);
    if (abs < 1000)
        return value.toString();
    return value.toExponential(2);
}

export function prettyPrintDouble(value: number): string {
    const abs = Math.abs(value);
    if (abs < 0.01)
        return value === 0 ? value.toPrecision(3) : value.toExponential(2);
    if (abs < 1000)
        return value.toPrecision(3);
    return value.toExponential(2);
}

export type Quantity<TUnit extends string = string> = QuantityClass<TUnit>;

class QuantityClass<TUnit extends string = string> {
    constructor(
        private readonly units: readonly TUnit[],
        private readonly thresholds: readonly number[],
        private readonly isBaseInteger: boolean,
    ) {}

    defineUnits(from?: TUnit, to?: TUnit): TUnit[] {
        const fromIndex = from !== undefined ? this.units.indexOf(from) : 0;
        const toIndex = to !== undefined ? this.units.indexOf(to) : this.units.length;
        return this.units.slice(fromIndex, toIndex);
    }

    prettyPrint(bytes: number, unit?: TUnit, isInteger?: boolean): string {
        let value: number | undefined;
        if (!unit)
            ({ value, unit } = this.findUnit(bytes));
        else
            value = this.fromBase(bytes, unit);

        // We don't want to show decimal places for integers.
        const omitDecimal = (isInteger ?? this.isBaseInteger) && unit === this.units[0];
        const numberPart = (omitDecimal ? String(value) : value.toFixed(2));
        return `${numberPart} ${unit}`;
    }

    findUnit(valueInBase: number): { value: number, unit: TUnit } {
        let index = 0;
        let value = valueInBase;

        while (value >= this.thresholds[index] && index < this.units.length - 1) {
            value /= this.thresholds[index];
            index++;
        }

        return { value, unit: this.units[index] };
    }

    fromBase(valueInBase: number, toUnit: TUnit): number {
        let value = valueInBase;
        for (let i = 0; i < this.units.length; i++) {
            if (toUnit === this.units[i])
                return value;

            value /= this.thresholds[i];
        }
        throw new Error('Impossibruh');
    }

    toBase(value: number, fromUnit: TUnit): number {
        let baseValue = value;
        for (let i = this.units.indexOf(fromUnit); i > 0; i--)
            baseValue *= this.thresholds[i - 1];
        return baseValue;
    }
}

export type DataSizeUnit = typeof dataSizeUnits[number];
const dataSizeUnits = [ 'B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB' ] as const;

export const dataSizeQuantity = new QuantityClass(
    dataSizeUnits,
    [ 1024, 1024, 1024, 1024, 1024, 1024, 1024, 1024 ],
    true,
);

export type TimeUnit = typeof timeUnits[number];
const timeUnits = [ 'ms', 's', 'min', 'h', 'd', 'y' ] as const;

export const timeQuantity = new QuantityClass(
    timeUnits,
    [ 1000, 60, 60, 24, 365 ],
    false,
);

export function plural(count: number, singular: string, plural?: string): string {
    if (count === 1)
        return singular;

    return plural ?? (singular + 's');
}
