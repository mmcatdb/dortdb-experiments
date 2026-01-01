import { Dortdb } from './types/databases/dortdb';
import { DatabaseDisplay } from './components/DatabaseDisplay';
import { Sqljs } from './types/databases/sqljs';
import { Alasql } from './types/databases/alasql';
import { DatasourceLoader } from './components/DatasourceLoader';
import { unibench } from './data/unibench';

const dortdb = new Dortdb();

const sqljs = new Sqljs();

const alasql = new Alasql();

const dbs = [ dortdb, sqljs, alasql ];

export function App() {
    return (<>
        <div className='mx-auto max-w-6xl py-12 space-y-8'>
            <DatabaseDisplay db={dortdb} />

            <DatabaseDisplay db={sqljs} />

            <DatabaseDisplay db={alasql} />

            <DatasourceLoader schema={unibench} dbs={dbs} />
        </div>
    </>);
}
