import * as zip from '@zip.js/zip.js';
import { type CSVParseOptions, parseCSVTable } from './parse-csv-table';
import { MultiDirectedGraph } from 'graphology';
import { getPromise, iterStream } from '../utils';
import { parseDocument } from './parse-document';
import { parseNdjson } from './parse-ndjson';
import { csvToGraph } from './csv-to-graph';
import { type ColumnDef } from '@/types/data';

export type StreamedEntry = Omit<zip.Entry, 'getData'> & {
    readable?: ReadableStream<Uint8Array>;
};

export type ExtractedFileOptions = {
    columns: ColumnDef[];
} & ({
    type: 'csv';
    key: string;
    csvOptions: CSVParseOptions;
} | {
    type: 'ndjson';
    key: string;
} | {
    type: 'xml';
    key: string;
} | {
    type: 'graph';
    csvOptions: CSVParseOptions;
});

export async function extractArchive(
    archive: AsyncIterable<Uint8Array<ArrayBufferLike>>,
    dataStructures: Record<string, ExtractedFileOptions>,
    xmlParser: DOMParser = new DOMParser(),
    graphKey = 'defaultGraph',
    graphTypesToTableNames: Record<string, string> = {},
): Promise<Record<string, unknown>> {
    const cachedIndices: Record<string, Map<string | number, Record<string, any>>> = {};
    const dsPromises: Record<string, { promise: Promise<any[]>, resolve: (val: any) => void }> = Object.fromEntries(
        Object.values(dataStructures)
            .filter(ds => 'key' in ds)
            .map(({ key }) => [ key, getPromise() ]),
    );
    dsPromises[graphKey] = getPromise();

    const reader = new zip.ZipReaderStream();
    const writer = reader.writable.getWriter();
    (async () => {
        for await (const chunk of archive)
            await writer.write(chunk);

        await writer.close();
    })();

    const graph = new MultiDirectedGraph();
    const graphPromises: Promise<void>[] = [];
    const result = { [graphKey]: graph };
    for await (const entry of iterStream(reader.readable)) {
        if (!(entry.filename in dataStructures))
            continue;
        const dsOptions = dataStructures[entry.filename];
        if (dsOptions.type === 'csv') {
            parseCSVTable(
                entry,
                result,
                dsOptions.key ?? entry.filename,
                dsOptions.csvOptions,
                dsOptions.columns,
                dsPromises,
            );
        }
        else if (dsOptions.type === 'xml') {
            parseDocument(
                entry,
                result,
                dsOptions.key ?? entry.filename,
                dsPromises,
                xmlParser,
            );
        }
        else if (dsOptions.type === 'ndjson') {
            parseNdjson(entry, result, dsOptions.key ?? entry.filename, dsPromises);
        }
        else if (dsOptions.type === 'graph') {
            graphPromises.push(
                csvToGraph(
                    entry,
                    graph,
                    dsOptions.csvOptions,
                    dsOptions.columns,
                    graphTypesToTableNames,
                    cachedIndices,
                    dsPromises,
                ),
            );
        }
    }
    await Promise.all(graphPromises);
    dsPromises[graphKey].resolve(graph);
    await Promise.all(Object.values(dsPromises).map(p => p.promise));
    return result;
}
