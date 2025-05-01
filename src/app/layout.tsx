import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import {APIProvider} from '@vis.gl/react-google-maps';
import './globals.css';
import {Toaster} from '@/components/ui/toaster';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Oxbow Forecaster',
  description: 'Predicting river course changes and oxbow lake formation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error(
      'Google Maps API key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file.'
    );
    // Optionally render an error message or fallback UI
    return (
       <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <div className="flex h-screen items-center justify-center">
            <p className="text-red-500 text-center p-4">
              Configuration Error: Google Maps API key is missing.<br />
              Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.
            </p>
          </div>
        </body>
      </html>
    )
  }

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <APIProvider apiKey={apiKey}>
          {children}
          <Toaster />
        </APIProvider>
      </body>
    </html>
  );
}
