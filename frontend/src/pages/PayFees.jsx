import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import {
  getAuction,
  createWinningUpiPayment,
  createWinningCodPayment,
  getPayment,
  verifyAuctionPayment,
} from '../api';
import { useUser } from '../contexts/UserContext';

function formatINR(v) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(v));
  } catch {
    return `₹${Number(v).toFixed(2)}`;
  }
}

export default function PayFees() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  const [auction, setAuction] = useState(null);
  const { user: ctxUser, loading: userLoading } = useUser() || {};

  const [payment, setPayment] = useState(null);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [txnId, setTxnId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // interval id for polling payment status
  const [pollingId, setPollingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      setLoading(true);
      try {
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
    init();
    return () => (mounted = false);
  }, [routeId]);

  const finalAmount = (() => {
    if (!auction) return 0;
    return auction.winningPrice ?? auction.finalPrice ?? auction.currentBid ?? auction.current ?? auction.startingPrice ?? 0;
  })();

  async function createCodPayment(e) {
    e && e.preventDefault();
    setError(null);
    if (!ctxUser) return navigate('/login');
    if (!routeId) return setError('Missing auction id');

    try {
      setCreating(true);
      const res = await createWinningCodPayment(routeId);
      const created = res?.payment || res;
      setPayment(created || null);
      startPaymentPolling(created || null);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to create COD payment');
    } finally {
      setCreating(false);
    }
  }

  async function createUpiPayment(e) {
    e && e.preventDefault();
    setError(null);
    if (!ctxUser) return navigate('/login');
    if (!routeId) return setError('Missing auction id');

    try {
      setCreating(true);
      const res = await createWinningUpiPayment(routeId);
      const created = res?.payment || res;
      setPayment(created || null);
      startPaymentPolling(created || null);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to create UPI payment');
    } finally {
      setCreating(false);
    }
  }

  async function submitVerification(e) {
    e && e.preventDefault();
    setError(null);
    if (!payment) return setError('No payment created');
    if (!txnId) return setError('Enter transaction id');

    try {
      setVerifying(true);
      await verifyAuctionPayment(routeId, payment._id || payment.paymentId, { upiAccountName: payerName || ctxUser?.username || ctxUser?.fullname || '', upiTxnId: txnId });
      toast.info('Verification requested — admin will verify shortly');
      navigate(`/auction/${routeId}`);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }

  function startPaymentPolling(paymentObj) {
    if (!paymentObj) return;
    const pid = paymentObj._id || paymentObj.paymentId;
    if (!pid || !routeId) return;
    if (pollingId) {
      clearInterval(pollingId);
      setPollingId(null);
    }

    const id = setInterval(async () => {
      try {
        const res = await getPayment(routeId, pid);
        const latest = res?.payment || null;
        if (latest) setPayment(latest);
        if (latest && (latest.status || '').toUpperCase() === 'SUCCESS') {
          clearInterval(id);
          setPollingId(null);
          toast.success('Payment confirmed by admin — please provide delivery details from your dashboard.');
        }
      } catch (err) {
        // ignore polling errors
      }
    }, 5000);

    setPollingId(id);
  }

  useEffect(() => {
    return () => {
      if (pollingId) clearInterval(pollingId);
    };
  }, [pollingId]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Pay Amount</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {error && <div className="mb-4 text-red-600">{error}</div>}

          <div className="bg-white p-4 rounded shadow space-y-4">
            <div>
              <div className="text-sm text-gray-600">Auction</div>
              <div className="font-medium">{auction ? auction.title || auction.item?.name : routeId}</div>
            </div>

            <div>
              <div className="text-sm text-gray-600">Amount Due</div>
              <div className="font-medium">{formatINR(finalAmount)}</div>
            </div>

            <div>
              <div className="text-sm text-gray-600">Choose Payment Method</div>
              <div className="mt-2 flex gap-3">
                <button onClick={createCodPayment} disabled={creating} className={`px-4 py-2 rounded text-white ${creating ? 'bg-gray-400' : 'bg-yellow-600 hover:bg-yellow-700'}`}>
                  {creating ? 'Processing...' : 'Pay on Delivery (COD)'}
                </button>
                <button onClick={createUpiPayment} disabled={creating} className={`px-4 py-2 rounded text-white ${creating ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
                  {creating ? 'Processing...' : 'Pay with UPI'}
                </button>
              </div>
            </div>
          </div>

          {payment && (
            <div className="mt-6 bg-white p-4 rounded shadow">
              <h3 className="font-semibold">Payment</h3>
              <div className="mt-2">ID: <span className="font-mono">{payment._id || payment.paymentId}</span></div>
              <div className="mt-1">Amount: {formatINR(payment.amount ?? finalAmount)}</div>
              <div className="mt-1">Status: {payment.status || 'PENDING'}</div>

              {payment.upiLink && (
                <>
                  <div className="mt-2">
                    <a href={payment.upiLink} target="_blank" rel="noreferrer" className="text-blue-600">Open UPI link</a>
                    <button className="ml-2 px-2 py-1 bg-gray-100 rounded" onClick={() => navigator.clipboard?.writeText(payment.upiLink)}>Copy</button>
                  </div>

                  <div className="mt-4 flex flex-col items-center">
                    <div className="text-sm text-gray-600 mb-2">Scan QR Code to Pay</div>
                    <QRCode value={payment.upiLink} size={180} />
                  </div>
                </>
              )}

              {payment.upiLink && (
                <>
                  <div className="mt-4">
                    <label className="text-sm block mb-1">UPI TXN ID</label>
                    <input value={txnId} onChange={(e) => setTxnId(e.target.value)} className="w-full p-2 border rounded" />
                  </div>
                  <div className="mt-2">
                    <label className="text-sm block mb-1">Payer Name (optional)</label>
                    <input value={payerName} onChange={(e) => setPayerName(e.target.value)} className="w-full p-2 border rounded" placeholder={ctxUser?.username || ctxUser?.fullname || ''} />
                  </div>
                  <div className="mt-4">
                    <button onClick={submitVerification} disabled={verifying || !txnId} className={`px-4 py-2 rounded text-white ${verifying || !txnId ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
                      {verifying ? 'Submitting...' : 'Submit Verification Request'}
                    </button>
                  </div>
                </>
              )}

              {payment && !payment.upiLink && (
                <div className="mt-4 text-sm text-gray-700">Your COD payment has been recorded. The admin will confirm and update the order.</div>
              )}

              <div className="mt-3 text-sm text-gray-600">After admin confirmation, please provide delivery details from your Buyer Dashboard.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

