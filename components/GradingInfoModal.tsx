import React from 'react';
import { X } from 'lucide-react';
import { GRADE_OPTIONS } from '../constants';

interface GradingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GradingInfoModal: React.FC<GradingInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Overlay click to close */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative z-10">
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-100 bg-white/95 backdrop-blur z-20">
          <h2 className="text-xl font-bold text-gray-900">Grading System Guide</h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 md:p-6 space-y-8">
          {/* Point System */}
          <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-primary rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Grade Point Values</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">Points assigned to each letter grade based on the selected scale.</p>
            <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-6 py-3 border-b border-gray-200">Grade</th>
                    <th className="px-6 py-3 text-center border-b border-gray-200">5.0 Scale</th>
                    <th className="px-6 py-3 text-center border-b border-gray-200">4.0 Scale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {GRADE_OPTIONS.map((opt) => (
                    <tr key={opt.letter} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3 font-bold text-gray-900">{opt.letter}</td>
                        <td className="px-6 py-3 text-center font-mono text-gray-600 font-medium">{opt.value5.toFixed(1)}</td>
                        <td className="px-6 py-3 text-center font-mono text-gray-600 font-medium">{opt.value4.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Classification */}
           <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-primary rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Degree Classification Ranges</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
                {/* 5.0 Scale */}
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-blue-50/50 px-4 py-3 border-b border-gray-200 font-bold text-blue-900 text-center">
                        5.0 Scale System
                    </div>
                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100 bg-white">
                            <tr className="bg-green-50/30"><td className="px-4 py-2.5 text-gray-600">4.50 - 5.00</td><td className="px-4 py-2.5 font-bold text-right text-gray-900">First Class</td></tr>
                            <tr><td className="px-4 py-2.5 text-gray-600">3.50 - 4.49</td><td className="px-4 py-2.5 font-medium text-right text-gray-800">Second Class Upper</td></tr>
                            <tr><td className="px-4 py-2.5 text-gray-600">2.40 - 3.49</td><td className="px-4 py-2.5 font-medium text-right text-gray-800">Second Class Lower</td></tr>
                            <tr><td className="px-4 py-2.5 text-gray-600">1.50 - 2.39</td><td className="px-4 py-2.5 font-medium text-right text-gray-800">Third Class</td></tr>
                            <tr><td className="px-4 py-2.5 text-gray-600">1.00 - 1.49</td><td className="px-4 py-2.5 font-medium text-right text-gray-800">Pass</td></tr>
                            <tr className="bg-red-50/30"><td className="px-4 py-2.5 text-gray-600">0.00 - 0.99</td><td className="px-4 py-2.5 font-medium text-right text-red-600">Fail</td></tr>
                        </tbody>
                    </table>
                </div>

                {/* 4.0 Scale */}
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-gray-700 text-center">
                        4.0 Scale System
                    </div>
                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100 bg-white">
                            <tr className="bg-green-50/30"><td className="px-4 py-2.5 text-gray-600">3.50 - 4.00</td><td className="px-4 py-2.5 font-bold text-right text-gray-900">First Class</td></tr>
                            <tr><td className="px-4 py-2.5 text-gray-600">3.00 - 3.49</td><td className="px-4 py-2.5 font-medium text-right text-gray-800">Second Class Upper</td></tr>
                            <tr><td className="px-4 py-2.5 text-gray-600">2.00 - 2.99</td><td className="px-4 py-2.5 font-medium text-right text-gray-800">Second Class Lower</td></tr>
                            <tr><td className="px-4 py-2.5 text-gray-600">1.00 - 1.99</td><td className="px-4 py-2.5 font-medium text-right text-gray-800">Third Class</td></tr>
                            <tr className="bg-red-50/30"><td className="px-4 py-2.5 text-gray-600">0.00 - 0.99</td><td className="px-4 py-2.5 font-medium text-right text-red-600">Fail</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default GradingInfoModal;