import { iterStream, toArray } from '../utils';
import { type FileStream } from './fileParser';

export async function parseNdjson(input: FileStream): Promise<string[][]> {
    const stream = input
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new NDJSONParser());

    return toArray(iterStream(stream));
}

class NDJSONParser extends TransformStream<string, string[]> {
    constructor() {
        super(NDJSONParser.createTransformer());
    }

    private static createTransformer(): Transformer<string, any> {
        let buffer = '';
        return {
            transform(chunk, controller) {
                const parts = chunk.split('\n');
                if (parts.length > 1) {
                    controller.enqueue(JSON.parse(buffer + parts[0]));
                    buffer = '';
                }
                for (let i = 1; i < parts.length - 1; i++)
                    controller.enqueue(JSON.parse(parts[i]));

                buffer += parts.at(-1);
            },
            flush(controller) {
                if (buffer)
                    controller.enqueue(JSON.parse(buffer));

                controller.terminate();
            },
        };
    }
}
