"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { Landmark, Users, Settings, Briefcase } from "lucide-react";
import Link from "next/link";

const tools = [
  {
    title: "Finance Department",
    href: "/finance",
    icon: Landmark,
    description: "Manage fee structures, invoices, and the general ledger.",
    color: "text-leads-blue",
    bgClass: "bg-leads-blue/10",
    borderClass: "border-leads-blue",
    hoverShadow: "0 20px 25px -5px rgba(28, 53, 115, 0.2), 0 10px 10px -5px rgba(169, 29, 34, 0.3)"
  },
  {
    title: "Admissions Department",
    href: "/admissions",
    icon: Users,
    description: "Review inquiries and manage student applications.",
    color: "text-leads-red",
    bgClass: "bg-leads-red/10",
    borderClass: "border-leads-red",
    hoverShadow: "0 20px 25px -5px rgba(169, 29, 34, 0.2), 0 10px 10px -5px rgba(169, 29, 34, 0.3)"
  },
  {
    title: "Admin Center",
    href: "/admin",
    icon: Settings,
    description: "System configurations, users, and security settings.",
    color: "text-leads-blue",
    bgClass: "bg-leads-blue/10",
    borderClass: "border-leads-blue",
    hoverShadow: "0 20px 25px -5px rgba(28, 53, 115, 0.2), 0 10px 10px -5px rgba(169, 29, 34, 0.3)"
  },
  {
    title: "HR & Payroll",
    href: "/hr",
    icon: Briefcase,
    description: "Employee records, payroll processing, and benefits.",
    color: "text-leads-red",
    bgClass: "bg-leads-red/10",
    borderClass: "border-leads-red",
    hoverShadow: "0 20px 25px -5px rgba(169, 29, 34, 0.2), 0 10px 10px -5px rgba(169, 29, 34, 0.3)"
  },
];

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Select all tool cards inside the container
    const cards = containerRef.current.querySelectorAll(".tool-card");

    // GSAP staggering entrance animation
    gsap.fromTo(
      cards,
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.15,
        duration: 0.8,
        ease: "power3.out",
      }
    );
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-leads-gray to-blue-50/40">
      {/* Header */}
      <header className="w-full bg-white shadow-sm border-b border-gray-100 border-t-4 border-leads-red flex items-center px-6 md:px-12 py-4">
        <div className="flex items-center gap-4">
          <img src="/Logo.png" alt="Logo" className="w-20 h-24 object-contain" />
          <div>
            <h1 className="text-xl font-bold text-leads-blue tracking-tight">Lahore Leads University</h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Gulshan-e-Ravi Campus</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl px-6 py-16 flex flex-col">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-leads-blue tracking-tight">
            Administration Center
          </h2>
          <div className="h-1 w-24 bg-leads-red mx-auto mt-4 rounded-full"></div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mt-4">
            Select a module below to access core operations. Ensure you have the appropriate permissions before modifying institutional data.
          </p>
        </section>

        {/* Tool Grid */}
        <section
          ref={containerRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {tools.map((tool, idx) => {
            const Icon = tool.icon;
            return (
              <Link href={tool.href} key={idx}>
                <motion.div
                  className={`tool-card opacity-0 bg-white rounded-2xl p-6 border-x border-b border-gray-100 border-t-4 ${tool.borderClass} flex flex-col items-center text-center cursor-pointer relative overflow-hidden h-full`}
                  whileHover={{
                    scale: 1.03,
                    borderColor: "#A91D22",
                    boxShadow: tool.hoverShadow
                  }}
                  initial={{
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)"
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className={`p-4 rounded-full mb-5 ${tool.bgClass} ${tool.color}`}>
                    <Icon size={28} strokeWidth={1.5} />
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">{tool.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {tool.description}
                  </p>
                </motion.div>
              </Link>
            );
          })}
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-sm text-gray-400 mt-auto">
        &copy; {new Date().getFullYear()} Lahore Leads University. All rights reserved.
      </footer>
    </div>
  );
}
