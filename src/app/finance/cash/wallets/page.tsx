import { redirect } from 'next/navigation';

// The Wallets page is at /finance/wallets which already exists.
// This route redirects from the sidebar nav link /finance/cash/wallets → /finance/wallets
export default function CashWalletsPage() {
    redirect('/finance/wallets');
}
