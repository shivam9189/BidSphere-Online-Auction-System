import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuction, getMyDeliveries } from '../api';
import { generateInvoicePDF } from '../utils/invoicePDF';
import { useUser } from '../contexts/UserContext';

export default function InvoicePage() {
  const { auctionId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser() || {};
  const [auction, setAuction] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        if (auctionId) {
          const res = await getAuction(auctionId).catch(() => null);
          const a = res?.auction || res || null;
          if (!mounted) return;
          setAuction(a);
        }

        // try to load delivery for this auction for current user
        try {
          const del = await getMyDeliveries().catch(() => null);
          if (!mounted) return;
          const arr = del?.deliveries || del || [];
          const found = Array.isArray(arr) ? arr.find((d) => String(d.auctionId?._id || d.auctionId) === String(auctionId)) : null;
          setDelivery(found || null);
        } catch (e) {
          // ignore
        }
      } catch (err) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [auctionId]);

  const handleDownload = () => {
    const auctionData = auction || { title: 'Auction', item: {} };
    const userData = { fullname: user?.fullname || user?.username || (user?.email || '').split('@')[0], email: user?.email, phone: user?.phone };
    const deliveryData = delivery?.buyerAddress || {};
    generateInvoicePDF(auctionData, userData, deliveryData);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Invoice</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600">Back</button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white border rounded p-4">
          <div className="mb-4">
            <div className="text-sm text-gray-600">Invoice for</div>
            <div className="font-semibold text-lg">{auction?.title || auction?.item?.name || 'Auction'}</div>
            <div className="text-xs text-gray-500">Auction ID: {auction?._id || auctionId}</div>
          </div>

          <div className="mb-4 text-sm text-gray-700">
            <div><strong>Buyer:</strong> {user?.username || user?.email || 'Guest'}</div>
            <div><strong>Delivery:</strong> {delivery?.buyerAddress ? `${delivery.buyerAddress.street || ''}, ${delivery.buyerAddress.city || ''}` : 'Not provided'}</div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleDownload} className="px-4 py-2 bg-blue-600 text-white rounded">Download Invoice (PDF)</button>
            <button onClick={() => window.print()} className="px-4 py-2 border rounded">Print</button>
          </div>
        </div>
      )}
    </div>
  );
}
