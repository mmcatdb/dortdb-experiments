import { convertKinds } from './converters/kindConverter';
import { parseFile } from './parsers/fileParser';
import { type DatasourceSchema, type DatasourceData } from '@/types/schema';
import { streamWithProgress, updateUI } from './utils';
import { filterFile } from './fileFilter';

export type Progress = {
    process: string;
    done?: number;
};

export async function loadDatasource(schema: DatasourceSchema, onProgress?: (progress: Progress) => void): Promise<DatasourceData> {
    onProgress?.({ process: 'Downloading' });

    const response = await fetch(schema.file.path);
    const totalBytes = +response.headers.get('Content-Length')!;

    let stream = response.body!;
    if (onProgress) {
        stream = stream.pipeThrough(streamWithProgress(bytesRead => {
            const done = bytesRead / totalBytes;
            onProgress(done === 1 ? { process: 'Parsing' } : { process: 'Reading', done });
        }));
    }

    const parsed = await parseFile(stream, schema.file);

    onProgress?.({ process: 'Filtering' });
    await updateUI();

    console.log('filtering');
    const filtered = filterFile(parsed, schema);

    onProgress?.({ process: 'Converting' });
    await updateUI();

    console.log('converting');
    return convertKinds(filtered, schema);
}
