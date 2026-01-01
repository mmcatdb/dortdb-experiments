import * as zip from '@zip.js/zip.js';
import { iterStream } from '../utils';
import { type ParsedSimpleFileData, type ParsedFileData, type SimpleFileSchema } from '../schema';
import { type FileStream, parseSimpleFile } from './fileParser';

export type StreamedEntry = Omit<zip.Entry, 'getData'> & {
    readable?: FileStream;
};

export async function parseZip(stream: FileStream, innerFiles: SimpleFileSchema[]): Promise<ParsedFileData> {
    const fileMap = new Map(innerFiles.map(f => [ f.path, f ]));

    const promises: { key: string, promise: Promise<ParsedSimpleFileData> }[] = [];
    const unzipped = stream.pipeThrough(new zip.ZipReaderStream());

    // There was a change in ArrayBuffer (https://devblogs.microsoft.com/typescript/announcing-typescript-5-9-rc/#notable-behavioral-changes) which is not yet reflected in @zip.js types.
    for await (const entry of iterStream(unzipped as ReadableStream<StreamedEntry>)) {
        const schema = fileMap.get(entry.filename);
        if (!schema)
            continue;

        promises.push({ key: schema.key, promise: parseSimpleFile(entry.readable!, schema) });
    }

    const results = await Promise.all(promises.map(p => p.promise));
    const output: ParsedFileData = {};

    for (let i = 0; i < promises.length; i++)
        output[promises[i].key] = results[i];

    return output;
}
