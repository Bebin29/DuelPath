"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { shouldLoadImage, getOptimizedImageUrl } from "@/lib/utils/image-optimization";
import { Skeleton } from "@/components/components/ui/skeleton";
import type { ImageProps } from "next/image";

interface OptimizedImageProps extends Omit<ImageProps, "src"> {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  quality?: number;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  sizes?: string;
  className?: string;
}

/**
 * Optimierte Image-Komponente mit Lazy Loading und Responsive Images
 * 
 * Features:
 * - Automatisches Lazy Loading (außer bei priority)
 * - Responsive Images mit srcset
 * - Placeholder während des Ladens
 * - Optimierte Bildformate (WebP/AVIF)
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = 75,
  placeholder = "empty",
  blurDataURL,
  sizes,
  className,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldLoad, setShouldLoad] = useState(priority);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority || shouldLoad) return;

    // Intersection Observer für Lazy Loading
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "200px", // 200px Vorlade-Bereich
        threshold: 0.01,
      }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority, shouldLoad]);

  // Generiere optimierte URL (wenn Next.js Image Optimization nicht verwendet wird)
  const optimizedSrc = src.startsWith("http") && !src.includes("_next/image")
    ? getOptimizedImageUrl(src, { width, height, quality })
    : src;

  // Generiere sizes wenn nicht angegeben
  const imageSizes = sizes || `(max-width: 640px) ${width}px, ${width}px`;

  return (
    <div ref={imageRef} className={`relative overflow-hidden ${className || ""}`}>
      {isLoading && (
        <Skeleton
          className="absolute inset-0"
          style={{ width: `${width}px`, height: `${height}px` }}
        />
      )}
      {shouldLoad && (
        <Image
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          quality={quality}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          sizes={imageSizes}
          loading={priority ? undefined : "lazy"}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
          className={`transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"} ${className || ""}`}
          {...props}
        />
      )}
    </div>
  );
}

