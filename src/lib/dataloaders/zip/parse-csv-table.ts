import { ColumnType, type ColumnDef } from '@/types/data';
import { type CastingFunction, CSVParser } from '../csv-parser';
import { iterStream, toArray } from '../utils';
import { type StreamedEntry } from './zip-extractor';

export type CSVParseOptions = {
    separator: string;
    hasHeader: boolean;
};

export async function parseCSVTable(
    entry: StreamedEntry,
    result: Record<string, any>,
    resultKey: string,
    options: CSVParseOptions,
    columns: ColumnDef[],
    dsPromises?: Record<string, { promise: Promise<any>, resolve: (val: any) => any }>,
) {
    const stream = createCsvStream(entry, options, columns);

    result[resultKey] = await toArray(iterStream(stream));
    if (dsPromises)
        dsPromises[resultKey].resolve(result[resultKey]);
}

export function createCsvStream(entry: StreamedEntry, options: CSVParseOptions, columns: ColumnDef[]) {
    return entry.readable!
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(
            new CSVParser({
                delimiter: options.separator,
                escape: '\\',
                columns: columns,
                fromLine: options.hasHeader ? 2 : 1,
                cast: createCastFunction(columns),
            }),
        );
}

function createCastFunction(columns: ColumnDef[]): CastingFunction {
    const columnArray = columns.map(col => col.type);
    const columnMap = new Map(columns.map(col => [ col.name, col.type ]));

    let top = 0;

    return (value: string, context: { header: boolean, column: number | string }) => {
        if (top++ < 10)
            console.log('Casting value:', { value, context });
        if (context.header)
            return value;

        if (value === '')
            return null;

        // Not sure which one is being used here.
        const type = typeof context.column === 'number' ? columnArray[context.column] : columnMap.get(context.column);

        switch (type) {
        case ColumnType.string:
            return value;
        case ColumnType.int:
        case ColumnType.real:
            return Number(value);
        case ColumnType.date:
            return new Date(value);
        }
    };
}
