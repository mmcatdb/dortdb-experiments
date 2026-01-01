import { type Dispatch, useId, useState } from 'react';
import type { Database, DortdbLanguage, ExampleQuery } from '../types/database';
import { Button, RadioGroup, RadioGroupItem, Textarea } from './shadcn';
import { Label } from './shadcn/label';
import { cn } from './shadcn/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './shadcn/dropdown-menu';
import { ChevronDownIcon } from 'lucide-react';

type DatabaseDisplayProps = {
    db: Database;
    className?: string;
};

export function DatabaseDisplay({ db, className }: DatabaseDisplayProps) {
    const [ query, setQuery ] = useState(db.getDefaultQuery());
    const [ defaultLanguage, setDefaultLanguage ] = useState<DortdbLanguage>('sql');

    const [ isExecuting, setIsExecuting ] = useState(false);
    const [ result, setResult ] = useState<ReturnType<Database['query']>>();

    async function executeQuery() {
        if (!query.trim()) {
            console.log('Empty query, skipping execution.');
            setResult(undefined);
            return;
        }

        console.log('Executing query on db:', db);

        setIsExecuting(true);
        // TODO It would be really nice to do this truly async, e.g., in a web worker.
        const output = await new Promise<ReturnType<Database['query']>>(resolve => setTimeout(() => {
            const innerOutput = db.query(query, defaultLanguage);
            resolve(innerOutput);
        }));
        setIsExecuting(false);
        setResult(output);

        if (output.status)
            console.log(`Query success: ${output.data.length} rows`, output.data);
        else
            console.log('Query error:', output.error);
    }

    function selectExample({ query, defaultLanguage }: ExampleQuery) {
        setQuery(query);
        if (defaultLanguage)
            setDefaultLanguage(defaultLanguage);
    }

    const queryId = useId();
    const defaultLanguageId = useId();
    const examples = db.getExamples?.();

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
                        executeQuery();
                }}
            />

            {db.type === 'DortDB' && (<>
                <Label className='mt-2'>Default Language:</Label>
                <RadioGroup value={defaultLanguage} onValueChange={setDefaultLanguage as Dispatch<string>} className='mt-2 flex gap-6'>
                    {languages.map(language => (
                        <div key={language} className='flex items-center gap-3'>
                            <RadioGroupItem id={defaultLanguageId + language} value={language} />
                            <Label htmlFor={defaultLanguageId + language}>{language}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </>)}

            <div className='mt-2 flex items-center gap-2'>
                <Button variant='outline' onClick={executeQuery} disabled={isExecuting}>Execute</Button>

                {examples && (
                    <ExampleSelect options={examples} onSelect={selectExample} />
                )}
            </div>

            {result && (
                <div className='mt-2'>
                    <h3 className='text-md font-semibold'>Result:</h3>
                    <pre className={cn('px-2 py-1 rounded-md bg-accent text-sm text-wrap', !result.status && 'text-destructive')}>{result.status ? JSON.stringify(result.data, null, 4) : `Error: ${errorToString(result.error)}`}</pre>
                </div>
            )}
        </div>
    );
}

const languages: DortdbLanguage[] = [ 'sql', 'cypher', 'xquery' ];

function errorToString(error: unknown): string {
    if (error instanceof Error)
        return error.message;

    return JSON.stringify(error, null, 4);
}

type ExampleSelectProps = {
    options: ExampleQuery[];
    onSelect: Dispatch<ExampleQuery>;
};

function ExampleSelect({ options, onSelect }: ExampleSelectProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant='outline'>
                    Example <ChevronDownIcon size={16} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {options.map(example => (
                    <DropdownMenuItem key={example.name} onClick={() => onSelect(example)}>
                        {example.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
