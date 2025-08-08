import './globals.css';
export const metadata = {
  title: 'Quiz App',
  description: 'A Next.js Quiz App',
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}