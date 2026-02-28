import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import FeeInvoicesClient from './FeeInvoicesClient';

export const dynamic = 'force-dynamic';

export default function FeeInvoicesPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-leads-blue" size={28} />
            </div>
        }>
            <FeeInvoicesClient />
        </Suspense>
    );
}
