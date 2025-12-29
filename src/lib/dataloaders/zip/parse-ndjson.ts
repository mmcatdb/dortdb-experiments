import { NDJSONParser } from '../ndjson-parser';
import { iterStream, toArray } from '../utils';
import { type StreamedEntry } from './zip-extractor';

export async function parseNdjson(
    entry: StreamedEntry,
    result: Record<string, any>,
    resultKey: string,
    dsPromises?: Record<string, { promise: Promise<any>, resolve: (val: any) => any }>,
) {
    const stream = entry.readable!
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new NDJSONParser());
    result[resultKey] = await toArray(iterStream(stream));
    if (dsPromises)
        dsPromises[resultKey].resolve(result[resultKey]);
}
