import { streamToString } from '../utils';
import { type StreamedEntry } from './zip-extractor';

export async function parseDocument(
    entry: StreamedEntry,
    result: Record<string, any>,
    resultKey: string,
    dsPromises?: Record<string, { promise: Promise<any>, resolve: (val: any) => any }>,
    parser = new DOMParser(),
) {
    const stream = entry.readable!
        .pipeThrough(new TextDecoderStream());
    const text = await streamToString(stream);
    const xml = parser.parseFromString(text, 'text/xml');
    result[resultKey] = xml;
    if (dsPromises)
        dsPromises[resultKey].resolve(xml);
}
