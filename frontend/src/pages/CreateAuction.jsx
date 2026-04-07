import React, { useState, useRef, useEffect } from "react";
import { createAuction, uploadImagesFormData } from "../api";
import { toast } from "react-toastify";
import CATEGORIES from "../constants/categories";

function FeeStructure() {
  return (
    <div className="bg-[#E9E4DA] rounded-xl p-6 md:p-8 mt-6 w-full">
      <h3 className="text-xl md:text-2xl font-semibold text-black mb-4">Fee Structure</h3>

      <div className="grid grid-cols-2 gap-y-4 text-base md:text-lg text-gray-800 w-full">
        <div className="font-medium">Listing Fee:</div>
        <div className="text-right font-semibold">Free</div>

        <div className="font-medium">Final Value Fee:</div>
        <div className="text-right font-semibold">5% of final sale price</div>

        <div className="font-medium">Payment Processing:</div>
        <div className="text-right font-semibold">2.9%</div>
      </div>
    </div>
  );
}

export default function CreateAuction() {
  const [form, setForm] = useState({
    auctionName: "",
    itemName: "",
    itemDescription: "",
    category: "",
    condition: "like-new",
    conditionNotes: "",
    startingBidPrice: "",
    reservePrice: "",
  // buyItNowPrice removed
    bidIncrement: "",
    startTiming: "immediate",
    scheduleStartDate: "",
    scheduleStartTime: "",
    scheduleEndDate: "",
    scheduleEndTime: "",
  });

  // images
  const [images, setImages] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // {id, url, name}[]
  const fileInputRef = useRef(null);

  // savingDraft removed
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdAuctionId, setCreatedAuctionId] = useState(null);
  
  const categories = CATEGORIES;

  useEffect(() => {
    return () => {
      // cleanup object URLs on unmount
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  // ---------- sanitizers ----------
  function sanitizeCurrency(raw) {
    if (raw == null) return "";
    let s = String(raw).replace(/[^0-9.]/g, "");
    const parts = s.split(".");
    if (parts.length > 1) {
      const intPart = parts.shift();
      const decPart = parts.join("");
      s = intPart + "." + decPart;
    }
    if (s.includes(".")) {
      const [i, d] = s.split(".");
      s = i + "." + d.slice(0, 2);
    }
    if (/^0{2,}/.test(s) && !/^0\./.test(s)) {
      s = s.replace(/^0+/, "") || "0";
    }
    return s;
  }

  function sanitizeInteger(raw) {
    if (raw == null) return "";
    let s = String(raw).replace(/[^0-9]/g, "");
    if (s.length > 1) s = s.replace(/^0+/, "");
    return s;
  }

  function handleChange(e) {
  const { name, value } = e.target;
  const currencyFields = ["startingBidPrice", "reservePrice"];
    const integerFields = ["bidIncrement"];

    if (currencyFields.includes(name)) {
      setForm((s) => ({ ...s, [name]: sanitizeCurrency(value) }));
      return;
    }
    if (integerFields.includes(name)) {
      setForm((s) => ({ ...s, [name]: sanitizeInteger(value) }));
      return;
    }
    setForm((s) => ({ ...s, [name]: value }));
  }

  function handleNumericKeyDown(e, type = "currency") {
    if (e.key === "e" || e.key === "E" || e.key === "+" || e.key === "-") {
      e.preventDefault();
      return;
    }
    if (type === "integer" && (e.key === "." || e.key === ",")) {
      e.preventDefault();
    }
  }

  function handlePaste(e, fieldName, type = "currency") {
    e.preventDefault();
    const raw = (e.clipboardData || window.clipboardData).getData("text");
    const clean = type === "integer" ? sanitizeInteger(raw) : sanitizeCurrency(raw);
    setForm((s) => ({ ...s, [fieldName]: clean }));
  }

  // ---------- date clamp ----------
  function handleDateChange(fieldName, rawValue) {
    if (!rawValue) {
      setForm((s) => ({ ...s, [fieldName]: "" }));
      return;
    }
    const parts = rawValue.split("-");
    if (parts.length !== 3) {
      setForm((s) => ({ ...s, [fieldName]: rawValue }));
      return;
    }
    let [y, m, d] = parts;
    y = y.replace(/[^0-9]/g, "");
    m = m.replace(/[^0-9]/g, "");
    d = d.replace(/[^0-9]/g, "");
    if (y.length > 4) y = y.slice(0, 4);
    const yNum = parseInt(y || "0", 10);
    if (!isNaN(yNum) && yNum > 9999) {
      y = "9999";
    }
    if (m.length === 1) m = "0" + m;
    if (d.length === 1) d = "0" + d;
    const fixed = `${y.padStart(4, "0")}-${(m || "01").padStart(2, "0")}-${(d || "01").padStart(2, "0")}`;
    setForm((s) => ({ ...s, [fieldName]: fixed }));
  }

  // ---------- images (max 5) ----------
  function handleImageAdd(e) {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const totalAllowed = 5;
    const remaining = totalAllowed - images.length;
    if (remaining <= 0) {
      toast.error("Maximum 5 images allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const toAdd = selected.slice(0, remaining);

    setImages((prev) => {
      const next = [...prev, ...toAdd];
      return next;
    });

    const newPreviews = toAdd.map((file) => {
      return { id: `${file.name}-${Date.now()}-${Math.random()}`, url: URL.createObjectURL(file), name: file.name };
    });
    setPreviews((p) => [...p, ...newPreviews]);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemoveImage(id, e) {
    // defensive: if event passed, stop it
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    setPreviews((prevPreviews) => {
      const idx = prevPreviews.findIndex((p) => p.id === id);
      if (idx === -1) return prevPreviews;
      const removed = prevPreviews[idx];
      try {
        URL.revokeObjectURL(removed.url);
      } catch (err) {}
      const nextPreviews = [...prevPreviews.slice(0, idx), ...prevPreviews.slice(idx + 1)];
      // remove image file by same index (ordered)
      setImages((prevImages) => {
        if (idx < 0 || idx >= prevImages.length) {
          // fallback: remove first matching name
          const byNameIdx = prevImages.findIndex((f) => f.name === removed.name);
          if (byNameIdx === -1) return prevImages;
          return [...prevImages.slice(0, byNameIdx), ...prevImages.slice(byNameIdx + 1)];
        }
        return [...prevImages.slice(0, idx), ...prevImages.slice(idx + 1)];
      });
      return nextPreviews;
    });
  }

  // ---------- other handlers ----------
  function handleConditionSelect(cond) {
    setForm((s) => ({ ...s, condition: cond }));
  }

  // handleSaveDraft removed

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.auctionName.trim()) { toast.error("Please enter auction name."); return; }
    if (!form.itemName.trim()) { toast.error("Please enter item name."); return; }
    if (!form.itemDescription.trim()) { toast.error("Please enter item description."); return; }
    if (!form.category) { toast.error("Please select a category."); return; }
    if (!form.startingBidPrice || Number(form.startingBidPrice) < 0) { toast.error("Please enter a valid starting bid price."); return; }
    if (!form.bidIncrement) { toast.error("Please enter a valid bid increment."); return; }

    let startDt;
    if (form.startTiming === "immediate") {
      startDt = new Date();
    } else {
      if (!form.scheduleStartDate || !form.scheduleStartTime) { toast.error("Please provide scheduled start date/time."); return; }
      startDt = new Date(`${form.scheduleStartDate}T${form.scheduleStartTime}`);
      if (isNaN(startDt.getTime())) { toast.error("Invalid scheduled start date/time."); return; }
    }

    if (!form.scheduleEndDate || !form.scheduleEndTime) { toast.error("Please provide end date & time."); return; }
    const endDt = new Date(`${form.scheduleEndDate}T${form.scheduleEndTime}`);
    if (isNaN(endDt.getTime())) { toast.error("Invalid end date/time."); return; }
    if (endDt <= startDt) { toast.error("End date/time must be after start date/time."); return; }

    const apiPayload = {
      title: form.auctionName,
      name: form.itemName,
      description: form.itemDescription,
      images: images.map((f) => f.name),
      category: form.category,
      condition: form.condition,
      metadata: { conditionNotes: form.conditionNotes },
      startingPrice: form.startingBidPrice === "" ? null : Number(form.startingBidPrice),
      minIncrement: form.bidIncrement === "" ? null : Number(form.bidIncrement),
      startTime: startDt.toISOString(),
      endTime: endDt.toISOString(),
    };

    console.log("Create Auction payload:", apiPayload);

    setSubmitting(true);
    try {
      // if there are files selected, upload them first and replace images with server paths
      if (images && images.length > 0) {
        const formData = new FormData();
        images.forEach((f) => formData.append("images", f));
        const uploadRes = await uploadImagesFormData(formData);
        if (uploadRes?.files) {
          apiPayload.images = uploadRes.files; // server returns array of absolute URLs
        }
      }

      const res = await createAuction(apiPayload);
      setSubmitting(false);
      // backend returns { success, message, auction }
      setCreatedAuctionId(res?.auction?._id || null);
      setSuccessModalOpen(true);
    } catch (err) {
      setSubmitting(false);
      console.error("createAuction error:", err);
      toast.error(err?.message || String(err) || "Failed to create auction");
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF8EA]">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Create New Auction</h1>
          <p className="text-gray-600 mt-1">List your item for auction and reach thousands of potential buyers</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Details */}
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-1">Item Details</h2>
            <p className="text-sm text-gray-600 mb-4">Provide detailed information about your product</p>

            {/* Auction Name (new) */}
            <div className="mb-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Auction Name*</span>
                <input
                  type="text"
                  name="auctionName"
                  value={form.auctionName}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Enter auction name, for example 'Rare Coin Collection' or 'Classic Car Bidding Event'"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Enter a descriptive title for your auction (this is shown to bidders).</p>
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Item Name*</span>
                  <input
                    type="text"
                    name="itemName"
                    value={form.itemName}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Enter item name"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Item Description*</span>
                  <textarea
                    name="itemDescription"
                    value={form.itemDescription}
                    onChange={handleChange}
                    rows={5}
                    className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                    placeholder="Provide a detailed description of your item"
                    required
                  />
                </label>

                {/* Multi Image Upload */}
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Item Images* (max 5)</span>
                  <div className="mt-2">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-between rounded-md border-2 border-dashed border-gray-300 bg-gray-50 p-4 cursor-pointer hover:bg-gray-100"
                      role="button"
                    >
                      <div>
                        <div className="text-sm text-gray-700 font-medium">{images.length} / 5 images selected</div>
                        <div className="text-xs text-gray-500">Click to add, or drag & drop (browser support may vary)</div>
                      </div>
                      <div>
                        <button type="button" className="inline-flex items-center rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">Add Images</button>
                      </div>
                    </div>

                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageAdd} className="hidden" />
                  </div>
                </label>

                {/* previews (moved outside the label) */}
                {previews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {previews.map((p) => (
                      <div key={p.id} className="relative border rounded overflow-hidden bg-white">
                        <img src={p.url} alt={p.name} className="object-cover w-full h-28" />
                        <div className="p-2 text-xs text-gray-700 truncate">{p.name}</div>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveImage(p.id, e)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
              </div>

              {/* Right */}
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Category*</span>
                  <select name="category" value={form.category} onChange={handleChange} className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" required>
                    {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </label>

                <div>
                  <span className="text-sm font-medium text-gray-700">Item Condition*</span>
                  <div className="mt-3 space-y-3">
                    {[
                      { id: "new", title: "New", desc: "Brand new, never used" },
                      { id: "like new", title: "Like New", desc: "Minimal use, excellent" },
                      { id: "good", title: "Good", desc: "Normal wear, fully functional" },
                      { id: "fair", title: "Fair", desc: "Visible wear, some defects" },
                    ].map((c) => {
                      const active = form.condition === c.id;
                      return (
                        <div key={c.id} onClick={() => handleConditionSelect(c.id)} className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition ${active ? "border-yellow-400 bg-yellow-50" : "border-gray-300 bg-white hover:bg-gray-50"}`}>
                          <input type="radio" name="condition" value={c.id} checked={active} onChange={() => handleConditionSelect(c.id)} className="mt-1" />
                          <div className="text-sm">
                            <div className="font-medium text-gray-800">{c.title}</div>
                            <div className="text-xs text-gray-500">{c.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Additional Condition Notes</span>
                  <textarea name="conditionNotes" value={form.conditionNotes} onChange={handleChange} rows={4} className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" placeholder="Describe any specific wear, damage, or unique aspects..." />
                </label>
              </div>
            </div>
          </section>

          {/* Pricing & Bidding */}
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-1">Pricing & Bidding</h2>
            <p className="text-sm text-gray-600 mb-4">Set your starting price and bidding parameters</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label>
                <span className="text-sm text-gray-700">Starting Bid Price*</span>
                <div className="mt-2 relative">
                  <span className="absolute left-3 top-2 text-gray-700 font-semibold">₹</span>
                  <input
                    type="text"
                    name="startingBidPrice"
                    value={form.startingBidPrice}
                    onChange={handleChange}
                    onKeyDown={(e) => handleNumericKeyDown(e, "currency")}
                    onPaste={(e) => handlePaste(e, "startingBidPrice", "currency")}
                    inputMode="decimal"
                    pattern="^\d+(\.\d{0,2})?$"
                    className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="0.00"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum amount for bids to start</p>
              </label>

              <label>
                <span className="text-sm text-gray-700">Reserve Price (Optional)</span>
                <div className="mt-2 relative">
                  <span className="absolute left-3 top-2 text-gray-700 font-semibold">₹</span>
                  <input
                    type="text"
                    name="reservePrice"
                    value={form.reservePrice}
                    onChange={handleChange}
                    onKeyDown={(e) => handleNumericKeyDown(e, "currency")}
                    onPaste={(e) => handlePaste(e, "reservePrice", "currency")}
                    inputMode="decimal"
                    pattern="^\d+(\.\d{0,2})?$"
                    className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Lowest price you will accept</p>
              </label>

              {/* Buy It Now option removed */}

              <label>
                <span className="text-sm text-gray-700">Bid Increment*</span>
                <div className="mt-2 relative">
                  <span className="absolute left-3 top-2 text-gray-700 font-semibold">₹</span>
                  <input
                    type="text"
                    name="bidIncrement"
                    value={form.bidIncrement}
                    onChange={handleChange}
                    onKeyDown={(e) => handleNumericKeyDown(e, "integer")}
                    onPaste={(e) => handlePaste(e, "bidIncrement", "integer")}
                    inputMode="numeric"
                    pattern="^\d+$"
                    className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="0"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum raise for new bids</p>
              </label>
            </div>

            <FeeStructure />
          </section>

          {/* Auction Timing */}
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-1">Auction Timing</h2>
            <p className="text-sm text-gray-600 mb-6">Schedule when your auction starts and ends</p>


            {/* start timing: immediate or scheduled */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <label className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer ${form.startTiming === "immediate" ? "border-gray-700 bg-white" : "border-gray-300 bg-[#FBF7F0]"}`}>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border flex items-center justify-center">
                    <input type="radio" name="startTiming" value="immediate" checked={form.startTiming === "immediate"} onChange={handleChange} className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-gray-800">Start Immediately</span>
                </div>
              </label>

              <label className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer ${form.startTiming === "schedule" ? "border-blue-500 bg-white" : "border-gray-300 bg-[#FBF7F0]"}`}>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border flex items-center justify-center">
                    <input type="radio" name="startTiming" value="schedule" checked={form.startTiming === "schedule"} onChange={handleChange} className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-gray-800">Schedule for later</span>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {form.startTiming === "schedule" && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">Start Date*</label>
                  <input
                    type="date"
                    name="scheduleStartDate"
                    value={form.scheduleStartDate}
                    onChange={(e) => handleDateChange("scheduleStartDate", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-[#FBF7F0]"
                  />

                  <label className="block text-sm font-medium text-gray-700">Start Time*</label>
                  <input
                    type="time"
                    name="scheduleStartTime"
                    value={form.scheduleStartTime}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-[#FBF7F0]"
                  />
                </div>

              )}

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">End Date*</label>
                <input
                  type="date"
                  name="scheduleEndDate"
                  value={form.scheduleEndDate}
                  onChange={(e) => handleDateChange("scheduleEndDate", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-[#FBF7F0]"
                />

                <label className="block text-sm font-medium text-gray-700">End Time*</label>
                <input
                  type="time"
                  name="scheduleEndTime"
                  value={form.scheduleEndTime}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-[#FBF7F0]"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-2">Fields marked with * are required when scheduling an auction (Start: when scheduling; End: always). Years are limited to 4 digits (max 9999).</p>
          </section>

          {/* Actions / Submit - single Save as Draft button */}
          <section className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div /> {/* intentionally empty to keep spacing balanced */}
              <div className="flex items-center gap-3">
                {/* Save as Draft removed */}

                <button type="button" onClick={() => window.history.back()} className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>

                <button type="submit" className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:opacity-95">
                  {submitting ? "Creating..." : "Create Auction"}
                </button>
              </div>
            </div>

            <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <strong>Before You Submit</strong>
              <p className="mt-1 text-sm">Please review all information carefully. Once your auction is live, some details cannot be changed. Make sure your photos are high-quality and your description is accurate and complete.</p>
            </div>
          </section>
        </form>

        {/* Footer */}
        <footer className="mt-8 text-xs text-gray-500">
          <div className="flex justify-between items-center">
            <div>BIDSPHERE</div>
            <div>© {new Date().getFullYear()} Bidsphere. All rights reserved.</div>
          </div>
        </footer>
      </main>

      {/* Success Modal */}
      {successModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSuccessModalOpen(false)} />
          <div className="relative bg-white rounded-lg max-w-sm w-full mx-4 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800">Auction created successfully</h3>
            <p className="mt-2 text-sm text-gray-600">Your auction has been created.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  // after creating an auction, navigate to home with created id so Home can fetch details from backend
                  if (createdAuctionId) {
                    globalThis.location.href = `/?created=${createdAuctionId}`;
                    return;
                  }
                  globalThis.location.href = "/";
                }}
                className="px-4 py-2 rounded border border-gray-300 bg-white text-sm hover:bg-gray-50"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
