'use client';

import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  CreditCard, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  Clock, 
  ShieldCheck,
  Lock,
  ArrowRight
} from 'lucide-react';
import { formatINR } from '../lib/utils';

export const DEFAULT_SAVED_CARDS = [
  {
    id: 'card-kotak-1199',
    bankName: 'Kotak Mahindra Bank',
    cardName: 'Kotak White Reserve',
    last4: '1199',
    network: 'RuPay',
    expiry: '08/29',
    monogram: 'KMBL',
    monogramBg: 'bg-red-600 text-white',
    isCooling: false,
    cardType: 'COMMERCIAL_CREDIT',
  },
  {
    id: 'card-hdfc-4242',
    bankName: 'HDFC Bank',
    cardName: 'HDFC Regalia Gold Corporate',
    last4: '4242',
    network: 'Visa',
    expiry: '10/28',
    monogram: 'HDFC',
    monogramBg: 'bg-blue-600 text-white',
    isCooling: false,
    cardType: 'BUSINESS_CREDIT',
  },
  {
    id: 'card-icici-8824',
    bankName: 'ICICI Bank',
    cardName: 'ICICI Sapphiro Business',
    last4: '8824',
    network: 'Mastercard',
    expiry: '05/27',
    monogram: 'ICICI',
    monogramBg: 'bg-orange-600 text-white',
    isCooling: false,
    cardType: 'CORPORATE_CREDIT',
  },
  {
    id: 'card-sbi-3190',
    bankName: 'State Bank of India',
    cardName: 'SBI Card ELITE Commercial',
    last4: '3190',
    network: 'Visa',
    expiry: '12/28',
    monogram: 'SBI',
    monogramBg: 'bg-sky-600 text-white',
    isCooling: false,
    cardType: 'COMMERCIAL_CREDIT',
  },
  {
    id: 'card-axis-7712',
    bankName: 'Axis Bank',
    cardName: 'Axis Magnus Corporate',
    last4: '7712',
    network: 'Visa',
    expiry: '03/29',
    monogram: 'AXIS',
    monogramBg: 'bg-[#800020] text-white',
    isCooling: false,
    cardType: 'CORPORATE_CREDIT',
  },
  {
    id: 'card-rbl-9034',
    bankName: 'RBL Bank',
    cardName: 'RBL Insignia Commercial',
    last4: '9034',
    network: 'RuPay',
    expiry: '11/30',
    monogram: 'RBL',
    monogramBg: 'bg-blue-900 text-white',
    isCooling: true, // Demonstrates newly added card with 24h cooling pill
    cardType: 'COMMERCIAL_CREDIT',
  },
];

