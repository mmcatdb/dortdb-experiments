import { Button } from './shadcn';
import { loadDatasource } from '@/lib/dataloaders/datasource';
import { unibenchSchema } from '@/lib/data/unibenchData';
import { type Database } from '@/types/common';
import { useState } from 'react';
import { CheckIcon } from 'lucide-react';

type DatasourceLoaderProps = {
    dbs: Database[];
};

export function DatasourceLoader({ dbs }: DatasourceLoaderProps) {
    const [ data, setData ] = useState<Record<string, unknown>>();

    async function loadData() {
        console.log('Loading Unibench data...');

        const result = await loadDatasource<Record<string, unknown>>(unibenchSchema, progress => console.log('Progress:', progress));

        console.log('Data loaded', result);

        for (const db of dbs) {
            // TODO Just a temporary workaround to test data loading with dortdb.
            if (db.setRawData) {
                for (const tableName in result)
                    db.setRawData(tableName, result[tableName]);
            }
        }

        setData(result);
    };

    return (
        <div className='py-4 flex items-center gap-4'>
            <Button onClick={loadData} disabled={!!data}>
                Load Unibench Data
            </Button>

            {data && (
                <div className='flex gap-2 text-green-500'>
                    <CheckIcon /> Unibench data loaded
                </div>
            )}
        </div>
    );
}
