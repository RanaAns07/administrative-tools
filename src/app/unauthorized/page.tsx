"use client";

import { motion } from "framer-motion";
import { signOut } from "next-auth/react";
import Image from "next/image";

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-leads-gray flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
                <div className="flex justify-center mb-6 relative w-[120px] h-[120px] mx-auto">
                    <Image
                        src="/Logo.jpeg"
                        alt="Leads University Logo"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>

                <h1 className="text-3xl font-bold text-leads-red mb-4">
                    Access Denied
                </h1>

                <p className="text-gray-600 mb-8">
                    You lack the required permissions to view this module. Please contact an administrator if you believe this is an error.
                </p>

                <motion.div whileHover={{ scale: 1.05 }} className="inline-block">
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="bg-leads-blue text-white px-6 py-3 rounded-md font-semibold shadow-md hover:bg-opacity-90 transition-all font-sans"
                    >
                        Sign Out & Switch Accounts
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