export default function PaymentModeDrawer({
  isOpen,
  onClose,
  selectedCard,
  onSelectCard,
  amount = 0,
}) {
  const [cards, setCards] = useState(DEFAULT_SAVED_CARDS);
  const [showAll, setShowAll] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);

  // New card form state
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardName, setNewCardName] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newCardCvv, setNewCardCvv] = useState('');
  const [newBankName, setNewBankName] = useState('IndusInd Bank');

  if (!isOpen) return null;

  const currentActiveCard = selectedCard || cards[0];
  const displayedCards = showAll ? cards : cards.slice(0, 3);

  const handleAddNewCard = (e) => {
    e.preventDefault();
    const cleanNumber = newCardNumber.replace(/\D/g, '');
    const last4 = cleanNumber.slice(-4) || '5501';

    const newCard = {
      id: `card-custom-${Date.now()}`,
      bankName: newBankName || 'Corporate Bank',
      cardName: `${newBankName} Business Card`,
      last4,
      network: cleanNumber.startsWith('4') ? 'Visa' : cleanNumber.startsWith('5') ? 'Mastercard' : 'RuPay',
      expiry: newCardExpiry || '12/29',
      monogram: (newBankName.slice(0, 4) || 'BANK').toUpperCase(),
      monogramBg: 'bg-indigo-600 text-white',
      isCooling: true, // newly added card undergoes 24h cooling statutory window
      cardType: 'COMMERCIAL_CREDIT',
    };

    setCards([newCard, ...cards]);
    onSelectCard(newCard);
    setIsAddingCard(false);
    // Reset form
    setNewCardNumber('');
    setNewCardExpiry('');
    setNewCardCvv('');
    setNewCardName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#111622] rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 p-5 shadow-2xl relative max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-200">
        
        {/* Drawer Handle for mobile */}
        <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Payment Mode
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Payment Amount: <span className="font-bold text-slate-900 dark:text-white">{formatINR(amount)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto py-3 space-y-4 flex-1 pr-0.5">
          {/* Section Banner */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Credit Cards
            </span>
            <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Charges Applicable</span>
            </span>
          </div>

          {/* Cards List */}
          <div className="space-y-2">
            {displayedCards.map((card) => {
              const isSelected = currentActiveCard.id === card.id;

              return (
                <div
                  key={card.id}
                  onClick={() => onSelectCard(card)}
                  className={`cursor-pointer rounded-2xl p-3.5 border transition-all duration-150 flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 shadow-sm'
                      : 'bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Bank Monogram Logo */}
                    <div
                      className={`w-10 h-10 rounded-xl ${card.monogramBg} font-black text-[11px] flex items-center justify-center shrink-0 shadow-sm tracking-tighter`}
                    >
                      {card.monogram}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                          {card.bankName}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          •••• {card.last4}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {card.network} • {card.cardName}
                        </span>

                        {/* 24h Cooling Alert Badge if newly added card */}
                        {card.isCooling && (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-500/40">
                            <Clock className="w-2.5 h-2.5" />
                            <span>24h Cooling</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Radio indicator */}
                  <div className="shrink-0 ml-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-transparent'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show All / Show Less Accordion */}
          {cards.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="w-full py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold flex items-center justify-center space-x-1 transition"
            >
              <span>{showAll ? 'Show Less' : `Show All (${cards.length}) Saved Cards`}</span>
              {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Add New Card Toggle / Form */}
          {!isAddingCard ? (
            <button
              type="button"
              onClick={() => setIsAddingCard(true)}
              className="w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 p-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center space-x-2 transition bg-white/40 dark:bg-transparent"
            >
              <Plus className="w-4 h-4 text-indigo-500" />
              <span>+ Add New Corporate Card</span>
            </button>
          ) : (
            <form
              onSubmit={handleAddNewCard}
              className="rounded-2xl border border-indigo-200 dark:border-indigo-500/40 bg-indigo-50/30 dark:bg-slate-900/90 p-4 space-y-3 animate-in fade-in-50"
            >
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Add New Card</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingCard(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Card Number (16 Digits)
                </label>
                <input
                  type="text"
                  maxLength={19}
                  placeholder="4532 8920 1199 4402"
                  value={newCardNumber}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 16);
                    const parts = clean.match(/.{1,4}/g) || [];
                    setNewCardNumber(parts.join(' '));
                  }}
                  required
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Valid Thru (MM/YY)
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="08/29"
                    value={newCardExpiry}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      if (val.length >= 3) {
                        val = `${val.slice(0, 2)}/${val.slice(2)}`;
                      }
                      setNewCardExpiry(val);
                    }}
                    required
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    CVV (3 Digits)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="•••"
                    value={newCardCvv}
                    onChange={(e) => setNewCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    required
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Card Issuing Bank Name
                </label>
                <select
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="State Bank of India">State Bank of India</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="IndusInd Bank">IndusInd Bank</option>
                  <option value="RBL Bank">RBL Bank</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition active:scale-95"
              >
                Save & Select Card
              </button>
            </form>
          )}
        </div>

        {/* Footer Action */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-glow flex items-center justify-center space-x-1.5 transition active:scale-[0.98]"
          >
            <span>Confirm Payment Mode</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
