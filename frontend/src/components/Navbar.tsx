"use client";
import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="container">
        <div className="logo">MyApp</div>

        <div className={`menu ${open ? "active" : ""}`}>
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/services">Services</Link>
          <Link href="/contact">Contact</Link>
        </div>

        <div className="hamburger" onClick={() => setOpen(!open)}>
          <span />
          <span />
          <span />
        </div>
      </div>

      <style jsx>{`
        .navbar {
          width: 100%;
          background: #111;
          color: white;
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .container {
          max-width: 1200px;
          margin: auto;
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          font-size: 1.5rem;
          font-weight: bold;
        }

        .menu {
          display: flex;
          gap: 20px;
        }

        .menu a {
          color: white;
          text-decoration: none;
          transition: 0.3s;
        }

        .menu a:hover {
          color: #00bcd4;
        }

        .hamburger {
          display: none;
          flex-direction: column;
          cursor: pointer;
        }

        .hamburger span {
          width: 25px;
          height: 3px;
          background: white;
          margin: 4px 0;
          display: block;
        }

        /* MOBILE */
        @media (max-width: 768px) {
          .menu {
            position: absolute;
            top: 60px;
            left: 0;
            width: 100%;
            background: #111;
            flex-direction: column;
            align-items: center;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
          }

          .menu.active {
            max-height: 300px;
          }

          .hamburger {
            display: flex;
          }
        }
      `}</style>
    </nav>
  );
}
