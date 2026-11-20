"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState(0);
  if (!images.length) return <div className="ps-gallery-main"><div className="ps-product-placeholder">No product photo yet</div></div>;
  return (
    <div className="ps-gallery">
      {images.length > 1 && (
        <div className="ps-gallery-thumbs">
          {images.map((image, index) => (
            <button type="button" key={image} className={index === selected ? "active" : ""} onClick={() => setSelected(index)} aria-label={`View ${name} image ${index + 1}`}>
              <Image src={image} alt="" fill sizes="76px" unoptimized />
            </button>
          ))}
        </div>
      )}
      <div className="ps-gallery-main">
        <Image src={images[selected]} alt={name} fill sizes="(max-width: 620px) 100vw, 600px" priority unoptimized />
      </div>
    </div>
  );
}
