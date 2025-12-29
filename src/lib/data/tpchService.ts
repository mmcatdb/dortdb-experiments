import { type Datasource } from './common';
import { type TpchData, tpchFile } from './tpchData';
import { streamWithProgress } from '../dataloaders/utils';
import { parseFile } from '../dataloaders/parsers/fileParser';

export class TpchService implements Datasource{
    readonly name = 'TPCH';

    // private data = signal<TpchData>(null);

    public async downloadData(): Promise<TpchData> {
        const response = await fetch('tpch.zip');
        const totalBytes = +response.headers.get('Content-Length')!;

        const stream = response.body!.pipeThrough(streamWithProgress((bytesRead: number) => {
            console.log('progress', bytesRead / totalBytes);
        }));

        const result = (await parseFile(stream, tpchFile)) as TpchData;
        // this.data.set(result);

        return result;
    }
}
