import { parseCsv } from './csvParser';
import { parseDocument } from './documentParser';
import { parseNdjson } from './ndjsonParser';
import { type InputFile } from '../schema';
import { parseZip } from './zipParser';

export type FileStream = ReadableStream<Uint8Array<ArrayBuffer>>;

export function parseFile(stream: FileStream, dsOptions: InputFile) {
    switch (dsOptions.type) {
    case 'csv':
        return parseCsv(stream, dsOptions.csvOptions, dsOptions.columns);
    case 'xml':
        return parseDocument(stream);
    case 'ndjson':
        return parseNdjson(stream);
    case 'zip':
        return parseZip(stream, dsOptions.files);
    }
}
