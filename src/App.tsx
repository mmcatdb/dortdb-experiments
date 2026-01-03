import { Dortdb } from './types/databases/dortdb';
import { DatabaseDisplay } from './components/DatabaseDisplay';
import { Sqljs } from './types/databases/sqljs';
import { Alasql } from './types/databases/alasql';
import { DatasourceLoader } from './components/DatasourceLoader';
import { unibench } from './data/unibench';
import { useState } from 'react';

export function App() {
    // Although we could create the databases as global singletons, this is more react-friendly and works correctly with hot-reloading.
    const [ dbs ] = useState(() => [
        new Dortdb(),
        new Sqljs(),
        new Alasql(),
    ]);

    return (<>
        <div className='mx-auto max-w-6xl py-12 space-y-8'>
            <DatasourceLoader schema={unibench} dbs={dbs} />

            <DatabaseDisplay db={dbs[0]} />

            <DatabaseDisplay db={dbs[1]} />

            <DatabaseDisplay db={dbs[2]} />
        </div>
    </>);
}
