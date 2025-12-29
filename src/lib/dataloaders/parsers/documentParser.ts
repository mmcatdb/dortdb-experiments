import { streamToString } from '../utils';
import { type FileStream } from './fileParser';

export async function parseDocument(input: FileStream): Promise<Document> {
    const stream = input
        .pipeThrough(new TextDecoderStream());

    const text = await streamToString(stream);
    const parser = new DOMParser();
    return parser.parseFromString(text, 'text/xml');
}
