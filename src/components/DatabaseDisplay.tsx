import { useId, useMemo, useState } from 'react';
import type { Database } from '../types/common';
import { Button, Textarea } from './shadcn';
import { Label } from './shadcn/label';
import { cn } from './shadcn/utils';

type DatabaseDisplayProps = {
    db: Database;
    className?: string;
};

export function DatabaseDisplay({ db, className }: DatabaseDisplayProps) {
    const [ query, setQuery ] = useState(`SELECT * FROM hello WHERE a = 1 AND b = 'world'`);
    const [ executedQuery, setExecutedQuery ] = useState<string>();

    const result = useMemo(() => executedQuery && db.query(executedQuery), [ db, executedQuery ]);

    function run() {
        setExecutedQuery(query);
    }

    const queryId = useId();

    return (
        <div className={className}>
            <h2 className='mb-2 text-lg font-semibold'>{db.type} Example</h2>

            <Label htmlFor={queryId}>Query:</Label>
            <Textarea
                className='mt-2 font-mono'
                id={queryId}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter' && e.ctrlKey)
                        run();
                }}
            />

            <Button className='mt-2' variant='outline' onClick={run}>Execute</Button>

            {result && (
                <div className='mt-2'>
                    <h3 className='text-md font-semibold'>Result:</h3>
                    <pre className={cn('px-2 py-1 rounded-md bg-accent text-sm text-wrap', !result.status && 'text-destructive')}>{result.status ? JSON.stringify(result.data, null, 4) : `Error: ${errorToString(result.error)}`}</pre>
                </div>
            )}
        </div>
    );
}

function errorToString(error: unknown): string {
    if (error instanceof Error)
        return error.message;

    return JSON.stringify(error, null, 4);
}
