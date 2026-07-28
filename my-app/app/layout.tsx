import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NAV_ITEMS } from "@/components/shell/nav";
import { Sidebar } from "@/components/shell/sidebar";
import { UserSwitcher } from "@/components/shell/user-switcher";
import { StatusBadge } from "@/components/shared/status-badge";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AcmePay Ops Console",
  description:
    "Internal operations console prototype: KYC, refunds, feature flags",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  const users = await prisma.user.findMany({ orderBy: { email: "asc" } });

  const visibleNav = session
    ? NAV_ITEMS.filter(
        (item) =>
          item.permission === null ||
          hasPermission(session.user.role, item.permission),
      )
    : [];

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex min-h-screen">
          <Sidebar items={visibleNav} />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between border-b px-6 py-3">
              <div className="flex items-center gap-3 text-sm">
                {session ? (
                  <>
                    <span className="font-medium">{session.user.name}</span>
                    <StatusBadge status={session.user.role} />
                  </>
                ) : (
                  <span className="text-muted-foreground">Not signed in</span>
                )}
              </div>
              {session && (
                <UserSwitcher
                  users={users.map((u) => ({
                    id: u.id,
                    name: u.name,
                    role: u.role,
                  }))}
                  currentUserId={session.user.id}
                />
              )}
            </header>
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
