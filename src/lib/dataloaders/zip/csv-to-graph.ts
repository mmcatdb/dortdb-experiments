import { ColumnType, type ColumnDef } from '@/types/data';
import { iterStream } from '../utils';
import { createCsvStream, type CSVParseOptions } from './parse-csv-table';
import { type StreamedEntry } from './zip-extractor';
import { type MultiDirectedGraph } from 'graphology';
import { type ParsedCsvRow } from '../csv-parser';

/**
 * @param indexedTableNames - maps node types to table names
 * @param cachedIndices - maps table names to the table index
 */
export async function csvToGraph(
    entry: StreamedEntry,
    graph: MultiDirectedGraph,
    options: CSVParseOptions,
    columns: ColumnDef[],
    indexedTableNames: Record<string, string> = {},
    cachedIndices: Record<string, Map<string | number, Record<string, any>>> = {},
    dsPromises: Record<string, { promise: Promise<any[]> }> = {},
) {
    const fromColumn = columns.find(col => col.graphType === 'from');
    const toColumn = columns.find(col => col.graphType === 'to');
    if (!fromColumn || !toColumn)
        throw new Error('CSV to graph conversion requires "from" and "to" column definitions.');
    if (fromColumn.type !== ColumnType.int || toColumn.type !== ColumnType.int)
        throw new Error('CSV to graph conversion requires "from" and "to" columns to be of type int.');

    const edgeProps = columns.filter(col => col.name !== fromColumn.name && col.name !== toColumn.name).map(col => col.name);

    const [ from, edgeType, to ] = entry.filename!.split('/').pop()!.split('_');

    const fromIndex = from in indexedTableNames
        ? await getTableIndex(indexedTableNames[from], dsPromises, cachedIndices)
        : null;
    const toIndex = to in indexedTableNames
        ? await getTableIndex(indexedTableNames[to], dsPromises, cachedIndices)
        : null;

    const stream = createCsvStream(entry, options, columns);
    const iter = iterStream(stream)[ Symbol.asyncIterator ]();

    for await (const row of iter) {
        const rowFromId = row[fromColumn.name] as number;
        const rowToId = row[toColumn.name] as number;

        const fromNode = from + rowFromId;
        const toNode = to + rowToId;

        if (fromIndex) {
            if (!graph.hasNode(fromNode)) {
                const fromRow = fromIndex.get(rowFromId) ?? { id: rowFromId };
                fromRow['labels'] = [ from ];
                graph.addNode(fromNode, fromRow);
            }
        }
        else {
            graph.mergeNode(fromNode, { id: rowFromId, labels: [ from ] });
        }

        if (toIndex) {
            if (!graph.hasNode(toNode)) {
                const toRow = toIndex.get(rowToId) ?? { id: rowToId };
                toRow['labels'] = [ to ];
                graph.addNode(toNode, toRow);
            }
        }
        else {
            graph.mergeNode(toNode, { id: rowToId, labels: [ to ] });
        }

        const edgeData: ParsedCsvRow = { type: edgeType };
        for (const col of edgeProps)
            edgeData[col] = row[col];

        graph.addEdge(fromNode, toNode, edgeData);
    }
}

async function getTableIndex(
    table: string,
    dsPromises: Record<string, { promise: Promise<any[]> }>,
    cachedIndices: Record<string, Map<string | number, Record<string, any>>>,
    column = 'id',
): Promise<Map<string | number, Record<string, any>>> {
    const ds = await dsPromises[table].promise;
    if (cachedIndices[table])
        return cachedIndices[table];

    const index = new Map<string | number, Record<string, any>>();
    for (const row of ds)
        index.set(row[column], row);

    cachedIndices[table] = index;
    return index;
}
