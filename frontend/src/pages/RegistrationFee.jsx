import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import {
  getAuction,
  createRegistrationPayment,
  verifyAuctionPayment,
} from '../api';
import { useUser } from '../contexts/UserContext';
import { toast } from 'react-toastify';

function formatINR(v) {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(v)); }
  catch { return `₹${Number(v).toFixed(2)}`; }
}

export default function RegistrationFee() {
  const { auctionId: routeId } = useParams();
  const navigate = useNavigate();

  const [auction, setAuction] = useState(null);
  const [user, setUser] = useState(null);

  const [payerVpa, setPayerVpa] = useState('');
  const [payment, setPayment] = useState(null);
  const [txnId, setTxnId] = useState('');
  const [payerName, setPayerName] = useState('');

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  const { user: ctxUser, loading: userLoading } = useUser() || {};

  useEffect(() => {
    let mounted = true;
    async function init() {
      setLoading(true);
      try {
        if (ctxUser) {
          setUser(ctxUser);
          if (ctxUser?.upi || ctxUser?.vpa || ctxUser?.payeeVpa) setPayerVpa(ctxUser?.upi || ctxUser?.vpa || ctxUser?.payeeVpa);
        }
        if (routeId) {
          const aucRes = await getAuction(routeId).catch(() => null);
          if (!mounted) return;
          setAuction(aucRes?.auction || aucRes || null);
        }
      } catch (err) {
        console.error(err);
        setError(err?.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    // wait for context to resolve
    if (userLoading) return;
    init();
    return () => (mounted = false);
  }, [routeId, ctxUser, userLoading]);

  const registrationFee = (() => {
    if (!auction) return 0;
    if (typeof auction.registrationFee === 'number' && !isNaN(auction.registrationFee)) return auction.registrationFee;
    if (auction.startingPrice) return Number(auction.startingPrice) * 0.01;
    return 0;
  })();

  const onCreate = async (e) => {
    e && e.preventDefault();
    setError(null);
    if (!user) return navigate('/login');
    if (!routeId) return setError('Missing auction id');
    if (!payerVpa) return setError('Enter your UPI id');

    try {
      setCreating(true);
      const res = await createRegistrationPayment(routeId);
      const created = res?.payment || res;
      setPayment(created || null);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to create payment');
    } finally {
      setCreating(false);
    }
  };

  const onVerify = async (e) => {
    e && e.preventDefault();
    setError(null);
    if (!payment) return setError('No payment');
    if (!txnId) return setError('Enter transaction id');

    try {
      setVerifying(true);
      await verifyAuctionPayment(routeId, payment._id || payment.paymentId, { upiAccountName: payerName || payerVpa, upiTxnId: txnId });
      toast.info('Verification requested');
      navigate(`/auction/${routeId}`);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Registration Fee</h2>
      {loading ? <div>Loading...</div> : (
        <>
          {error && <div className="mb-4 text-red-600">{error}</div>}

          <div className="bg-white p-4 rounded shadow space-y-4">
            <div>
              <div className="text-sm text-gray-600">Auction</div>
              <div className="font-medium">{auction ? auction.title || auction.item?.name : routeId}</div>
            </div>

            <div>
              <div className="text-sm text-gray-600">Amount</div>
              <div className="font-medium">{formatINR(Math.max(1, registrationFee))}</div>
            </div>

            <div>
              <label className="text-sm block mb-1">Your UPI ID</label>
              <input value={payerVpa} onChange={(e) => setPayerVpa(e.target.value)} className="w-full p-2 border rounded" placeholder="yourupi@bank" />
            </div>

            {/* Recipient UPI is not fetched from backend; use UPI link returned in payment details */}

            <div>
              <button onClick={onCreate} disabled={creating || !payerVpa} className={`px-4 py-2 rounded text-white ${creating || !payerVpa ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {creating ? 'Creating...' : 'Create Registration Payment'}
              </button>
            </div>
          </div>

          {payment && (
            <div className="mt-6 bg-white p-4 rounded shadow">
              <h3 className="font-semibold">Payment</h3>
              <div className="mt-2">ID: <span className="font-mono">{payment._id || payment.paymentId}</span></div>
              <div className="mt-1">Amount: {formatINR(Math.max(1, payment.amount ?? registrationFee))}</div>
              <div className="mt-1">Status: {payment.status || 'PENDING'}</div>

              {payment.upiLink && (
                <div className="mt-2">
                  <a href={payment.upiLink} target="_blank" rel="noreferrer" className="text-blue-600">Open UPI link</a>
                  <button className="ml-2 px-2 py-1 bg-gray-100 rounded" onClick={() => navigator.clipboard?.writeText(payment.upiLink)}>Copy</button>
                </div>
              )}

              {payment.upiLink && (
                <div className="mt-4 flex flex-col items-center">
                  <div className="text-sm text-gray-600 mb-2">Scan QR Code to Pay</div>
                  <QRCode value={payment.upiLink} size={200} />
                </div>
              )}

              <div className="mt-4">
                <label className="text-sm block mb-1">UPI TXN ID</label>
                <input value={txnId} onChange={(e) => setTxnId(e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div className="mt-2">
                <label className="text-sm block mb-1">Payer Name (optional)</label>
                <input value={payerName} onChange={(e) => setPayerName(e.target.value)} className="w-full p-2 border rounded" placeholder={payerVpa} />
              </div>

              <div className="mt-4">
                <button onClick={onVerify} disabled={verifying || !txnId} className={`px-4 py-2 rounded text-white ${verifying || !txnId ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
                  {verifying ? 'Submitting...' : 'Submit Verification Request'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
