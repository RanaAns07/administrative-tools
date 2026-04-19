'use client';

import React, { useState, useMemo } from 'react';
import { X, Calendar, Plus, Trash2, Split, AlertCircle, CheckCircle2 } from 'lucide-react';

interface InstallmentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceTotal: number;
  studentId: string;
  onSave: (installments: { dueDate: Date; amount: number }[]) => void;
}

/**
 * InstallmentWizard Component
 * Implements a strict mathematical validation for student installment plans.
 * Ensures that the sum of all installments perfectly matches the invoice total.
 */
export default function InstallmentWizard({ isOpen, onClose, invoiceTotal, studentId, onSave }: InstallmentWizardProps) {
  const [installments, setInstallments] = useState<{ dueDate: string; amount: number }[]>([
    { dueDate: new Date().toISOString().split('T')[0], amount: 0 }
  ]);

  // Calculate remaining balance to be allocated
  const allocatedTotal = useMemo(() => {
    return installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
  }, [installments]);

  const remainingToAllocate = useMemo(() => {
    return Number((invoiceTotal - allocatedTotal).toFixed(2));
  }, [invoiceTotal, allocatedTotal]);

  const isFullyAllocated = Math.abs(remainingToAllocate) < 0.01;

  const addInstallment = () => {
    const lastDate = new Date(installments[installments.length - 1].dueDate);
    const nextDate = new Date(lastDate.setMonth(lastDate.getMonth() + 1));
    
    setInstallments([
      ...installments,
      { 
        dueDate: nextDate.toISOString().split('T')[0], 
        amount: remainingToAllocate > 0 ? remainingToAllocate : 0 
      }
    ]);
  };

  const removeInstallment = (index: number) => {
    if (installments.length <= 1) return;
    setInstallments(installments.filter((_, i) => i !== index));
  };

  const updateInstallment = (index: number, field: 'dueDate' | 'amount', value: string | number) => {
    const updated = [...installments];
    if (field === 'amount') {
      updated[index].amount = Number(value);
    } else {
      updated[index].dueDate = value as string;
    }
    setInstallments(updated);
  };

  /**
   * Quick-split Feature: Evenly distributes the total amount across X months
   */
  const splitEvenly = (months: number) => {
    const baseAmount = Number((invoiceTotal / months).toFixed(2));
    const firstMonthsTotal = baseAmount * (months - 1);
    const lastMonthAmount = Number((invoiceTotal - firstMonthsTotal).toFixed(2));

    const newInstallments = Array.from({ length: months }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      return {
        dueDate: d.toISOString().split('T')[0],
        amount: i === months - 1 ? lastMonthAmount : baseAmount
      };
    });
    setInstallments(newInstallments);
  };

  const handleSave = () => {
    if (!isFullyAllocated) return;
    
    const formattedData = installments.map(inst => ({
      dueDate: new Date(inst.dueDate),
      amount: inst.amount
    }));
    
    onSave(formattedData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Generate Installment Plan</h2>
            <p className="text-slate-400 text-sm mt-1">Student: <span className="text-blue-300 font-mono">{studentId}</span> • Total: <span className="text-white font-bold">Rs {invoiceTotal.toLocaleString()}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="px-8 py-4 bg-slate-50 border-b border-gray-100 flex gap-4 items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Split:</span>
          {[2, 3, 4, 6].map(m => (
            <button
              key={m}
              onClick={() => splitEvenly(m)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
            >
              <Split className="w-3.5 h-3.5" />
              {m} Months
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1">
          <div className="space-y-4">
            {installments.map((inst, index) => (
              <div key={index} className="flex gap-4 items-center group animate-in slide-in-from-left-2">
                <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    value={inst.dueDate}
                    onChange={(e) => updateInstallment(index, 'dueDate', e.target.value)}
                  />
                </div>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rs</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-right font-semibold"
                    value={inst.amount}
                    onChange={(e) => updateInstallment(index, 'amount', e.target.value)}
                  />
                </div>
                <button
                  onClick={() => removeInstallment(index)}
                  disabled={installments.length <= 1}
                  className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-0"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}

            <button
              onClick={addInstallment}
              className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-500 font-bold hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Installment
            </button>
          </div>
        </div>

        {/* Status Bar & Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${isFullyAllocated ? 'bg-green-100' : 'bg-amber-100'}`}>
                {isFullyAllocated ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Amount to Allocate</p>
                <p className={`text-2xl font-black ${isFullyAllocated ? 'text-green-600' : 'text-amber-600'}`}>
                  Rs {remainingToAllocate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Current Plan Total</p>
              <p className="text-2xl font-black text-slate-900">
                Rs {allocatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 text-slate-600 font-bold hover:bg-slate-200 rounded-2xl transition-all"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSave}
              disabled={!isFullyAllocated}
              className={`flex-[2] py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-[0.98] ${
                isFullyAllocated 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' 
                  : 'bg-slate-300 cursor-not-allowed shadow-none'
              }`}
            >
              {isFullyAllocated ? 'Save Installment Plan' : 'Allocation Incomplete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
