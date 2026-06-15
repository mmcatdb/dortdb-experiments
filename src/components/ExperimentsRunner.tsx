import { useState } from 'react';
import { type Database, type ExampleQuery } from '@/types/database';
import { Button, Input, Label, ScrollArea } from './shadcn';
import { printProgress, type Progress, updateUI } from '@/dataloaders/utils';
import { type SchemaType } from '@/types/schema';
import { CopyToClipboardButton, SpinnerIcon } from './Common';
import { CheckIcon } from 'lucide-react';

type ExperimentsRunnerProps = {
    dbs: Database[];
    schemaType: SchemaType | undefined;
    className?: string;
};

export function ExperimentsRunner({ dbs, schemaType, className }: ExperimentsRunnerProps) {
    const [ rawExecutionsPerQuery, setRawExecutionsPerQuery ] = useState('40');
    const executionsPerQuery = parseInt(rawExecutionsPerQuery, 10);
    const isValidInput = !!schemaType && !isNaN(executionsPerQuery) && executionsPerQuery > 0;

    const [ isExecuting, setIsExecuting ] = useState(false);
    const [ progress, setProgress ] = useState<Progress>();
    const [ results, setResults ] = useState<Record<string, QueryResult[]>>();

    async function executeQueries() {
        if (!isValidInput)
            return;

        setIsExecuting(true);
        setResults(undefined);

        await updateUI();
        // For some reason, this has to be done twice and we don't really have time to investigate why.
        await updateUI();

        const results: Record<string, QueryResult[]> = {};

        for (const db of dbs) {
            const process = `Running tests on ${db.type}`;
            console.log(process);
            results[db.type] = await testDatabase(db, schemaType, executionsPerQuery, done => {
                setProgress({ process, done });
                return updateUI();
            });
            console.log(`Results for ${db.type}:`, results[db.type]);
        }

        setIsExecuting(false);
        setResults(results);
    }

    return (
        <div className={className}>
            <div className='flex items-end gap-4'>
                <Label className='block'>
                    <div className='mb-2'>
                        Executions per query
                    </div>
                    <Input type='number' value={rawExecutionsPerQuery} onChange={e => setRawExecutionsPerQuery(e.target.value)} className='w-40' />
                </Label>

                <div className='flex items-center gap-4'>
                    <Button variant='outline' onClick={executeQueries} disabled={isExecuting || !isValidInput}>Run tests</Button>

                    {isExecuting ? (
                        <div className='flex items-center gap-3 text-blue-500'>
                            <SpinnerIcon />

                            {progress && (
                                <div>{printProgress(progress)}</div>
                            )}
                        </div>
                    ) : results && (
                        <div className='flex items-center gap-2 text-green-500'>
                            <CheckIcon /> Tests completed
                        </div>
                    )}
                </div>
            </div>

            {results && (
                <div className='mt-4 space-y-4'>
                    {Object.entries(results).map(([ dbType, dbResults ]) => (
                        <div key={dbType}>
                            <h3 className='text-md font-semibold'>{dbType}</h3>

                            <ScrollArea className='mt-1 max-h-100 flex flex-col rounded-md bg-accent'>
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

async function testDatabase(db: Database, schemaType: SchemaType, executionsPerQuery: number, onProgress?: (result: number) => Promise<void>): Promise<QueryResult[]> {
    const results: QueryResult[] = [];
    const examples = db.getExamples()[schemaType].filter(example => !example.excludeFromTests);

    for (const example of examples) {
        try {
            console.log(`Executing query "${example.name}"`);
            const result = testQuery(db, example, executionsPerQuery);
            console.log('Result', JSON.stringify(result));
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

        await onProgress?.(results.length / examples.length);
    }

    return results;
}

function testQuery(db: Database, example: ExampleQuery, executionsPerQuery: number): QueryResult {
    const executionTimesMs: number[] = [];

    for (let i = 0; i < executionsPerQuery; i++) {
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
