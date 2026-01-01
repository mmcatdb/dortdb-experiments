import { parseCsv } from './csvParser';
import { parseDocument } from './documentParser';
import { parseNdjson } from './ndjsonParser';
import { type SimpleFileSchema, type FileSchema, type ParsedFileData, type ParsedSimpleFileData } from '@/types/schema';
import { parseZip } from './zipParser';

export type FileStream = ReadableStream<Uint8Array<ArrayBuffer>>;

export async function parseFile(stream: FileStream, fileSchema: FileSchema): Promise<ParsedFileData> {
    if (fileSchema.type === 'zip')
        return parseZip(stream, fileSchema.files);

    return {
        [fileSchema.key]: await parseSimpleFile(stream, fileSchema),
    };
}

export function parseSimpleFile(stream: FileStream, fileSchema: SimpleFileSchema): Promise<ParsedSimpleFileData> {
    switch (fileSchema.type) {
    case 'csv':
        return parseCsv(stream, fileSchema.csvOptions, fileSchema.columns);
    case 'xml':
        return parseDocument(stream);
    case 'ndjson':
        return parseNdjson(stream);
    }
}
