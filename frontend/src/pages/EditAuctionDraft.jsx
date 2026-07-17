import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import { getAuction, saveAuctionDraft, updateAuction, deleteAuction, uploadImagesFormData } from "../api";

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

export default function EditAuctionDraftWithId() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  

  const [form, setForm] = useState({
    auctionName: "",
    itemName: "",
    itemDescription: "",
    category: "",
    condition: "like-new",
    conditionNotes: "",
    startingBidPrice: "",
    reservePrice: "",
    bidIncrement: "",
    startTiming: "immediate",
    scheduleStartDate: "",
    scheduleStartTime: "",
    scheduleEndDate: "",
    scheduleEndTime: "",
  });

  const [existingImages, setExistingImages] = useState([]);
  const [removedExistingIds, setRemovedExistingIds] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);

  const categories = [
    { value: "", label: "Select" },
    { value: "electronics", label: "Electronics" },
    { value: "fashion", label: "Fashion" },
    { value: "collectibles", label: "Collectibles" },
    { value: "art", label: "Art" },
    { value: "furniture", label: "Furniture" },
    { value: "others", label: "Others" },
  ];

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
    if (/^0{2,}/.test(s) && !/^0\./.test(s)) s = s.replace(/^0+/, "") || "0";
    return s;
  }

  function sanitizeInteger(raw) {
    if (raw == null) return "";
    let s = String(raw).replace(/[^0-9]/g, "");
    if (s.length > 1) s = s.replace(/^0+/, "");
    return s;
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setErrorMsg("");
      try {
        const data = await getAuction(id);
        if (!mounted) return;
        const auction = data?.auction || data || {};

        setForm({
          auctionName: auction.title || "",
          itemName: auction.item?.name || "",
          itemDescription: auction.item?.description || "",
          // prefer item.category, fall back to auction.category if present
          category: auction.item?.category || auction.category || "",
          // support condition stored either on item or auction; normalize spaces to hyphens
          condition: (auction.item?.condition || auction.condition || "like new").replace(/\s+/g, "-") || "like-new",
          conditionNotes: auction.item?.metadata?.conditionNotes || auction.metadata?.conditionNotes || "",
          startingBidPrice: auction.startingPrice != null ? String(auction.startingPrice) : "",
          // load previous reserve price if present
          reservePrice: (auction.reservePrice != null ? String(auction.reservePrice) : (auction.reserve != null ? String(auction.reserve) : "")),
          // fallback for increment naming differences
          bidIncrement: auction.minIncrement != null ? String(auction.minIncrement) : (auction.bidIncrement != null ? String(auction.bidIncrement) : ""),
          startTiming: auction.startTime ? "schedule" : "immediate",
          scheduleStartDate: auction.startTime ? new Date(auction.startTime).toISOString().slice(0, 10) : "",
          scheduleStartTime: auction.startTime ? new Date(auction.startTime).toISOString().slice(11, 16) : "",
          scheduleEndDate: auction.endTime ? new Date(auction.endTime).toISOString().slice(0, 10) : "",
          scheduleEndTime: auction.endTime ? new Date(auction.endTime).toISOString().slice(11, 16) : "",
        });

        const imgs = (auction.item?.images || []).map((it, idx) =>
          typeof it === "string"
            ? { id: `existing-${idx}`, url: it, filename: it.split("/").pop() }
            : { id: it.id || `existing-${idx}`, url: it.url || it.path, filename: it.filename || it.name || `img-${idx}` }
        );
        setExistingImages(imgs || []);
      } catch (err) {
        setErrorMsg(String(err.message));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
      newPreviews.forEach((p) => {
        try { URL.revokeObjectURL(p.url); } catch {}
      });
    };
  }, [id]);

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

  function handleConditionSelect(cond) {
    setForm((s) => ({ ...s, condition: cond }));
  }

  function handleImageAdd(e) {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const totalAllowed = 5;
    const remaining = totalAllowed - (existingImages.length - removedExistingIds.length) - newFiles.length;
    if (remaining <= 0) {
      toast.error("Maximum 5 images allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const toAdd = selected.slice(0, remaining);
    setNewFiles((prev) => [...prev, ...toAdd]);
    const newPreviewsArr = toAdd.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      name: file.name,
    }));
    setNewPreviews((p) => [...p, ...newPreviewsArr]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemoveNewFile(id, e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setNewPreviews((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      try {
        URL.revokeObjectURL(prev[idx].url);
      } catch {}
      const next = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      setNewFiles((prevFiles) => {
        const name = prev[idx].name;
        const fi = prevFiles.findIndex((f) => f.name === name);
        if (fi === -1) return prevFiles;
        return [...prevFiles.slice(0, fi), ...prevFiles.slice(fi + 1)];
      });
      return next;
    });
  }

  function handleRemoveExistingImage(imgId, e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setRemovedExistingIds((prev) => [...prev, imgId]);
  }

  function handleRestoreExistingImage(imgId, e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setRemovedExistingIds((prev) => prev.filter((x) => x !== imgId));
  }

  // handleSaveDraft removed

  async function handleUpdate(e) {
    e.preventDefault();
    setUpdating(true);
    setErrorMsg("");
    try {
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

      // Build payload matching backend field names
      const startISO = form.startTiming === "immediate" ? new Date().toISOString() : new Date(`${form.scheduleStartDate}T${form.scheduleStartTime}`).toISOString();
      const endISO = new Date(`${form.scheduleEndDate}T${form.scheduleEndTime}`).toISOString();

      // compute images: start with existing urls (excluding removed), then upload new files and append their URLs
      const existingUrls = existingImages
        .filter((img) => !removedExistingIds.includes(img.id))
        .map((img) => img.url);

      let uploadedUrls = [];
      if (newFiles && newFiles.length > 0) {
        const upFd = new FormData();
        newFiles.forEach((f) => upFd.append("images", f));
        const upRes = await uploadImagesFormData(upFd);
        uploadedUrls = upRes?.files || [];
      }

      const finalImages = [...existingUrls, ...uploadedUrls];

      // normalize condition map if needed (frontend used like-new style)
      const conditionMap = {
        "like-new": "like new",
        new: "new",
        good: "good",
        fair: "fair",
      };

      const payload = {
        title: form.auctionName,
        name: form.itemName,
        description: form.itemDescription,
        images: finalImages,
        category: form.category,
        condition: conditionMap[form.condition] || form.condition,
        metadata: { conditionNotes: form.conditionNotes },
        startingPrice: form.startingBidPrice === "" ? null : Number(form.startingBidPrice),
        minIncrement: form.bidIncrement === "" ? null : Number(form.bidIncrement),
        startTime: startISO,
        endTime: endISO,
      };

      await updateAuction(id, payload);
      setSuccessMsg("Auction updated successfully.");
      toast.success("Auction updated successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg(String(err.message));
      toast.error(err?.message || "Failed to update auction");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this auction? This cannot be undone.")) return;
    setDeleting(true);
    setErrorMsg("");
    try {
      await deleteAuction(id);
      setSuccessMsg("Auction deleted.");
      toast.success("Auction deleted.");
      setTimeout(() => navigate("/my-auctions"), 900);
    } catch (err) {
      setErrorMsg(String(err.message));
      toast.error(err?.message || "Failed to delete auction");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading auction...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8EA]">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Edit Auction</h1>
          <p className="text-gray-600 mt-1">Update details for your auction</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-1">Item Details</h2>
            <p className="text-sm text-gray-600 mb-4">Provide detailed information about your product</p>

            <div className="mb-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Auction Name*</span>
                <input type="text" name="auctionName" value={form.auctionName} onChange={handleChange} className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" required />
                <p className="text-xs text-gray-500 mt-1">Enter a descriptive title for your auction (this is shown to bidders).</p>
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Item Name*</span>
                  <input type="text" name="itemName" value={form.itemName} onChange={handleChange} className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" required />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Item Description*</span>
                  <textarea name="itemDescription" value={form.itemDescription} onChange={handleChange} rows={5} className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" required />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Item Images* (max 5)</span>
                  <div className="mt-2">
                    <div onClick={() => fileInputRef.current?.click()} className="flex items-center justify-between rounded-md border-2 border-dashed border-gray-300 bg-gray-50 p-4 cursor-pointer hover:bg-gray-100" role="button">
                      <div>
                        <div className="text-sm text-gray-700 font-medium">{(existingImages.length - removedExistingIds.length) + newFiles.length} / 5 images selected</div>
                        <div className="text-xs text-gray-500">Click to add, or drag & drop (browser support may vary)</div>
                      </div>
                      <div>
                        <button type="button" className="inline-flex items-center rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">Add Images</button>
                      </div>
                    </div>

                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageAdd} className="hidden" />
                  </div>
                </label>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {existingImages.map((img) => {
                    const removed = removedExistingIds.includes(img.id);
                    return (
                      <div key={img.id} className={`relative border rounded overflow-hidden bg-white ${removed ? "opacity-40" : ""}`}>
                        <img src={img.url} alt={img.filename} className="object-cover w-full h-28" />
                        <div className="p-2 text-xs text-gray-700 truncate">{img.filename}</div>
                        {!removed ? (
                          <button type="button" onClick={(e) => handleRemoveExistingImage(img.id, e)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs" title="Remove image">×</button>
                        ) : (
                          <button type="button" onClick={(e) => handleRestoreExistingImage(img.id, e)} className="absolute top-1 right-1 bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs" title="Restore image">↺</button>
                        )}
                      </div>
                    );
                  })}

                  {newPreviews.map((p) => (
                    <div key={p.id} className="relative border rounded overflow-hidden bg-white">
                      <img src={p.url} alt={p.name} className="object-cover w-full h-28" />
                      <div className="p-2 text-xs text-gray-700 truncate">{p.name}</div>
                      <button type="button" onClick={(e) => handleRemoveNewFile(p.id, e)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs" title="Remove new image">×</button>
                    </div>
                  ))}
                </div>
                
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Category*</span>
                  <select name="category" value={form.category} onChange={handleChange} className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" required>
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <span className="text-sm font-medium text-gray-700">Item Condition*</span>
                  <div className="mt-3 space-y-3">
                    {[
                      { id: "new", title: "New", desc: "Brand new, never used" },
                      { id: "like-new", title: "Like New", desc: "Minimal use, excellent" },
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

          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-1">Pricing & Bidding</h2>
            <p className="text-sm text-gray-600 mb-4">Set your starting price and bidding parameters</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label>
                <span className="text-sm text-gray-700">Starting Bid Price*</span>
                <div className="mt-2 relative">
                  <span className="absolute left-3 top-2 text-gray-700 font-semibold">₹</span>
                  <input type="text" name="startingBidPrice" value={form.startingBidPrice} onChange={handleChange} inputMode="decimal" className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="0.00" required />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum amount for bids to start</p>
              </label>

              <label>
                <span className="text-sm text-gray-700">Reserve Price (Optional)</span>
                <div className="mt-2 relative">
                  <span className="absolute left-3 top-2 text-gray-700 font-semibold">₹</span>
                  <input type="text" name="reservePrice" value={form.reservePrice} onChange={handleChange} inputMode="decimal" className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="0.00" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Lowest price you will accept</p>
              </label>

              {/* Buy It Now option removed */}

              <label>
                <span className="text-sm text-gray-700">Bid Increment*</span>
                <div className="mt-2 relative">
                  <span className="absolute left-3 top-2 text-gray-700 font-semibold">₹</span>
                  <input type="text" name="bidIncrement" value={form.bidIncrement} onChange={handleChange} inputMode="numeric" className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="0" required />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum raise for new bids</p>
              </label>
            </div>

            <FeeStructure />
          </section>

          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-1">Auction Timing</h2>
            <p className="text-sm text-gray-600 mb-6">Schedule when your auction starts and ends</p>

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
                  <input type="date" name="scheduleStartDate" value={form.scheduleStartDate} onChange={(e) => setForm((s)=>({...s, scheduleStartDate:e.target.value}))} className="w-full rounded-md border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-[#FBF7F0]" />
                  <label className="block text-sm font-medium text-gray-700">Start Time*</label>
                  <input type="time" name="scheduleStartTime" value={form.scheduleStartTime} onChange={(e) => setForm((s)=>({...s, scheduleStartTime:e.target.value}))} className="w-full rounded-md border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-[#FBF7F0]" />
                </div>
              )}

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">End Date*</label>
                <input type="date" name="scheduleEndDate" value={form.scheduleEndDate} onChange={(e) => setForm((s)=>({...s, scheduleEndDate:e.target.value}))} className="w-full rounded-md border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-[#FBF7F0]" />
                <label className="block text-sm font-medium text-gray-700">End Time*</label>
                <input type="time" name="scheduleEndTime" value={form.scheduleEndTime} onChange={(e) => setForm((s)=>({...s, scheduleEndTime:e.target.value}))} className="w-full rounded-md border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-[#FBF7F0]" />
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-2">Fields marked with * are required when scheduling an auction (Start: when scheduling; End: always). Years are limited to 4 digits (max 9999).</p>
          </section>

          <section className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <button type="button" onClick={handleDelete} disabled={deleting} className="rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                  {deleting ? "Deleting..." : "Delete Auction"}
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Save as Draft removed */}

                <button type="button" onClick={() => navigate(-1)} className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>

                <button type="submit" disabled={updating} className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:opacity-95">
                  {updating ? "Updating..." : "Update Auction"}
                </button>
              </div>
            </div>

            <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <strong>Before You Submit</strong>
              <p className="mt-1 text-sm">Please review all information carefully. Once your auction is live, some details may not be changed. Make sure photos and descriptions are accurate.</p>
            </div>

            {successMsg && <div className="text-green-700 text-sm">{successMsg}</div>}
            {errorMsg && <div className="text-red-700 text-sm whitespace-pre-wrap">{errorMsg}</div>}
          </section>
        </form>

        <footer className="mt-8 text-xs text-gray-500">
          <div className="flex justify-between items-center">
            <div>BIDSPHERE</div>
            <div>© {new Date().getFullYear()} Bidsphere. All rights reserved.</div>
          </div>
        </footer>
      </main>
    </div>
  );
}
