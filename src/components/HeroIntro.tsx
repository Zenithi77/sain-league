"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

/* ── Animation timing constants (ms unless noted) ─────── */
const TRANSITION_LEAD = 2; // seconds before video end to start transition
const LOGO_MOVE_DELAY = 1000; // ms after transition trigger to start logo flight
const LOGO_MOVE_MS = 900; // logo flight duration
const EXIT_MS = 500; // overlay fade-out duration
const FALLBACK_MS = 15_000; // max wait if video never becomes ready

type Phase =
  | "loading" // waiting for video canplay
  | "playing" // video playing normally
  | "transitioning" // video dimming, overlay logo fading in
  | "moving" // logo flying to navbar
  | "exiting" // overlay fading out
  | "done"; // intro finished

interface HeroIntroProps {
  onComplete: () => void;
}

export default function HeroIntro({ onComplete }: HeroIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const triggeredRef = useRef(false);
  const cbRef = useRef(onComplete);
  cbRef.current = onComplete;

  const [phase, setPhase] = useState<Phase>("loading");
  const [reducedMotion, setReduced] = useState(false);

  /* ── Reduced motion preference ─────────────────────── */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    if (!reducedMotion) return;
    // Skip animation entirely — just reveal everything
    const navLogo = document.querySelector<HTMLElement>(
      ".main-header .logo-image",
    );
    if (navLogo) navLogo.style.opacity = "1";
    const t = setTimeout(() => cbRef.current(), 300);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  /* ── Lock scroll while intro is active ─────────────── */
  useEffect(() => {
    if (reducedMotion) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [reducedMotion]);

  /* ── Hide navbar logo on mount, restore on unmount ──── */
  useEffect(() => {
    if (reducedMotion) return;
    const el = document.querySelector<HTMLElement>(".main-header .logo-image");
    if (el) {
      el.style.opacity = "0";
      el.style.transition = "none";
    }
    return () => {
      if (el) {
        el.style.removeProperty("opacity");
        el.style.removeProperty("transition");
      }
    };
  }, [reducedMotion]);

  /* ── If video already buffered before React hydrates ── */
  useEffect(() => {
    const v = videoRef.current;
    if (v && v.readyState >= 3 && phase === "loading") setPhase("playing");
  }, [phase]);

  /* ── Finish: fade overlay then reveal page ─────────── */
  const finish = useCallback(() => {
    setPhase("exiting");
    setTimeout(() => {
      setPhase("done");
      cbRef.current();
    }, EXIT_MS);
  }, []);

  /* ── Fly overlay logo → navbar logo ────────────────── */
  const flyLogo = useCallback(() => {
    const logo = logoRef.current;
    const target = document.querySelector<HTMLElement>(
      ".main-header .logo-image",
    );

    if (!logo || !target) {
      finish();
      return;
    }

    const from = logo.getBoundingClientRect();
    const to = target.getBoundingClientRect();

    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const scale = Math.min(to.width / from.width, to.height / from.height);

    setPhase("moving");

    logo.style.transition = `transform ${LOGO_MOVE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    logo.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;

    setTimeout(() => {
      // Reveal real navbar logo before overlay fades
      target.style.transition = "none";
      target.style.opacity = "1";
      setTimeout(finish, 100);
    }, LOGO_MOVE_MS + 50);
  }, [finish]);

  /* ── Trigger the transition sequence ───────────────── */
  const trigger = useCallback(() => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    setPhase("transitioning");
    setTimeout(flyLogo, LOGO_MOVE_DELAY);
  }, [flyLogo]);

  /* ── Video event handlers ──────────────────────────── */
  const onCanPlay = useCallback(() => {
    setPhase((p) => (p === "loading" ? "playing" : p));
  }, []);

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || triggeredRef.current || !v.duration) return;
    if (v.duration - v.currentTime <= TRANSITION_LEAD) trigger();
  }, [trigger]);

  const onEnded = useCallback(() => trigger(), [trigger]);

  const onError = useCallback(() => {
    setTimeout(trigger, 500);
  }, [trigger]);

  /* ── Programmatic play + autoplay-block fallback ───── */
  useEffect(() => {
    if (reducedMotion) return;
    const v = videoRef.current;
    if (!v) return;
    const p = v.play();
    if (p) p.catch(() => setTimeout(trigger, 1500));
  }, [trigger, reducedMotion]);

  /* ── Hard fallback timeout ─────────────────────────── */
  useEffect(() => {
    if (reducedMotion) return;
    const t = setTimeout(trigger, FALLBACK_MS);
    return () => clearTimeout(t);
  }, [trigger, reducedMotion]);

  /* ── Render ────────────────────────────────────────── */
  if (reducedMotion || phase === "done") return null;

  const dimming = phase !== "loading" && phase !== "playing";
  const showLogo = dimming;

  return (
    <div
      className={
        "hero-intro" +
        (phase === "exiting" ? " hero-intro--exit" : "") +
        (dimming ? " hero-intro--dim" : "")
      }
    >
      <video
        ref={videoRef}
        className="hero-intro__video"
        muted
        playsInline
        preload="auto"
        onCanPlay={onCanPlay}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onError={onError}
      >
        <source src="/videos/hero.mov" type="video/quicktime" />
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>

      {/* Loading state while video buffers */}
      {phase === "loading" && (
        <div className="hero-intro__loading">
          <Image
            src="/images/logo.png"
            alt=""
            width={200}
            height={61}
            priority
            className="hero-intro__loading-logo"
          />
        </div>
      )}

      {/* Overlay logo that flies to navbar */}
      <div
        ref={logoRef}
        className={
          "hero-intro__logo" + (showLogo ? " hero-intro__logo--visible" : "")
        }
      >
        <Image
          src="/images/logo.png"
          alt="Sain Girls League"
          width={400}
          height={122}
          priority
          className="hero-intro__logo-img"
        />
      </div>
    </div>
  );
}
