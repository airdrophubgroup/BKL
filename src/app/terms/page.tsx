import Link from 'next/link';

export const metadata = { title: 'Terms of Service · Beediyo Kall' };

const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: '1. Acceptance',
    body: [
      'By opening Beediyo Kall you agree to these Terms. If you do not agree, please do not use the app.',
    ],
  },
  {
    h: '2. Age requirement',
    body: [
      'Beediyo Kall is for adults only. You must be at least 18 years old to use it.',
      'Your age is confirmed once during onboarding and locked to your account.',
    ],
  },
  {
    h: '3. Video calls & conduct',
    body: [
      'Calls connect you with random people. Always be respectful.',
      'Prohibited behaviour includes: nudity or sexual content, harassment, hate speech, spam, scams, sharing personal contact details, and any illegal activity.',
      'Every call has a Report button. Reports are reviewed and repeat offenders are banned.',
      'You are solely responsible for your own behaviour on camera.',
    ],
  },
  {
    h: '4. Passes & payments',
    body: [
      'Passes are paid in WLD through World App and last 7 days from activation.',
      'Without a pass you get 1 minute of calls per day, resetting daily.',
      'All pass purchases are final once activated. If a pass fails to activate after a successful payment, contact airdrophubgroup@gmail.com and we will fix it.',
    ],
  },
  {
    h: '5. BKL reward points',
    body: [
      'BKL reward points are in-app loyalty points with no cash value. They are not a cryptocurrency, not a security, and not part of any token sale.',
      'They never expire and are non-transferable.',
    ],
  },
  {
    h: '6. Acceptable use & security',
    body: [
      'Do not attempt to bypass payments, filters, limits or security of the app. Accounts found abusing the service will be banned.',
      'You must not scrape, copy or automate the app beyond normal use.',
    ],
  },
  {
    h: '7. Disclaimers',
    body: [
      'Beediyo Kall is provided "as is". We work to keep the service available and safe but do not guarantee uninterrupted availability.',
      'We are not responsible for other users\' behaviour. Please report concerns rather than escalating.',
    ],
  },
  {
    h: '8. Changes & contact',
    body: [
      'We may update these Terms; continued use after changes means acceptance.',
      'Questions: airdrophubgroup@gmail.com.',
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-[100dvh] bg-midnight-950 text-white px-5 py-8">
      <div className="max-w-xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-accent-400 text-sm font-medium mb-6"
        >
          ← Back to Beediyo Kall
        </Link>
        <h1 className="text-2xl font-bold mb-1">Terms of Service</h1>
        <p className="text-white/40 text-xs mb-8">Beediyo Kall · Random Video Chat</p>

        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="text-base font-bold text-white mb-2">{s.h}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="text-sm text-white/55 leading-relaxed mb-2">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
