import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Logo from '@/components/ui/Logo';

const SECTIONS = [
  {
    title: '1. Who We Are',
    body: `CampusRun is a campus delivery service operated for Nile University students. We connect buyers with student couriers to deliver food, packages, and errands within the campus. Our support contact is support@campusrun.ng.`,
  },
  {
    title: '2. Information We Collect',
    body: `When you create an account or use CampusRun, we collect:\n\n• Account details: full name, email address, password (hashed — we never see it), course, and hostel/campus status.\n• Contact information: phone number, used to coordinate deliveries.\n• Order data: pickup location, drop-off location, item descriptions, order amounts, and delivery history.\n• Payment information: transaction references processed via Paystack. We do not store card numbers — Paystack handles all card data under PCI-DSS compliance.\n• Device information: browser type, operating system, and app version, collected automatically for crash reporting and fraud prevention.\n• Usage data: pages visited and features used, collected in aggregate to improve the app.`,
  },
  {
    title: '3. How We Use Your Information',
    body: `We use your information to:\n\n• Match your orders with available couriers.\n• Process payments and reimburse courier expenses.\n• Send order status updates via in-app notifications.\n• Detect and prevent fraudulent activity.\n• Improve app performance and fix bugs.\n• Respond to your support requests.\n\nWe do not sell, rent, or trade your personal information to third parties for marketing purposes.`,
  },
  {
    title: '4. Third-Party Services',
    body: `We share limited data with the following trusted third parties:\n\n• Supabase (supabase.com): provides our database, authentication, and file storage. Your account data is stored on Supabase servers. Supabase is SOC 2 Type II certified.\n• Paystack (paystack.com): processes all card payments. Paystack is PCI-DSS Level 1 compliant.\n\nBoth services operate under their own privacy policies and are bound by data processing agreements with us.`,
  },
  {
    title: '5. Data Retention',
    body: `We keep your account data for as long as your account is active. If you delete your account, we will permanently delete your profile, order history, and wallet data within 30 days, except where we are required by Nigerian law to retain certain records (e.g., financial transaction records may be retained for up to 7 years under FIRS regulations).`,
  },
  {
    title: '6. Your Rights',
    body: `Under the Nigeria Data Protection Regulation (NDPR), you have the right to:\n\n• Access: request a copy of the personal data we hold about you.\n• Correction: request that we correct inaccurate data.\n• Deletion: request that we delete your account and personal data.\n• Portability: request your data in a structured, machine-readable format.\n• Objection: object to certain types of processing.\n\nTo exercise any of these rights, contact us at support@campusrun.ng. We will respond within 30 days.`,
  },
  {
    title: '7. Account Deletion',
    body: `You can delete your account at any time from the Profile page by tapping "Delete Account." Submitting a deletion request will permanently remove your profile, orders, wallet balance, and all associated personal data within 30 days. This action cannot be undone.`,
  },
  {
    title: '8. Security',
    body: `We use industry-standard security measures including TLS encryption in transit, bcrypt password hashing, and row-level security policies on our database. Despite these measures, no system is 100% secure. If you believe your account has been compromised, contact us immediately at support@campusrun.ng.`,
  },
  {
    title: '9. Children',
    body: `CampusRun is intended for university students aged 16 and above. We do not knowingly collect data from children under 13. If you believe a child has created an account, please contact us and we will delete it promptly.`,
  },
  {
    title: '10. Changes to This Policy',
    body: `We may update this privacy policy from time to time. When we do, we will update the "Last updated" date at the top of this page and notify active users via in-app notification. Continued use of CampusRun after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '11. Governing Law',
    body: `This privacy policy is governed by the laws of the Federal Republic of Nigeria, including the Nigeria Data Protection Regulation (NDPR) 2019 issued by the National Information Technology Development Agency (NITDA).`,
  },
  {
    title: '12. Contact Us',
    body: `For privacy questions, data requests, or to report a concern:\n\nEmail: support@campusrun.ng\nCampusRun, Nile University of Nigeria, Abuja, Nigeria.`,
  },
];

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const canGoBack = window.history.length > 1;

  return (
    <div className="min-h-screen bg-surface-950">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface-950/95 backdrop-blur z-10 px-4 pt-safe-top pt-4 pb-3 border-b border-white/[0.06] flex items-center gap-3">
          {canGoBack && (
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center shrink-0"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" aria-hidden="true" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <div>
              <p className="text-sm font-bold text-white leading-tight">Privacy Policy</p>
              <p className="text-xs text-gray-500">Last updated: May 2026</p>
            </div>
          </div>
        </div>

        {/* Intro */}
        <div className="px-4 pt-5 pb-3">
          <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl p-4">
            <p className="text-sm text-gray-300 leading-relaxed">
              CampusRun takes your privacy seriously. This policy explains what data we collect, why we collect it, and how you can control it.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="px-4 space-y-4 pb-8">
          {SECTIONS.map(({ title, body }) => (
            <div key={title} className="bg-surface-900 border border-white/[0.07] rounded-2xl p-4">
              <p className="text-sm font-semibold text-white mb-2">{title}</p>
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
