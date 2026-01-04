import { useId, useState } from 'react';
import { Dortdb } from './types/databases/dortdb';
import { DatabaseDisplay } from './components/DatabaseDisplay';
import { Sqljs } from './types/databases/sqljs';
import { Alasql } from './types/databases/alasql';
import { DatasourceLoader } from './components/DatasourceLoader';
import { unibenchFull, unibenchSample } from './data/unibench';
import { Label, Switch } from './components/shadcn';

export function App() {
    // Although we could create the databases as global singletons, this is more react-friendly and works correctly with hot-reloading.
    const [ dbs ] = useState(() => [
        new Dortdb(),
        new Sqljs(),
        new Alasql(),
    ]);

    const [ isFull, setIsFull ] = useState(false);
    const isFullId = useId();

    return (<>
        <div className='mx-auto max-w-6xl py-12 space-y-8'>
            <div className='flex items-center gap-4'>
                <DatasourceLoader schema={isFull ? unibenchFull : unibenchSample} dbs={dbs} />

                <div className='ml-auto flex items-center gap-2'>
                    <Switch id={isFullId} checked={isFull} onCheckedChange={setIsFull} />
                    <Label htmlFor={isFullId} className='cursor-pointer'>Use full dataset (takes like 10 minutes and 8 GB of RAM)</Label>
                </div>
            </div>

            <DatabaseDisplay db={dbs[0]} />

            <DatabaseDisplay db={dbs[1]} />

            <DatabaseDisplay db={dbs[2]} />
        </div>
    </>);
}
