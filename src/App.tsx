import { useId, useState } from 'react';
import { Dortdb } from './types/databases/dortdb/dortdb';
import { DatabaseDisplay } from './components/DatabaseDisplay';
import { Sqljs } from './types/databases/sqljs/sqljs';
import { Alasql } from './types/databases/alasql/alasql';
import { DatasourceLoader } from './components/DatasourceLoader';
import { unibenchFull, unibenchSample } from './data/unibench';
import { Label, Switch } from './components/shadcn';
import type { SchemaType } from './types/schema';
import { tpch } from './data/tpch';

export function App() {
    // Although we could create the databases as global singletons, this is more react-friendly and works correctly with hot-reloading.
    const [ dbs ] = useState(() => [
        new Dortdb(),
        new Sqljs(),
        new Alasql(),
    ]);

    const [ isLoaded, setIsLoaded ] = useState(false);
    const [ isFull, setIsFull ] = useState(false);
    const isFullId = useId();


    return (<>
        <div className='mx-auto max-w-6xl py-12 space-y-8'>
            <div className='space-y-2'>
                <div className='flex items-center gap-4'>
                    <DatasourceLoader schema={isFull ? unibenchFull : unibenchSample} dbs={dbs} onLoaded={() => setIsLoaded(true)} />

                    {!isLoaded && (
                        <Label htmlFor={isFullId} className='ml-auto cursor-pointer flex items-center gap-2'>
                            <Switch id={isFullId} checked={isFull} onCheckedChange={setIsFull} />
                            <div>Use full dataset (takes like 10 minutes and 8 GB of RAM)</div>
                        </Label>
                    )}
                </div>

                <DatasourceLoader schema={tpch} dbs={dbs} />
            </div>

            <DatabaseDisplay db={dbs[0]} schemaLabels={schemaLabels} />

            <DatabaseDisplay db={dbs[1]} schemaLabels={schemaLabels} />

            <DatabaseDisplay db={dbs[2]} schemaLabels={schemaLabels} />
        </div>
    </>);
}

const schemaLabels: Record<SchemaType, string> = {
    [unibenchSample.type]: 'Unibench',
    [tpch.type]: 'TPC-H',
};
