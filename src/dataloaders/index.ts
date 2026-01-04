import { convertKinds } from './converters/kindConverter';
import { parseFile } from './parsers/fileParser';
import { type DatasourceSchema, type DatasourceData } from '@/types/schema';
import { streamWithProgress, updateUI } from './utils';

export type Progress = {
    process: string;
    done?: number;
};

export async function loadDatasource(schema: DatasourceSchema, onProgress?: (progress: Progress) => void): Promise<DatasourceData> {
    onProgress?.({ process: 'Downloading' });

    const response = await fetch(schema.file.path);
    const totalBytes = +response.headers.get('Content-Length')!;

    let stream = response.body!;
    if (onProgress)
        stream = stream.pipeThrough(streamWithProgress(bytesRead => onProgress({ process: 'Parsing', done: bytesRead / totalBytes })));

    const parsed = await parseFile(stream, schema.file);

    onProgress?.({ process: 'Converting' });

    await updateUI();

    return convertKinds(parsed, schema);
}
