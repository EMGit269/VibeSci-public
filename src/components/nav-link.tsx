
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  isTaskLink?: boolean;
};

/**
 * Optimized NavLink to disable prefetching for task links.
 * This prevents the server from being overwhelmed when many tasks are generated.
 */
export function NavLink({ href, children, isTaskLink = false }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = isTaskLink ? pathname.startsWith(href) : pathname === href;

  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all text-sm",
        isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
      )}
    >
      {children}
    </Link>
  );
}
