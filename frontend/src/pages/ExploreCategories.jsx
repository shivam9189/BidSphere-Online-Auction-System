import React from "react";
import { Link } from "react-router-dom";

/* eslint-disable react/prop-types */

import electronicsImg from "../assets/categories/Electronics.jpg";
import fashionImg from "../assets/categories/Fashions.jpg";
import collectiblesImg from "../assets/categories/Collectibles.jpg";
import artImg from "../assets/categories/Art.jpg";
import furnitureImg from "../assets/categories/Furniture.jpg";
import othersImg from "../assets/categories/Others.jpg";

const CATEGORY_LIST = [
  {
    value: "electronics",
    label: "Electronics",
    img: electronicsImg,
  },
  {
    value: "fashion",
    label: "Fashion",
    img: fashionImg,
  },
  {
    value: "collectibles",
    label: "Collectibles",
    img: collectiblesImg,
  },
  {
    value: "art",
    label: "Art",
    img: artImg,
  },
  {
    value: "furniture",
    label: "Furniture",
    img: furnitureImg,
  },
  {
    value: "others",
    label: "Others",
    img: othersImg,
  },
];

export default function ExploreCategories({ categories }) {
  const list = categories || CATEGORY_LIST;

  return (
    <section className="mt-8 mb-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-semibold mb-2">Explore by Category</h2>
        <p className="text-sm text-gray-600 mb-6">Discover unique items across diverse collections</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 items-stretch">
          {list.map((c) => (
            <Link
              key={c.value}
              to={`/categories?category=${encodeURIComponent(c.value)}`}
              className="group bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
            >
              <div className="relative h-36 md:h-44 lg:h-48 bg-gray-100 overflow-hidden">
                <img
                  src={c.img}
                  alt={c.label}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    // If image fails to load, replace with a light gray placeholder and log for debugging
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='Arial' font-size='24'%3EImage not available%3C/text%3E%3C/svg%3E";
                    // eslint-disable-next-line no-console
                    console.warn(`Category image failed to load: ${c.img}`);
                  }}
                />
                {/* decorative gradient overlay only; label shown in bottom caption to avoid duplicate text */}
                <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" aria-hidden="true" />
              </div>

              <div className="px-3 py-2 bg-white border-t text-center mt-auto">
                <div className="font-medium text-sm text-gray-800">{c.label}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}