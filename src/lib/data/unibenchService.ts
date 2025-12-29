import { type Datasource } from './common';
import { type UnibenchData, unibenchFile } from './unibenchData';
import { MultiDirectedGraph } from 'graphology';
import { streamWithProgress } from '../dataloaders/utils';
import { type GraphologyGraph } from '@dortdb/lang-cypher';
import { parseFile } from '../dataloaders/parsers/fileParser';

const LS_KEY = 'indexeddb-used';
const DB_NAME = 'unibench';
const OBJ_STORE_NAME = 'unibench';
const DB_KEY = 'data';

function promisify<T extends IDBRequest>(req: T): Promise<T['result']>;
function promisify(req: IDBTransaction): Promise<IDBTransaction>;
function promisify(req: IDBTransaction | IDBRequest): Promise<any> {
    return new Promise((resolve, reject) => {
        if (req instanceof IDBTransaction)
            req.oncomplete = () => resolve(req);
        else
            req.onsuccess = () => resolve(req.result);

        req.onerror = () => reject(req.error);
    });
}

interface SerializedUnibenchData
    extends Omit<UnibenchData, 'socialNetwork' | 'invoices'> {
    invoices: string; // XML serialized as string
    socialNetwork: unknown; // Serialized MultiDirectedGraph
}

export type DataLocation = 'indexeddb' | 'memory' | 'remote';

export class UnibenchService implements Datasource {
    readonly name = 'Unibench';

    // private data = signal<UnibenchData>(null);
    /**
     * we do this because access to indexedDB requires user confirmation
     * and we don't want to ask the user for confirmation if we don't need it
     */
    // private dbPopulated = signal<boolean>(!!localStorage.getItem(LS_KEY));

    // public downloadProgress = signal<number>(undefined);
    // public dataLocation = computed<DataLocation>(() => {
    //     if (this.dbPopulated())
    //         return 'indexeddb';

    //     if (this.data())
    //         return 'memory';

    //     return 'remote';
    // });

    public async getDataIfAvailable(): Promise<UnibenchData | undefined> {
        // if (this.data())
        //     return this.data();

        return this.checkIndexedDB();
    }

    public async downloadData(): Promise<UnibenchData> {
        // this.downloadProgress.set(0);

        const response = await fetch('unibench.zip');
        // const response = await fetch('unibench-full.zip');
        const totalBytes = +response.headers.get('Content-Length')!;

        const stream = response.body!.pipeThrough(streamWithProgress((bytesRead: number) => {
            console.log('progress', bytesRead / totalBytes);
            // this.downloadProgress.set(bytesRead / totalBytes);
        }));

        const result = (await parseFile(stream, unibenchFile)) as UnibenchData;
        // this.data.set(result);

        return result;
    }

    private async checkIndexedDB(): Promise<UnibenchData | undefined> {
        // if (!this.dbPopulated())
        //     return undefined;
        let serialized: SerializedUnibenchData;
        try {
            const db = await promisify(indexedDB.open(DB_NAME, 2));
            const tx = db.transaction(OBJ_STORE_NAME, 'readonly');
            const store = tx.objectStore(OBJ_STORE_NAME);
            serialized = await promisify(store.get(DB_KEY));
        }
        catch (e) {
            console.error('Error accessing IndexedDB:', e);
            return undefined;
        }

        if (!serialized) {
            console.warn('No data found in IndexedDB');
            return undefined;
        }
        // this.data.set(this.deserializeData(serialized));
        // return this.data();
    }

    public async saveToIndexedDB(): Promise<void> {
        const dbReq = indexedDB.open(DB_NAME, 2);
        dbReq.onupgradeneeded = e => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (db.objectStoreNames.contains(OBJ_STORE_NAME))
                db.deleteObjectStore(OBJ_STORE_NAME);

            db.createObjectStore(OBJ_STORE_NAME);
        };
        const db = await promisify(dbReq);
        const tx = db.transaction(OBJ_STORE_NAME, 'readwrite');
        const store = tx.objectStore(OBJ_STORE_NAME);
        store.put(this.serializeData(), DB_KEY);
        await promisify(tx);
        localStorage.setItem(LS_KEY, 'true');
        // this.dbPopulated.set(true);
    }

    private serializeData(): SerializedUnibenchData {
        // const d = this.data();
        // return {
        //     ...d,
        //     socialNetwork: d.socialNetwork.export(),
        //     invoices: new XMLSerializer().serializeToString(d.invoices),
        // };

        throw new Error('Not implemented');
    }

    private deserializeData(serialized: SerializedUnibenchData): UnibenchData {
        return {
            ...serialized,
            socialNetwork: new MultiDirectedGraph().import(serialized.socialNetwork) as GraphologyGraph,
            invoices: new DOMParser().parseFromString(serialized.invoices, 'text/xml'),
        };
    }

    public async clear(): Promise<void> {
        const db = await promisify(indexedDB.open(DB_NAME, 2));
        const tx = db.transaction(OBJ_STORE_NAME, 'readwrite');
        const store = tx.objectStore(OBJ_STORE_NAME);
        store.clear();
        await promisify(tx);
        localStorage.removeItem(LS_KEY);
        // this.dbPopulated.set(false);
    }

}
