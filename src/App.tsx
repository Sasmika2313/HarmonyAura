import React, { useEffect, useState } from "react";

type Theme = "light" | "dark";
type MenuSection = "humans" | "machines" | "critical" | "okay";

export const App: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [theme, setTheme] = useState<Theme>("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<MenuSection>("humans");

  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(false), 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (showWelcome) {
    return (
      <div className="ha-welcome-screen">
        <h1 className="ha-welcome-title">Welcome to Harmony Aura</h1>
      </div>
    );
  }

  return (
    <div className={`ha-root ha-root--${theme}`}>
      <header className="ha-topbar">
        <div className="ha-topbar-left">
          <span className="ha-app-badge">Harmony Aura</span>
        </div>
        <div className="ha-topbar-right">
          <button
            className="ha-theme-toggle"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? "Dark" : "Light"}
          </button>
          <button
            className="ha-burger"
            aria-label="Open menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {menuOpen && (
        <nav className="ha-menu">
          <button
            className={`ha-menu-item ${
              activeSection === "humans" ? "ha-menu-item--active" : ""
            }`}
            onClick={() => setActiveSection("humans")}
          >
            Humans
          </button>
          <button
            className={`ha-menu-item ${
              activeSection === "machines" ? "ha-menu-item--active" : ""
            }`}
            onClick={() => setActiveSection("machines")}
          >
            Machines
          </button>
          <button
            className={`ha-menu-item ${
              activeSection === "critical" ? "ha-menu-item--active" : ""
            }`}
            onClick={() => setActiveSection("critical")}
          >
            Critical
          </button>
          <button
            className={`ha-menu-item ${
              activeSection === "okay" ? "ha-menu-item--active" : ""
            }`}
            onClick={() => setActiveSection("okay")}
          >
            Okay
          </button>
        </nav>
      )}

      <main className="ha-main">
        <div className="ha-main-header">
          <h2 className="ha-main-title">
            {activeSection === "humans" && "All Humans"}
            {activeSection === "machines" && "All Machines"}
            {activeSection === "critical" && "Critical Overview"}
            {activeSection === "okay" && "Okay / Stable Overview"}
          </h2>
          <p className="ha-main-subtitle">
            Live harmony between workers and machines across your operations.
          </p>
        </div>
        <div className="ha-grid-placeholder">
          <p>
            This is the structural shell. Next step: wire in real-time human and
            machine cards, CIS color states, filters, and detail views as per
            your spec.
          </p>
        </div>
      </main>
    </div>
  );
};

