"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { 
  Plane, 
  Building2, 
  MessageSquare, 
  UserCircle, 
  Settings, 
  ChevronDown, 
  LogOut, 
  BarChart2,
  Menu,
  X,
  CreditCard,
  FileCheck
} from "lucide-react";

export default function SubmitterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Redirect if not submitter
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role === "ADMINISTRATOR") {
      router.push("/admin/submissions");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center text-gray-500">Loading...</div>;
  }

  if (!session || session.user?.role === "ADMINISTRATOR") {
    return null;
  }

  const navigationItems = [
    { label: "Trips", icon: Plane, href: "/trips", key: "trips", colorClass: "bg-blue-500" },
    { label: "My Groups", icon: Building2, href: "/groups", key: "groups", colorClass: "bg-purple-500" },
    { label: "My Responses", icon: FileCheck, href: "/responses", key: "responses", colorClass: "bg-amber-500" },
    { label: "Messages", icon: MessageSquare, href: "/messages", key: "messages", colorClass: "bg-teal-500" },
  ];

  const profileItems = [
    { label: "Payment Methods", icon: CreditCard, href: "/profile", key: "cards", colorClass: "bg-emerald-500" },
    { label: "Dashboard", icon: BarChart2, href: "/trips/analytics", key: "analytics", colorClass: "bg-rose-500" },
  ];

  let dynamicTitle = "Dashboard";
  if (pathname?.startsWith("/trips/analytics")) {
    dynamicTitle = "Dashboard";
  } else if (pathname?.startsWith("/trips")) {
    dynamicTitle = "My Trips";
  } else if (pathname?.startsWith("/groups")) {
    dynamicTitle = "My Groups";
  } else if (pathname?.startsWith("/messages")) {
    dynamicTitle = "Direct Messages";
  } else if (pathname?.startsWith("/responses")) {
    dynamicTitle = "My Responses";
  } else if (pathname?.startsWith("/profile")) {
    dynamicTitle = "Payment Methods";
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Permanent Header */}
      <div className="z-50 bg-white">
        <Header title={dynamicTitle} showAuthButtons={false} hideLogoTitle={false} />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Menu Button - Appears below header on mobile */}
        <div className="md:hidden absolute top-0 left-0 p-4 z-40">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 bg-white rounded-md shadow-sm text-gray-600 hover:text-gray-900 border border-gray-200"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Desktop Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-20"
          } bg-white border-r border-gray-200 transition-all duration-300 hidden md:flex flex-col z-30 shadow-sm`}
        >


          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-4 space-y-1">
            <div className={`mb-2 px-6 flex items-center justify-center ${!sidebarOpen && "px-0"}`}>
              {sidebarOpen ? (
                <p className="text-xs font-bold tracking-wider text-gray-400 uppercase w-full">Main</p>
              ) : (
                <div className="w-8 h-px bg-gray-300"></div>
              )}
            </div>
            
            {navigationItems.map((item) => {
              const isActive = pathname?.startsWith(item.href) || false;
              return (
                <NavLink
                  key={item.key}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  colorClass={item.colorClass}
                  sidebarOpen={sidebarOpen}
                  isActive={isActive}
                />
              );
            })}

            <div className={`mt-8 mb-2 px-6 flex items-center justify-center ${!sidebarOpen && "px-0"}`}>
              {sidebarOpen ? (
                <p className="text-xs font-bold tracking-wider text-gray-400 uppercase w-full">Account</p>
              ) : (
                <div className="w-8 h-px bg-gray-300"></div>
              )}
            </div>

            {profileItems.map((item) => {
              const isActive = pathname?.startsWith(item.href) || false;
              return (
                <NavLink
                  key={item.key}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  colorClass={item.colorClass}
                  sidebarOpen={sidebarOpen}
                  isActive={isActive}
                />
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="border-t border-gray-100 p-3 space-y-2 bg-gray-50/50">
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors ${
                !sidebarOpen ? "justify-center" : ""
              }`}
              title={!sidebarOpen ? "Sign Out" : undefined}
            >
              <LogOut size={20} />
              {sidebarOpen && <span className="text-sm font-medium">Sign Out</span>}
            </button>
          </div>

          {/* Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex w-full items-center justify-center h-12 border-t border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronDown
              size={18}
              className={`transform transition-transform duration-300 ${sidebarOpen ? "rotate-90" : "-rotate-90"}`}
            />
          </button>
        </aside>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl">
              <div className="absolute top-0 right-0 -mr-12 pt-4">
                <button
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white bg-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              
              <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-[var(--bg-secondary)]">
                <div className="w-10 h-10 rounded-full bg-[image:var(--gradient-primary)] text-white font-bold text-sm flex items-center justify-center shadow-sm">
                  {session?.user?.name ? session.user.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() : "U"}
                </div>
                <div>
                  <p className="font-bold text-[var(--primary)] text-sm">{session?.user?.name || "User"}</p>
                  <p className="text-xs text-gray-600">{session?.user?.email}</p>
                </div>
              </div>

              <div className="flex-1 h-0 overflow-y-auto">
                <nav className="px-2 py-4 space-y-1">
                  <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Main</p>
                  {navigationItems.map((item) => (
                      <MobileNavLink
                        key={item.key}
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        colorClass={item.colorClass}
                        isActive={pathname?.startsWith(item.href) || false}
                        onClick={() => setMobileMenuOpen(false)}
                      />
                  ))}
                  <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mt-6 mb-2">Account</p>
                  {profileItems.map((item) => (
                      <MobileNavLink
                        key={item.key}
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        colorClass={item.colorClass}
                        isActive={pathname?.startsWith(item.href) || false}
                        onClick={() => setMobileMenuOpen(false)}
                      />
                  ))}
                </nav>
              </div>
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <button
                  onClick={() => {
                    signOut({ callbackUrl: "/auth/signin" });
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 font-medium"
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-gray-50/50 md:pt-0 pt-16">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  colorClass,
  sidebarOpen,
  isActive,
}: {
  href: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string;
  colorClass: string;
  sidebarOpen: boolean;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 py-2.5 transition-all duration-200 ${
        isActive 
          ? "bg-[#e8f5ed] text-[#1b5e3f] font-semibold rounded-r-full pr-4" 
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium rounded-r-full pr-4"
      } ${!sidebarOpen ? "justify-center rounded-lg mx-2 px-0" : "mr-4 pl-6"}`}
      title={!sidebarOpen ? label : undefined}
    >
      <div className={`flex items-center justify-center w-8 h-8 flex-shrink-0 text-white shadow-sm rounded-xl ${colorClass}`}>
        <Icon size={18} />
      </div>
      {sidebarOpen && <span>{label}</span>}
    </Link>
  );
}

function MobileNavLink({
  href,
  icon: Icon,
  label,
  colorClass,
  onClick,
  isActive,
}: {
  href: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string;
  colorClass: string;
  onClick: () => void;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 py-3 transition-colors ${
        isActive 
          ? "bg-[#e8f5ed] text-[#1b5e3f] font-bold rounded-r-full pr-4 pl-6 mr-4" 
          : "text-gray-600 hover:bg-gray-50 font-medium rounded-r-full pr-4 pl-6 mr-4"
      }`}
    >
      <div className={`flex items-center justify-center w-8 h-8 flex-shrink-0 text-white shadow-sm rounded-xl ${colorClass}`}>
        <Icon size={18} />
      </div>
      <span>{label}</span>
    </Link>
  );
}
