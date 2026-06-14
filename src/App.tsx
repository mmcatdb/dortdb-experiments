import { useState } from 'react';
import { Dortdb } from './types/databases/dortdb/dortdb';
import { DatabaseDisplay } from './components/DatabaseDisplay';
import { Sqljs } from './types/databases/sqljs/sqljs';
import { Alasql } from './types/databases/alasql/alasql';
import { DatasourceLoader } from './components/DatasourceLoader';
import type { DatasourceSchema, SchemaType } from './types/schema';
import { unibench } from './data/unibench';
import { tpch } from './data/tpch';
import { ExperimentsRunner } from './components/ExperimentsRunner';

export function App() {
    // Although we could create the databases as global singletons, this is more react-friendly and works correctly with hot-reloading.
    const [ dbs ] = useState(() => [
        new Dortdb(),
        new Sqljs(),
        new Alasql(),
    ]);

    const [ loadedSchema, setLoadedSchema ] = useState<DatasourceSchema>();

    return (<>
        <div className='mx-auto max-w-6xl py-12 space-y-8'>
            <DatasourceLoader schemas={schemas} loadedSchema={loadedSchema} setLoadedSchema={setLoadedSchema} dbs={dbs} schemaLabels={schemaLabels} />

            <ExperimentsRunner dbs={dbs} schemaType={loadedSchema?.type} />

            <DatabaseDisplay db={dbs[0]} loadedSchema={loadedSchema} schemaLabels={schemaLabels} />

            <DatabaseDisplay db={dbs[1]} loadedSchema={loadedSchema} schemaLabels={schemaLabels} />

            <DatabaseDisplay db={dbs[2]} loadedSchema={loadedSchema} schemaLabels={schemaLabels} />
        </div>
    </>);
}

const schemas = {
    [unibench[0].type]: unibench,
    [tpch[0].type]: tpch,
};

const schemaLabels: Record<SchemaType, string> = {
    [unibench[0].type]: 'Unibench',
    [tpch[0].type]: 'TPC-H',
};
