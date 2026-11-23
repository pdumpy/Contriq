"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UsersRound, BookOpen } from "lucide-react";
const links = [
  { href: "/", label: "Overview", Icon: LayoutDashboard },
  { href: "/employees", label: "People", Icon: UsersRound },
  { href: "/methodology", label: "Methodology", Icon: BookOpen },
];
export function Navigation() {
  const path = usePathname();
  return (
    <aside className="sidebar" id="contriq-navigation">
      <Link href="/" className="brand" aria-label="Contriq overview">
        <Image
          src="/brand/contriq-mark.png"
          width={40}
          height={40}
          alt=""
          className="brand-mark"
          loading="eager"
          unoptimized
        />
        <span className="brand-wordmark" aria-hidden="true">
          CO<span className="brand-n">N</span>TRIQ
        </span>
      </Link>
      <div className="workspace-label">Work evidence / v1</div>
      <nav aria-label="Main navigation">
        {links.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={label}
            className={`nav-link ${(href === "/" ? path === href : path.startsWith(href)) ? "active" : ""}`}
            aria-current={
              (href === "/" ? path === href : path.startsWith(href))
                ? "page"
                : undefined
            }
          >
            <Icon size={18} strokeWidth={1.6} />
            <span className="nav-label">{label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="demo-label">
          <span className="status-dot" />
          Synthetic demonstration
        </div>
        <p>
          Fictional people.
          <br />
          Verifiable calculations.
        </p>
        <Link href="/methodology" className="quiet-link">
          Read the methodology
        </Link>
        <div className="company">
          Oswar<span>/</span>teck
        </div>
      </div>
    </aside>
  );
}
