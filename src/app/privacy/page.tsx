import Link from 'next/link';

export const metadata = { title: 'Privacy Policy · Beediyo Kall' };

const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: '1. What we collect',
    body: [
      'Username: fetched live from your World App / Worldcoin profile. If you change it there, it updates automatically in Beediyo Kall.',
      'Country, age and gender: chosen once during onboarding and locked to your account. They cannot be edited afterwards.',
      'Call usage: free-tier users have their daily call time tracked (1 minute per day). Premium (pass) users are not tracked for call time.',
      'Payments: WLD pass purchases are processed by World App. We receive the transaction reference needed to verify and activate your pass.',
    ],
  },
  {
    h: '2. Camera & microphone',
    body: [
      'Your camera and microphone are used only while you are in a video call.',
      'Calls are peer-to-peer and are never recorded, stored or listened to by us.',
    ],
  },
  {
    h: '3. What we do NOT do',
    body: [
      'We never display your wallet address to other users — only your username is shown.',
      'We never sell or share your personal data with third parties.',
      'We never track your browsing activity outside Beediyo Kall.',
    ],
  },
  {
    h: '4. Rewards points (BKL)',
    body: [
      'BKL reward points are in-app loyalty points earned with pass purchases. They have no cash value, cannot be bought or sold, and are not a security or a token sale.',
      'Points never expire while your account exists.',
    ],
  },
  {
    h: '5. Data retention & deletion',
    body: [
      'Profile, pass and points data are stored on our database and kept while you use the app.',
      'You can request full deletion of your account and data at any time by emailing airdrophubgroup@gmail.com. Deletion is completed within 30 days.',
    ],
  },
  {
    h: '6. Security',
    body: [
      'All requests are served over HTTPS. Payments are verified server-side against World App.',
      'Access to your data is restricted; wallet addresses are stored separately from anything shown publicly.',
    ],
  },
  {
    h: '7. Contact',
    body: [
      'Questions about this policy or your data: airdrophubgroup@gmail.com.',
      'Effective date: this policy applies from the first public release of Beediyo Kall.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-midnight-950 text-white px-5 py-8">
      <div className="max-w-xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-accent-400 text-sm font-medium mb-6"
        >
          ← Back to Beediyo Kall
        </Link>
        <h1 className="text-2xl font-bold mb-1">Privacy Policy</h1>
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

        <p className="mt-10 text-white/25 text-[11px]">
          Contact: airdrophubgroup@gmail.com
        </p>
      </div>
    </main>
  );
}
