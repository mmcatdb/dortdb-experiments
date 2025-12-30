import { Dortdb } from './types/dortdb';
import { setupDatabase } from './types/data';
import { DatabaseDisplay } from './components/DatabaseDisplay';
import { Sqljs } from './types/sqljs';
import { Alasql } from './types/alasql';
import { DatasourceLoader } from './components/DatasourceLoader';

const dortdb = new Dortdb();
setupDatabase(dortdb);

const sqljs = new Sqljs();
setupDatabase(sqljs);

const alasql = new Alasql();
setupDatabase(alasql);

const dbs = [ dortdb ];

export function App() {
    return (<>
        <div className='mx-auto max-w-6xl py-12 space-y-8'>
            <DatabaseDisplay db={dortdb} />

            <DatabaseDisplay db={sqljs} />

            <DatabaseDisplay db={alasql} />

            <DatasourceLoader dbs={dbs} />
        </div>
    </>);
}
