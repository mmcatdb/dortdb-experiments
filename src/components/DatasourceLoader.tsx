import { UnibenchService } from '@/lib/data/unibenchService';
import { Button } from './shadcn';

const service = new UnibenchService();

export function DatasourceLoader() {
    async function loadData() {
        console.log('Loading Unibench data...');
        const data = await service.downloadData();
        console.log('Data loaded', data);
    };

    return (
        <div className='p-4'>
            <Button onClick={loadData}>
                Load Unibench Data
            </Button>
        </div>
    );
}
