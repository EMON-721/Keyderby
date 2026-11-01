import './globals.css';
export const metadata = { title: 'Keyderby — One keystroke at a time', description: 'Simple typing practice, timed tests, and friendly races. Add your name and your ID is created automatically.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="en"><body>{children}</body></html>; }
