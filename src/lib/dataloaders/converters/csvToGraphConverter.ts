import { MultiDirectedGraph } from 'graphology';
import { type CsvRow } from '../parsers/csvParser';
import { type GraphSchema, type EdgeSchema, type ParsedFileData } from '../schema';

export function convertCsvToGraph(input: ParsedFileData, schema: GraphSchema): MultiDirectedGraph {
    const graph = new MultiDirectedGraph();
    const indexCache: Record<string, GraphIndex> = {};

    for (const edgeSchema of schema.edges)
        addEdgesForKind(input, indexCache, graph, edgeSchema);

    return graph;
}

function addEdgesForKind(input: ParsedFileData, indexCache: Record<string, GraphIndex>, graph: MultiDirectedGraph, schema: EdgeSchema) {
    const { key, props, from, to } = schema;

    const fromIndex = from.source && getTableIndex(input, indexCache, from.source.key, from.source.column);
    const toIndex = to.source && getTableIndex(input, indexCache, to.source.key, to.source.column);
    const rows = input[key] as CsvRow[];

    for (const row of rows) {
        const fromId = row[from.idColumn] as number;
        const toId = row[to.idColumn] as number;

        const fromNodeId = from.label + fromId;
        const toNodeId = to.label + toId;

        if (fromIndex) {
            if (!graph.hasNode(fromNodeId)) {
                const fromRow = fromIndex.get(fromId) ?? { id: fromId };
                fromRow.labels = [ from.label ];
                graph.addNode(fromNodeId, fromRow);
            }
        }
        else {
            graph.mergeNode(fromNodeId, { id: fromId, labels: [ from.label ] });
        }

        if (toIndex) {
            if (!graph.hasNode(toNodeId)) {
                const toRow = toIndex.get(toId) ?? { id: toId };
                toRow.labels = [ to.label ];
                graph.addNode(toNodeId, toRow);
            }
        }
        else {
            graph.mergeNode(toNodeId, { id: toId, labels: [ to.label ] });
        }

        const edgeData: CsvRow = { type: key };
        for (const col of props)
            edgeData[col] = row[col];

        graph.addEdge(fromNodeId, toNodeId, edgeData);
    }
}

export type GraphIndex = Map<GraphId, GraphNode>;

type GraphId = string | number;

export type GraphNode = CsvRow & { id?: GraphId, labels?: string[] };

function getTableIndex(input: ParsedFileData, indexCache: Record<string, GraphIndex>, key: string, column: string): GraphIndex | undefined {
    if (!(key in input))
        return undefined;

    const rows = input[key] as CsvRow[];
    if (indexCache[key])
        return indexCache[key];

    const index = new Map<GraphId, GraphNode>();
    for (const row of rows)
        index.set(row[column] as GraphId, row);

    indexCache[key] = index;
    return index;
}
