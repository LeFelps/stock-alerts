"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DashboardNavigation } from "./dashboard-navigation";

const DRAWER_ANIMATION_MS = 150;

export function MobileNavDrawer() {
  const [mounted, setMounted] = useState(false);
  const animations = useRef<Animation[]>([]);
  const content = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const transitionId = useRef(0);

  const setContent = useCallback((node: HTMLDivElement | null) => {
    content.current = node;
    if (!node) return;

    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const animation = node.animate?.(
      [{ transform: "translateX(-100%)" }, { transform: "translateX(0)" }],
      {
        duration: reduceMotion ? 0 : DRAWER_ANIMATION_MS,
        easing: "ease-out",
      },
    );
    if (animation) animations.current.push(animation);
  }, []);

  const setOverlay = useCallback((node: HTMLDivElement | null) => {
    overlay.current = node;
    if (!node) return;

    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const animation = node.animate?.([{ opacity: 0 }, { opacity: 1 }], {
      duration: reduceMotion ? 0 : DRAWER_ANIMATION_MS,
      easing: "ease-out",
    });
    if (animation) animations.current.push(animation);
  }, []);

  function cancelAnimations() {
    animations.current.forEach((animation) => animation.cancel());
    animations.current = [];
  }

  function openDrawer() {
    transitionId.current += 1;
    cancelAnimations();
    setMounted(true);
  }

  function closeDrawer() {
    const id = ++transitionId.current;
    cancelAnimations();
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const options: KeyframeAnimationOptions = {
      duration: reduceMotion ? 0 : DRAWER_ANIMATION_MS,
      easing: "ease-in",
      fill: "forwards",
    };
    const nextAnimations = [
      content.current?.animate?.(
        [{ transform: "translateX(0)" }, { transform: "translateX(-100%)" }],
        options,
      ),
      overlay.current?.animate?.([{ opacity: 1 }, { opacity: 0 }], options),
    ].filter((animation): animation is Animation => animation !== undefined);

    if (nextAnimations.length === 0) {
      setMounted(false);
      return;
    }

    animations.current = nextAnimations;
    void Promise.allSettled(
      nextAnimations.map((animation) => animation.finished),
    ).then(() => {
      if (transitionId.current === id) setMounted(false);
    });
  }

  useEffect(
    () => () => {
      transitionId.current += 1;
      cancelAnimations();
    },
    [],
  );

  return (
    <Sheet
      open={mounted}
      onOpenChange={(open) => (open ? openDrawer() : closeDrawer())}
    >
      <SheetTrigger asChild>
        <Button
          aria-label="Abrir navegação"
          className="lg:hidden"
          size="icon"
          variant="outline"
        >
          <Menu aria-hidden="true" className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent ref={setContent} overlayRef={setOverlay} side="left">
        <SheetHeader>
          <SheetTitle>Stock Alerts</SheetTitle>
        </SheetHeader>
        <DashboardNavigation
          ariaLabel="Navegação principal"
          className="pt-6"
          onNavigate={closeDrawer}
        />
      </SheetContent>
    </Sheet>
  );
}
