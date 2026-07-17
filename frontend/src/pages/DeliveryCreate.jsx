import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createDelivery, getAuction } from '../api';
import { useUser } from '../contexts/UserContext';

export default function DeliveryCreate() {
  const { auctionId } = useParams();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('paymentId') || null;
  const navigate = useNavigate();

  const [auction, setAuction] = useState(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { user: ctxUser, loading: userLoading } = useUser() || {};

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const u = ctxUser || null;
        if (u && mounted) {
          if (u.address) {
            setStreet(u.address.street || '');
            setCity(u.address.city || '');
            setStateVal(u.address.state || '');
            setPostalCode(u.address.postalCode || '');
            setCountry(u.address.country || '');
          }
          setName(u.fullname || u.username || '');
        }

        if (auctionId) {
          const a = await getAuction(auctionId).catch(() => null);
          if (!mounted) return;
          setAuction(a?.auction || a || null);
        }
      } catch (err) {
        console.error(err);
      }
    }

    // Delay running until user context has resolved to avoid overwriting user fields
    if (userLoading) {
      // run once userLoading flips to false
      const id = setInterval(() => {
        if (!userLoading) {
          clearInterval(id);
          init();
        }
      }, 50);
      return () => { mounted = false; clearInterval(id); };
    }

    init();
    return () => (mounted = false);
  }, [auctionId, ctxUser, userLoading]);

  async function onSubmit(e) {
    e && e.preventDefault();
    setError(null);
    if (!name || !phone || !street || !city || !stateVal || !postalCode || !country) {
      return setError('Please fill all address fields');
    }
    try {
      setSaving(true);
      const payload = {
        auctionId: auctionId,
        buyerAddress: {
          name, phone, street, city, state: stateVal, postalCode, country
        },
        paymentId: paymentId || null
      };
      const res = await createDelivery(payload);
      if (res && (res.success || res.delivery)) {
        toast.success(res.message || 'Delivery saved');
        navigate('/buyer-dashboard');
      } else {
        setError(res?.message || 'Failed to save');
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Provide Delivery Details</h2>
      {auction && <div className="mb-4">For: <strong>{auction.title || auction.item?.name}</strong></div>}
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <form onSubmit={onSubmit} className="bg-white p-4 rounded shadow space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full p-2 border rounded" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full p-2 border rounded" />
        <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street address" className="w-full p-2 border rounded" />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full p-2 border rounded" />
        <input value={stateVal} onChange={(e) => setStateVal(e.target.value)} placeholder="State" className="w-full p-2 border rounded" />
        <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Postal code" className="w-full p-2 border rounded" />
        <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="w-full p-2 border rounded" />
        <div className="flex items-center gap-2">
          <button className={`px-4 py-2 rounded text-white ${saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`} disabled={saving} type="submit">{saving ? 'Saving...' : 'Save Delivery'}</button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded border">Cancel</button>
        </div>
      </form>
    </div>
  );
}
