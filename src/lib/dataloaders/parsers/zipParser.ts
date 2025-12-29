import * as zip from '@zip.js/zip.js';
import { iterStream } from '../utils';
import { type InputDataFile } from '../schema';
import { type FileStream, parseFile } from './fileParser';

export type StreamedEntry = Omit<zip.Entry, 'getData'> & {
    readable?: FileStream;
};

export async function parseZip(
    stream: FileStream,
    schema: Record<string, InputDataFile>,
    // graphKey = 'defaultGraph',
): Promise<Record<string, unknown>> {
    // const cachedIndices: Record<string, GraphIndex> = {};
    // dsPromises[graphKey] = getPromise();

    const unzipped = stream!.pipeThrough(new zip.ZipReaderStream());

    const promises: { key: string, promise: Promise<unknown> }[] = [];

    // const graph = new MultiDirectedGraph();
    // const graphPromises: Promise<void>[] = [];
    // const result = { [graphKey]: graph };
    const output: Record<string, unknown> = {};

    // There was a change in ArrayBuffer (https://devblogs.microsoft.com/typescript/announcing-typescript-5-9-rc/#notable-behavioral-changes) which is not yet reflected in @zip.js types.
    for await (const entry of iterStream(unzipped as ReadableStream<StreamedEntry>)) {
        if (!(entry.filename in schema))
            continue;

        const dsOptions = schema[entry.filename];

        promises.push({ key: dsOptions.key, promise: parseFile(entry.readable!, dsOptions) });

        //  if (dsOptions.type === 'graph') {
        //     graphPromises.push(
        //         csvToGraph(
        //             dsOptions.key,
        //             dsOptions.fromKey,
        //             dsOptions.toKey,
        //             dsOptions.columns,
        //             graph,
        //             cachedIndices,
        //             dsPromises,
        //         ),
        //     );
        // }
    }

    // await Promise.all(graphPromises);

    // dsPromises[graphKey].resolve(graph);

    const results = await Promise.all(promises.map(p => p.promise));
    for (let i = 0; i < promises.length; i++)
        output[promises[i].key] = results[i];

    return output;
}
