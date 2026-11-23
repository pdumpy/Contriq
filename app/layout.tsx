import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PERIOD } from "@/types";
export const metadata: Metadata = {
  title: { default: "CONTRIQ — Evaluation overview", template: "%s · CONTRIQ" },
  description:
    "An explainable work-evidence demonstration. Explore role-specific calculations and the records behind them.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <WorkspaceShell>
          <div className="app-shell" id="contriq-content">
            <div className="topbar">
              <div className="topbar-context">
                <span className="context-line" />
                Evidence evaluation<span className="topbar-separator">/</span>
                <span className="muted">Mid-level cohort</span>
              </div>
              <div className="period">
                <span className="period-label">Evaluation window</span>
                <span className="mono">{PERIOD.label}</span>
                <span className="window-tag">90 days</span>
              </div>
            </div>
            <main id="main-content">{children}</main>
            <footer className="footer">
              <span>
                Synthetic data · Demonstration rubrics · Advisory results
              </span>
            </footer>
          </div>
        </WorkspaceShell>
      </body>
    </html>
  );
}
