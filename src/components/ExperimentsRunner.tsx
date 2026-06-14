import { useState } from 'react';
import { type Database, type ExampleQuery } from '@/types/database';
import { Button, ScrollArea } from './shadcn';
import { updateUI } from '@/dataloaders/utils';
import { type SchemaType } from '@/types/schema';
import { CopyToClipboardButton } from './Common';

type ExperimentsRunnerProps = {
    dbs: Database[];
    schemaType: SchemaType | undefined;
    className?: string;
};

export function ExperimentsRunner({ dbs, schemaType, className }: ExperimentsRunnerProps) {
    const [ isExecuting, setIsExecuting ] = useState(false);
    const [ results, setResults ] = useState<Record<string, QueryResult[]>>();

    async function executeQueries() {
        if (!schemaType)
            return;

        setIsExecuting(true);
        setResults(undefined);

        await updateUI();
        // For some reason, this has to be done twice and we don't really have time to investigate why.
        await updateUI();

        const results: Record<string, QueryResult[]> = {};

        for (const db of dbs) {
            console.log(`Running tests on ${db.type}`);
            results[db.type] = testDatabase(db, schemaType);
            console.log(`Results for ${db.type}:`, results[db.type]);
        }

        setIsExecuting(false);
        setResults(results);
    }

    return (
        <div className={className}>
            <div>
                <Button variant='outline' onClick={executeQueries} disabled={isExecuting || !schemaType}>Run tests</Button>

                {isExecuting && (
                    <div className='ml-4 inline-block text-blue-500'>
                        Executing queries...
                    </div>
                )}
            </div>

            {results && (
                <div className='mt-4 space-y-4'>
                    {Object.entries(results).map(([ dbType, dbResults ]) => (
                        <div key={dbType}>
                            <h3 className='text-lg font-semibold'>{dbType}</h3>

                            <ScrollArea className='max-h-100 flex flex-col rounded-md bg-accent'>
                                <pre className='px-2 py-1 text-sm text-wrap'>
                                    {JSON.stringify(dbResults, undefined, 4)}
                                </pre>
                                <CopyToClipboardButton text={() => JSON.stringify(dbResults, undefined, 4)} className='absolute top-2 right-2' />
                            </ScrollArea>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

type QueryResult = {
    name: string;
    executionTimesMs: number[];
    error?: string;
};

const EXECUTION_COUNTS = 40;

function testDatabase(db: Database, schemaType: SchemaType): QueryResult[] {
    const results: QueryResult[] = [];

    for (const example of db.getExamples()[schemaType]) {
        try {
            console.log(`Executing query "${example.name}"`);
            const result = testQuery(db, example);
            console.log('Result', result);
            results.push(result);
        }
        catch (error) {
            console.error(`Error executing query "${example.name}" on ${db.type}:`, error);
            results.push({
                name: example.name,
                executionTimesMs: [],
                error: (error as Error).message,
            });
        }
    }

    return results;
}

function testQuery(db: Database, example: ExampleQuery): QueryResult {
    const executionTimesMs: number[] = [];

    for (let i = 0; i < EXECUTION_COUNTS; i++) {
        const start = performance.now();
        const output = db.query(example.query, example.defaultLanguage);
        const end = performance.now();

        if (!output.status)
            throw new Error(`Query "${example.name}" failed: ${output.error}`);

        executionTimesMs.push(end - start);
    }

    return {
        name: example.name,
        executionTimesMs,
    };
}
