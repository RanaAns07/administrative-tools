'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { IFeeInvoice } from '@/models/finance/FeeInvoice';
import { X, Plus, Trash2, Info } from 'lucide-react';

interface FeeOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: IFeeInvoice;
  onSave: (updatedData: Partial<IFeeInvoice>) => void;
}

/**
 * FeeOverrideModal Component
 * Allows finance admins to override a student's default fee structure with custom line items.
 * Implements strict real-time calculation and dynamic field management.
 */
export default function FeeOverrideModal({ isOpen, onClose, invoice, onSave }: FeeOverrideModalProps) {
  const [isCustomFee, setIsCustomFee] = useState(invoice.isCustomFee || false);
  const [customFeeHeads, setCustomFeeHeads] = useState(
    invoice.customFeeHeads?.length > 0 
      ? [...invoice.customFeeHeads] 
      : [{ name: '', amount: 0 }]
  );

  // Sync state if invoice prop changes while open
  useEffect(() => {
    if (isOpen) {
      setIsCustomFee(invoice.isCustomFee || false);
      setCustomFeeHeads(
        invoice.customFeeHeads?.length > 0 
          ? [...invoice.customFeeHeads] 
          : [{ name: '', amount: 0 }]
      );
    }
  }, [isOpen, invoice]);

  // Real-time running total calculation
  const runningTotal = useMemo(() => {
    return customFeeHeads.reduce((sum, head) => sum + (Number(head.amount) || 0), 0);
  }, [customFeeHeads]);

  const addLineItem = () => {
    setCustomFeeHeads([...customFeeHeads, { name: '', amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    const updated = customFeeHeads.filter((_, i) => i !== index);
    setCustomFeeHeads(updated.length > 0 ? updated : [{ name: '', amount: 0 }]);
  };

  const updateLineItem = (index: number, field: 'name' | 'amount', value: string | number) => {
    const updated = [...customFeeHeads];
    if (field === 'amount') {
      updated[index].amount = Number(value);
    } else {
      updated[index].name = value as string;
    }
    setCustomFeeHeads(updated);
  };

  const handleSave = () => {
    onSave({
      isCustomFee,
      customFeeHeads: isCustomFee ? customFeeHeads : [],
      // If custom fee is enabled, the totalAmount in DB should reflect the sum of heads
      totalAmount: isCustomFee ? runningTotal : invoice.totalAmount,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Fee Structure Override</h2>
            <p className="text-sm text-gray-500">Invoice ID: {invoice._id as string}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900">Enable Custom Overrides</p>
                <p className="text-xs text-blue-700">Manually define all fee components for this student.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isCustomFee}
                onChange={(e) => setIsCustomFee(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {isCustomFee ? (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <div className="col-span-7">Fee Head Name</div>
                <div className="col-span-4 text-right">Amount</div>
                <div className="col-span-1"></div>
              </div>
              
              {customFeeHeads.map((head, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-center animate-in slide-in-from-top-1">
                  <div className="col-span-7">
                    <input
                      type="text"
                      placeholder="e.g. Tuition Fee"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      value={head.name}
                      onChange={(e) => updateLineItem(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      value={head.amount}
                      onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      onClick={() => removeLineItem(index)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addLineItem}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors mt-2 px-2"
              >
                <Plus className="w-4 h-4" />
                Add Line Item
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <p>Standard Fee Structure is currently active.</p>
              <p className="text-sm">Toggle "Enable Custom Overrides" to make changes.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-tighter">Total Custom Amount</p>
            <p className={`text-2xl font-black ${isCustomFee ? 'text-gray-900' : 'text-gray-300'}`}>
              ${runningTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              Save Overrides
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
