import { type CsvRow, type DatasourceData, type DatasourceSchema, type SimpleFileSchema, type TableSchema, type KindData, type KindSchema, type ParsedFileData } from '@/types/schema';
import { convertCsvToGraph } from './csvToGraphConverter';

export function convertKinds(parsed: ParsedFileData, schema: DatasourceSchema): DatasourceData {
    const files = schema.file.type === 'zip' ? schema.file.files : [ schema.file ];

    const relational: Record<string, CsvRow[]> = {};
    const multimodel: Record<string, KindData> = {};

    for (const kind of schema.common) {
        const table = convertToRelational(parsed, files, kind);
        relational[kind.key] = table;
        multimodel[kind.key] = table;
    }

    for (const kind of schema.relationalOnly)
        relational[kind.key] = convertToRelational(parsed, files, kind);

    for (const kind of schema.multimodelOnly)
        multimodel[kind.key] = convertToMultimodel(parsed, kind);

    return {
        parsed,
        relational,
        multimodel,
    };
}

function convertToRelational(parsed: ParsedFileData, files: SimpleFileSchema[], kind: TableSchema): CsvRow[] {
    const fromFile = files.find(f => f.key === kind.key);
    if (!fromFile)
        throw new Error(`Kind with key "${kind.key}" not found in any file.`);

    switch (fromFile.type) {
    case 'csv':
        return parsed[kind.key] as CsvRow[];
    case 'ndjson':
        // TODO
        return [];
    case 'xml':
        // TODO
        return [];
    }
}

function convertToMultimodel(parsed: ParsedFileData, kind: KindSchema): KindData {
    // Here we could also check the source file, however the problem is that it's usually multiple files whose keys are burried deep in the kind definition.
    // So let's just hope nobody tries to convert a document to a graph or vice versa.

    switch (kind.type) {
    case 'table':
        return parsed[kind.key];
    case 'graph':
        return convertCsvToGraph(parsed, kind);
    case 'document':
        // TODO
        return parsed[kind.key];
    }
}
