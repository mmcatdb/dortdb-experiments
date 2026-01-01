import { Dortdb } from './types/databases/dortdb';
import { DatabaseDisplay } from './components/DatabaseDisplay';
import { Sqljs } from './types/databases/sqljs';
import { Alasql } from './types/databases/alasql';
import { DatasourceLoader } from './components/DatasourceLoader';
import { type Database, type TableData, type TableSchema } from './types/database';

/** @deprecated */
export function setupDatabase(db: Database) {
    db.setSchema(DB_SCHEMA);

    for (const tableName in DB_DATA)
        db.setData(tableName, DB_DATA[tableName]);
}

const DB_SCHEMA: TableSchema[] = [ {
    name: 'hello',
    columns: [
        { name: 'a', type: 'int' },
        { name: 'b', type: 'char' },
    ],
} ];

const DB_DATA: Record<string, TableData> = {
    hello: [
        [ 0, 'hello' ],
        [ 1, 'world' ],
    ],
};

const dortdb = new Dortdb();

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
