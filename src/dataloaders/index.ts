import { convertKinds } from './converters/kindConverter';
import { parseFile } from './parsers/fileParser';
import { type DatasourceSchema } from '@/types/schema';
import { streamWithProgress } from './utils';

export async function loadDatasource<TData>(schema: DatasourceSchema, onProgress?: (progress: number) => void): Promise<TData> {
    const response = await fetch(schema.file.path);
    const totalBytes = +response.headers.get('Content-Length')!;

    let stream = response.body!;
    if (onProgress)
        stream = stream.pipeThrough(streamWithProgress(bytesRead => onProgress(bytesRead / totalBytes)));

    const parsed = await parseFile(stream, schema.file);

    const kinds = convertKinds(parsed, schema.kinds);

    return kinds as TData;
}
