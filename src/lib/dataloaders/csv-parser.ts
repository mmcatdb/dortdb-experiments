import { type ColumnDef, ColumnType } from '@/types/data';
import { parse, type parser } from 'csv/browser/esm';

export type CSVParseOptions = {
    separator: string;
    hasHeader: boolean;
};

export class CSVParser extends TransformStream<string, ParsedCsvRow> {
    constructor(columns: ColumnDef[], options: CSVParseOptions) {
        super(CSVParser.createTransformer({
            delimiter: options.separator,
            fromLine: options.hasHeader ? 2 : 1,
            escape: '\\',
            columns: columns,
            cast: createCastFunction(columns),
        }));
    }

    private static createTransformer(options?: parser.Options): Transformer<string, ParsedCsvRow> {
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

export type ParsedCsvRow = Record<string, ParsedCsvValue>;

export type ParsedCsvValue = string | number | Date | null;

export type CastingFunction = (value: string, context: parser.CastingContext) => ParsedCsvValue;

function createCastFunction(columns: ColumnDef[]): CastingFunction {
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
        case ColumnType.real:
            return Number(value);
        case ColumnType.date:
            return new Date(value);
        default:
            return value;
        }
    };
}
