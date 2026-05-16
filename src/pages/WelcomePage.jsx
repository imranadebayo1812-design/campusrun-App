import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Package } from 'lucide-react';

export default function WelcomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const name = location.state?.name || 'there';

  return (
    <div className="min-h-full bg-surface-950 flex items-center justify-center p-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-sm relative z-10 text-center">
        <div className="w-20 h-20 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-10 h-10 text-brand-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">You're all set, {name.split(' ')[0]}!</h1>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          Welcome to CampusRun. Food, errands, packages — your courier is a tap away.
        </p>
        <button
          onClick={() => navigate('/create-order')}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-500/25 text-base"
        >
          <Package className="w-5 h-5" />
          Start Ordering
        </button>
        <button
          onClick={() => navigate('/')}
          className="mt-3 w-full text-gray-500 text-sm py-2"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}
