import { type CsvRow, type DatasourceData, type DatasourceSchema, type KindData, type MultimodelKindSchema, type ParsedFileData, type RelationalKindSchema, type JsonObject } from '@/types/schema';
import { convertCsvToGraph } from './csvToGraphConverter';
import { convertJsonToCsv } from './jsonToCsvConverter';
import { convertXmlToJson } from './xmlToJsonConverter';

export function convertKinds(parsed: ParsedFileData, schema: DatasourceSchema): DatasourceData {
    const relational: Record<string, CsvRow[]> = {};
    const multimodel: Record<string, KindData> = {};

    for (const kind of schema.common) {
        const tables = convertToRelational(parsed, kind);
        Object.assign(relational, tables);
        Object.assign(multimodel, tables);
    }

    for (const kind of schema.relationalOnly)
        Object.assign(relational, convertToRelational(parsed, kind));

    for (const kind of schema.multimodelOnly)
        multimodel[kind.key] = convertToMultimodel(parsed, kind);

    return {
        parsed,
        relational,
        multimodel,
    };
}

function convertToRelational(parsed: ParsedFileData, kind: RelationalKindSchema): Record<string, CsvRow[]> {
    switch (kind.type) {
    case 'table':
        return { [kind.key]: parsed[kind.key] as CsvRow[] };
    case 'documentTables': {
        const input = kind.from === 'json' ? (parsed[kind.key] as JsonObject[]) : convertXmlToJson(parsed[kind.key] as Document);
        return convertJsonToCsv(input, kind);
    }
    }
}

function convertToMultimodel(parsed: ParsedFileData, kind: MultimodelKindSchema): KindData {
    // NICE_TO_HAVE Here we could also check the source file, however the problem is that it's usually multiple files whose keys are burried deep in the kind definition.
    // So let's just hope nobody tries to convert a document to a graph or vice versa.

    switch (kind.type) {
    case 'table':
        return parsed[kind.key];
    case 'graph':
        return convertCsvToGraph(parsed, kind);
    case 'document':
        return parsed[kind.key];
    }
}
