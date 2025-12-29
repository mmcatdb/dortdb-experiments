import { type Datasource } from './common';
import { type TpchData, tpchFiles } from './tpchData';
import { extractArchive } from '../dataloaders/zip/zip-extractor';
import { iterStream } from '../dataloaders/utils';

export class TpchService implements Datasource{
    readonly name = 'TPCH';

    // private data = signal<TpchData>(null);

    public downloadData(): Promise<TpchData> {
        let bytesRead = 0;
        const stream = async function* (this: TpchService) {
            const resp = await fetch('tpch.zip');
            const rawData = new ArrayBuffer(+resp.headers.get('Content-Length')!);
            const rawDataView = new Uint8Array(rawData);
            for await (const chunk of iterStream(resp.body!)) {
                rawDataView.set(chunk, bytesRead);
                bytesRead += chunk.length;
                yield chunk;
            }
        }.bind(this)();
        return this.processArchive(stream);
    }

    private async processArchive(archive: AsyncIterable<Uint8Array<ArrayBufferLike>>): Promise<TpchData> {
        console.log('Processing TPCH archive...');
        const result = (await extractArchive(archive, tpchFiles)) as TpchData;

        console.log('TPCH archive processed successfully.');

        // this.data.set(result);
        return result;
    }
}
