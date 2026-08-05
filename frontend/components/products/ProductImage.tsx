"use client";

import { useState } from "react";

type Props = {
  imageUrl: string | null;
  productName: string;
  className?: string;
  fallbackClassName?: string;
};

export default function ProductImage({
  imageUrl,
  productName,
  className = "",
  fallbackClassName = "",
}: Props) {
  const [hasError, setHasError] = useState(false);

  const normalizedImageUrl = imageUrl?.trim() ?? "";

  if (!normalizedImageUrl || hasError) {
    return (
      <div
        aria-label={`${productName} için ürün görseli hazırlanıyor`}
        className={`flex items-center justify-center bg-slate-100 text-5xl ${fallbackClassName}`}
      >
        📦
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-white ${className}`}
    >
      <img
        src={normalizedImageUrl}
        alt={productName}
        loading="lazy"
        onError={() => setHasError(true)}
        className="h-full w-full object-contain"
      />
    </div>
  );
}