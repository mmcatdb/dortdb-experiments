import { type ColumnDef } from '@/types/data';
import { CSVParser } from '../csv-parser';
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
        .pipeThrough(new CSVParser(columns, options));
}
