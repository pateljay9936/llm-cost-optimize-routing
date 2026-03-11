import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM Router",
  description: "Cost-optimized LLM routing - route queries to the right model",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Apply saved theme instantly before paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <div id="app-loader" style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'hsl(240 10% 3.9%)',
          transition: 'opacity 0.3s',
        }}>
          <div style={{ textAlign: 'center', color: 'hsl(0 0% 63%)' }}>
            <div style={{
              width: 32,
              height: 32,
              border: '3px solid hsl(240 3.7% 15.9%)',
              borderTopColor: 'hsl(0 0% 98%)',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
              margin: '0 auto 12px',
            }} />
            <p style={{ fontSize: 14 }}>Loading LLM Router...</p>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin { to { transform: rotate(360deg); } }
          html:not(.dark) #app-loader {
            background-color: hsl(0 0% 100%) !important;
          }
          html:not(.dark) #app-loader div div:first-child {
            border-color: hsl(240 5.9% 90%) !important;
            border-top-color: hsl(240 5.9% 10%) !important;
          }
          html:not(.dark) #app-loader p {
            color: hsl(240 3.8% 46.1%) !important;
          }
        `}} />
        {children}
      </body>
    </html>
  );
}
