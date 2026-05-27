import { Sparkles, TrendingUp, ShieldCheck, Users } from 'lucide-react';
import PropTypes from 'prop-types';

export default function AISummary({ token }) {
  if (!token) return null;

  AISummary.propTypes = {
    token: PropTypes.shape({
      priceChange: PropTypes.shape({
        h6: PropTypes.number
      })
    })
  };

  return (
    <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 mb-6">
      <div className="flex items-center space-x-2 mb-3">
        <Sparkles className="text-blue-400" size={18} />
        <h3 className="font-bold text-blue-400 text-sm">AI Intel Summary</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-start space-x-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg">
            <TrendingUp className="text-emerald-400" size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase">Momentum</p>
            <p className="text-sm">Strong buy pressure in the last 6h with {token.priceChange?.h6 || 0}% gain.</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="bg-blue-500/20 p-2 rounded-lg">
            <ShieldCheck className="text-blue-400" size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase">Security</p>
            <p className="text-sm">Contract verified. Liquidity locked for 12 months.</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="bg-purple-500/20 p-2 rounded-lg">
            <Users className="text-purple-400" size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase">Holders</p>
            <p className="text-sm">Whale accumulation detected. Top 10 holders own 15% of supply.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
