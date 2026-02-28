import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { UserProvider } from "@/components/UserProvider";
import { ChatSidebar } from "@/components/ChatSidebar";

export const metadata: Metadata = {
  title: "Libra Agent",
  description: "Autonomous AI Agent Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <UserProvider>
            <ToastProvider>
              <div className="flex h-[100vh] flex-row bg-background">
                <ChatSidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                  {children}
                </div>
              </div>
            </ToastProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

