import { Button } from './shadcn';
import { loadDatasource, type Progress } from '@/dataloaders';
import { type Database } from '@/types/database';
import { useState } from 'react';
import { CheckIcon, TriangleAlertIcon } from 'lucide-react';
import { type DatasourceSchema } from '@/types/schema';
import { updateUI } from '@/dataloaders/utils';

type DatasourceLoaderProps = {
    schema: DatasourceSchema;
    dbs: Database[];
};

export function DatasourceLoader({ schema, dbs }: DatasourceLoaderProps) {
    const [ data, setData ] = useState<Record<string, unknown>>();
    const [ isLoading, setIsLoading ] = useState(false);
    const [ progress, setProgress ] = useState<Progress>();

    async function loadData() {
        console.log(`Loading ${schema.label} data (${schema.file.path}) ...`);

        setIsLoading(true);
        const result = await loadDatasource(schema, setProgress);
        console.log('Data loaded', result);

        for (const db of dbs) {
            const process = `Inserting data into ${db.type}`;
            console.log(process);
            setProgress({ process, done: 0 });
            await updateUI();

            await db.setData(schema, result, done => {
                setProgress({ process, done });
                return updateUI();
            });
        }

        setIsLoading(false);
        setData(result);
    };

    return (
        <div className='flex items-center gap-4'>
            <Button onClick={loadData} disabled={!!data || isLoading}>
                Load {schema.label} Data
            </Button>

            {isLoading ? (
                <div className='flex items-center gap-3 text-blue-500'>
                    <svg className='animate-spin size-5' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                        <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>

                    {progress && (
                        <div>{printProgress(progress)}</div>
                    )}
                </div>
            ) : data ? (
                <div className='flex items-center gap-2 text-green-500'>
                    <CheckIcon /> {`${schema.label} data loaded`}
                </div>
            ) : (
                <div className='flex items-center gap-3 text-yellow-500'>
                    <TriangleAlertIcon size={20} /> No data loaded yet
                </div>
            )}
        </div>
    );
}

function printProgress(progress: Progress) {
    let output = `${progress.process} ...`;
    if (progress.done !== undefined)
        output += ` ${(progress.done * 100).toFixed(0).padStart(3, ' ')} %`;

    return output;
}
