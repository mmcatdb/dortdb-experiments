import { type ColumnDef, ColumnType, type CsvParseOptions, type CsvRow, type CsvValue } from '@/types/schema';
import { parse, type parser } from 'csv/browser/esm';
import { iterStream, toArray } from '../utils';
import { type FileStream } from './fileParser';

export async function parseCsv(input: FileStream, options: CsvParseOptions, columns: ColumnDef[]): Promise<CsvRow[]> {
    const stream = input
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new CSVParser(columns, options));

    return toArray(iterStream(stream));
}

class CSVParser extends TransformStream<string, CsvRow> {
    constructor(columns: ColumnDef[], options: CsvParseOptions) {
        super(CSVParser.createTransformer({
            delimiter: options.separator,
            fromLine: options.hasHeader ? 2 : 1,
            escape: '\\',
            columns: columns,
            cast: createCastingFunction(columns),
        }));
    }

    private static createTransformer(options?: parser.Options): Transformer<string, CsvRow> {
        const parser = parse({ columns: true, ...options });
        return {
            start(controller) {
                parser.on('readable', () => {
                    let record;
                    while ((record = parser.read())) {
                        controller.enqueue(record);
                        record = parser.read();
                    }
                });
                parser.on('error', error => {
                    controller.error(error);
                });
                parser.on('end', () => {
                    controller.terminate();
                });
            },
            transform(chunk) {
                parser.write(chunk);
            },
            flush() {
                parser.end();
            },
        };
    }
}

type CastingFunction = (value: string, context: parser.CastingContext) => CsvValue;

function createCastingFunction(columns: ColumnDef[]): CastingFunction {
    const columnMap = new Map(columns.map(col => [ col.name, col.type ]));

    return (value: string, context: { column: number | string }) => {
        // Header is automatically skipped.
        // if (context.header)
        //     return value;

        if (value === '')
            return null;

        // Only strings are used for column names.
        const type = columnMap.get(context.column as string);

        switch (type) {
        case ColumnType.int:
        case ColumnType.float:
            return Number(value);
        case ColumnType.date:
            return new Date(value);
        default:
            return value;
        }
    };
}
