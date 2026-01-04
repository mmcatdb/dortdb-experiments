import { type Dispatch, useId, useState } from 'react';
import type { Database, DortdbLanguage, ExampleQuery } from '@/types/database';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Label, RadioGroup, RadioGroupItem, Textarea } from './shadcn';
import { ChevronDownIcon } from 'lucide-react';
import { plural, timeQuantity } from './utils';
import { updateUI } from '@/dataloaders/utils';

type DatabaseDisplayProps = {
    db: Database;
    className?: string;
};

export function DatabaseDisplay({ db, className }: DatabaseDisplayProps) {
    const [ query, setQuery ] = useState(db.getDefaultQuery());
    const [ defaultLanguage, setDefaultLanguage ] = useState<DortdbLanguage>('sql');

    const [ isExecuting, setIsExecuting ] = useState(false);
    const [ isExpanded, setIsExpanded ] = useState(false);
    const [ result, setResult ] = useState<QueryResult>();

    async function executeQuery() {
        if (!query.trim()) {
            console.log('Empty query, skipping execution.');
            setResult(undefined);
            return;
        }

        console.log('Executing query on db:', db);

        setIsExecuting(true);

        await updateUI();

        const start = performance.now();
        const output = db.query(query, defaultLanguage);
        const end = performance.now();
        const executionTimeMs = end - start;

        if (output.status)
            console.log(`Query success: ${output.data.length} rows in ${executionTimeMs} ms`, output.data);
        else
            console.log('Query error:', output.error);

        setIsExecuting(false);
        setResult({ output, executionTimeMs });
        setIsExpanded(false);
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

                {result?.output?.status && result.output.data.length > NOT_EXPANDED_ROWS && (
                    !isExpanded ? (
                        <Button variant='outline' onClick={() => setIsExpanded(true)}>
                            {`Show all ${result.output.data.length} ${plural(result.output.data.length, 'row')}`}
                        </Button>
                    ) : (
                        <Button variant='outline' onClick={() => setIsExpanded(false)}>
                            Show less
                        </Button>
                    )
                )}
            </div>

            {result && (
                <div className='mt-2 space-y-1'>
                    <div className='flex items-baseline gap-4'>
                        <h3 className='text-md font-semibold'>Result:</h3>

                        {result.output.status && (
                            <div className='text-sm font-medium text-muted-foreground'>
                                {/* Tenths of milliseconds is probably the best we can do here. */}
                                {`${result.output.data.length} ${plural(result.output.data.length, 'row')} in ${timeQuantity.prettyPrint(result.executionTimeMs)}`}
                            </div>
                        )}
                    </div>

                    {result.output.status ? (<>
                        {(isExpanded ? result.output.data : result.output.data.slice(0, NOT_EXPANDED_ROWS)).map((row, index) => (
                            <pre key={index} className='px-2 py-1 rounded-md bg-accent text-sm text-wrap'>
                                {JSON.stringify(row, null, 4)}
                            </pre>
                        ))}

                        {result.output.data.length > NOT_EXPANDED_ROWS && (
                            !isExpanded ? (
                                <Button variant='outline' onClick={() => setIsExpanded(true)}>
                                    {`Show all ${result.output.data.length} ${plural(result.output.data.length, 'row')}`}
                                </Button>
                            ) : (
                                <Button variant='outline' onClick={() => setIsExpanded(false)}>
                                    Show less
                                </Button>
                            )
                        )}
                    </>) : (
                        <pre className='px-2 py-1 rounded-md bg-accent text-sm text-wrap text-destructive'>Error: {errorToString(result.output.error)}</pre>
                    )}
                </div>
            )}
        </div>
    );
}

type QueryResult = {
    output: ReturnType<Database['query']>;
    executionTimeMs: number;
};

const NOT_EXPANDED_ROWS = 1;

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
