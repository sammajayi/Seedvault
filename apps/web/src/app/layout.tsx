import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

import { Navbar } from '@/components/navbar';
import Providers from "@/components/providers"

const inter = Inter({ subsets: ['latin'] });

const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

// Embed metadata for Farcaster sharing
const frame = {
  version: "1",
  imageUrl: `${appUrl}/opengraph-image.png`,
  button: {
    title: "Launch my-celo-app",
    action: {
      type: "launch_frame",
      name: "my-celo-app",
      url: appUrl,
      splashImageUrl: `${appUrl}/icon.png`,
      splashBackgroundColor: "#ffffff",
    },
  },
};

export const metadata: Metadata = {
  title: 'my-celo-app',
  description: 'A new Celo blockchain project',
  openGraph: {
    title: 'my-celo-app',
    description: 'A new Celo blockchain project',
    images: [`${appUrl}/opengraph-image.png`],
  },
  other: {
    "fc:frame": JSON.stringify(frame),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          id="fix-localstorage"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var keys = Object.keys(localStorage);
                  for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    var value = localStorage.getItem(key);
                    if (value === 'onboardingcomplete') {
                      localStorage.removeItem(key);
                      console.log('Removed problematic localStorage key: ' + key);
                    } else if (value && !value.startsWith('{') && !value.startsWith('[') && !value.startsWith('"') && value !== 'true' && value !== 'false' && value !== 'null') {
                      try {
                        JSON.parse(value);
                      } catch(e) {
                        localStorage.setItem(key, JSON.stringify(value));
                        console.log('Fixed localStorage key: ' + key);
                      }
                    }
                  }
                } catch(e) {
                  console.warn('Error fixing localStorage:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        {/* Navbar is included on all pages */}
        <div className="relative flex min-h-screen flex-col">
          <Providers>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </Providers>
        </div>
      </body>
    </html>
  );
}
