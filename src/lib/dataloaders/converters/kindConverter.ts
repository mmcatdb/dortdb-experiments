import { type KindSchema, type ParsedFileData } from '../schema';
import { convertCsvToGraph } from './csvToGraphConverter';

export function convertKinds(data: ParsedFileData, kinds: KindSchema[]): Record<string, unknown> {
    const output: Record<string, unknown> = {};

    for (const kind of kinds)
        output[kind.key] = convertKind(data, kind);

    return output;
}

function convertKind(data: ParsedFileData, kind: KindSchema): unknown {
    switch (kind.type) {
    case 'table':
        return data[kind.key];
    case 'graph':
        return convertCsvToGraph(data, kind);
    case 'document':
        // TODO
        return data[kind.key];
    }
}
