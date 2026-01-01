import { Button } from './shadcn';
import { loadDatasource } from '@/dataloaders';
import { type Database } from '@/types/database';
import { useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { type DatasourceSchema } from '@/types/schema';

type DatasourceLoaderProps = {
    schema: DatasourceSchema;
    dbs: Database[];
};

export function DatasourceLoader({ schema, dbs }: DatasourceLoaderProps) {
    const [ data, setData ] = useState<Record<string, unknown>>();

    async function loadData() {
        console.log(`Loading ${schema.label} data (${schema.file.path}) ...`);

        const result = await loadDatasource(schema, progress => console.log('Progress:', progress));

        console.log('Data loaded', result);

        for (const db of dbs)
            db.setData(schema, result);

        setData(result);
    };

    return (
        <div className='py-4 flex items-center gap-4'>
            <Button onClick={loadData} disabled={!!data}>
                Load {schema.label} Data
            </Button>

            {data && (
                <div className='flex gap-2 text-green-500'>
                    <CheckIcon /> {schema.label} data loaded
                </div>
            )}
        </div>
    );
}
