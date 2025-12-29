import { ColumnType, type ColumnDef } from '@/types/data';
import { type MultiDirectedGraph } from 'graphology';
import { type CsvRow } from '../parsers/csvParser';

/**
 * @param indexedTableNames - maps node types to table names
 * @param cachedIndices - maps table names to the table index
 */
export async function csvToGraph(
    resultKey: string,
    fromKey: string,
    toKey: string,
    columns: ColumnDef[],
    graph: MultiDirectedGraph,
    cachedIndices: Record<string, GraphIndex> = {},
    dsPromises: Record<string, { promise: Promise<any[]> }> = {},
) {
    const fromColumn = columns.find(col => col.graphType === 'from');
    const toColumn = columns.find(col => col.graphType === 'to');
    if (!fromColumn || !toColumn)
        throw new Error('CSV to graph conversion requires "from" and "to" column definitions.');
    if (fromColumn.type !== ColumnType.int || toColumn.type !== ColumnType.int)
        throw new Error('CSV to graph conversion requires "from" and "to" columns to be of type int.');

    const edgeProps = columns.filter(col => col.name !== fromColumn.name && col.name !== toColumn.name).map(col => col.name);

    const [ fromIndex, toIndex, rows ] = await Promise.all([
        getTableIndex(fromKey, dsPromises, cachedIndices),
        getTableIndex(toKey, dsPromises, cachedIndices),
        dsPromises[resultKey].promise,
    ]);

    console.log({ fromIndex, toIndex, rowsLength: rows.length });

    for (const row of rows) {
        const fromId = row[fromColumn.name] as number;
        const toId = row[toColumn.name] as number;

        const fromNodeId = fromKey + fromId;
        const toNodeId = toKey + toId;

        if (fromIndex) {
            if (!graph.hasNode(fromNodeId)) {
                const fromRow = fromIndex.get(fromId) ?? { id: fromId };
                fromRow.labels = [ fromKey ];
                graph.addNode(fromNodeId, fromRow);
            }
        }
        else {
            graph.mergeNode(fromNodeId, { id: fromId, labels: [ fromKey ] });
        }

        if (toIndex) {
            if (!graph.hasNode(toNodeId)) {
                const toRow = toIndex.get(toId) ?? { id: toId };
                toRow.labels = [ toKey ];
                graph.addNode(toNodeId, toRow);
            }
        }
        else {
            graph.mergeNode(toNodeId, { id: toId, labels: [ toKey ] });
        }

        const edgeData: CsvRow = { type: resultKey };
        for (const col of edgeProps)
            edgeData[col] = row[col];

        graph.addEdge(fromNodeId, toNodeId, edgeData);
    }
}

export type GraphIndex = Map<GraphId, GraphNode>;

type GraphId = string | number;

export type GraphNode = CsvRow & { id?: GraphId, labels?: string[] };

async function getTableIndex(
    table: string,
    dsPromises: Record<string, { promise: Promise<any[]> }>,
    cachedIndices: Record<string, GraphIndex>,
    column = 'id',
): Promise<GraphIndex | undefined> {
    if (!(table in dsPromises))
        return undefined;

    const ds = await dsPromises[table].promise;
    if (cachedIndices[table])
        return cachedIndices[table];

    const index = new Map<GraphId, GraphNode>();
    for (const row of ds)
        index.set(row[column], row);

    cachedIndices[table] = index;
    return index;
}
