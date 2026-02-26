"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: "Хяналтын самбар",
    href: "/admin",
    icon: "fas fa-th-large",
  },
  {
    label: "Улирал",
    href: "/admin/season",
    icon: "fas fa-calendar-alt",
  },
  {
    label: "Багууд",
    href: "/admin/teams",
    icon: "fas fa-users",
  },
  { label: "Тоглогчид", href: "/admin/kids", icon: "fas fa-child" },
  {
    label: "Дасгалжуулагчид",
    href: "/admin/coaches",
    icon: "fas fa-clipboard",
  },
  {
    label: "Тоглолтууд",
    href: "/admin/games",
    icon: "fas fa-basketball-ball",
  },
  {
    label: "Мэдээ",
    href: "/admin/news",
    icon: "fas fa-newspaper",
  },
  {
    label: "Хамтрагчид",
    href: "/admin/sponsors",
    icon: "fas fa-handshake",
  },
  {
    label: "Подкаст",
    href: "/admin/podcasts",
    icon: "fas fa-podcast",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { userData } = useAuth();
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "Тоглогчид",
    "Бүртгэл",
  ]);
  const [collapsed, setCollapsed] = useState(false);

  const toggleSection = (label: string) => {
    setExpandedSections((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label],
    );
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside className={`admin-sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* User info */}
      <div className="admin-sidebar-header">
        <div className="admin-sidebar-user">
          <div className="admin-sidebar-avatar">
            <i className="fas fa-user-shield"></i>
          </div>
          {!collapsed && (
            <div className="admin-sidebar-user-info">
              <span className="admin-sidebar-username">
                {userData?.email?.split("@")[0] || "Admin"}
              </span>
              <span className="admin-sidebar-role">Админ</span>
            </div>
          )}
        </div>
        <button
          className="admin-sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Дэлгэх" : "Хураах"}
        >
          <i className={`fas fa-chevron-${collapsed ? "right" : "left"}`}></i>
        </button>
      </div>

      {/* Back to site link */}
      <Link href="/" className="admin-sidebar-back">
        <i className="fas fa-arrow-left"></i>
        {!collapsed && <span>Сайт руу буцах</span>}
      </Link>

      {/* Navigation */}
      <nav className="admin-sidebar-nav">
        {navItems.map((item) => {
          if (item.children) {
            const isExpanded = expandedSections.includes(item.label);
            const hasActiveChild = item.children.some((child) =>
              isActive(child.href),
            );

            return (
              <div key={item.label} className="admin-sidebar-group">
                <button
                  className={`admin-sidebar-group-toggle ${hasActiveChild ? "active" : ""}`}
                  onClick={() => toggleSection(item.label)}
                >
                  <span className="admin-sidebar-item-icon">
                    <i className={item.icon}></i>
                  </span>
                  {!collapsed && (
                    <>
                      <span className="admin-sidebar-item-label">
                        {item.label}
                      </span>
                      <i
                        className={`fas fa-chevron-${isExpanded ? "up" : "down"} admin-sidebar-chevron`}
                      ></i>
                    </>
                  )}
                </button>
                {isExpanded && !collapsed && (
                  <div className="admin-sidebar-children">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`admin-sidebar-item child ${isActive(child.href) ? "active" : ""}`}
                      >
                        <span className="admin-sidebar-item-icon">
                          <i className={child.icon}></i>
                        </span>
                        <span className="admin-sidebar-item-label">
                          {child.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-sidebar-item ${isActive(item.href) ? "active" : ""}`}
            >
              <span className="admin-sidebar-item-icon">
                <i className={item.icon}></i>
              </span>
              {!collapsed && (
                <span className="admin-sidebar-item-label">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
