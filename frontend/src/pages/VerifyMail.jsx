import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyEmail } from "../api";
import { toast } from "react-toastify";

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefillEmail = location.state?.email || "";
  const [email, setEmail] = useState(prefillEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !code) {
      toast.error("Please provide both email and OTP code");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyEmail({ email, code });
      toast.success(res.message || "Email verified successfully");
      navigate("/login");
    } catch (err) {
      toast.error(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    toast.info("Check your inbox/spam for the OTP. If you still didn't receive it, try registering again or contact support.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfbf6] p-6">
      <div className="w-full max-w-md bg-white p-8 rounded shadow">
        <h2 className="text-2xl font-bold mb-4">Verify your email</h2>
        <p className="text-sm text-gray-600 mb-6">
          Enter the 6-digit OTP sent to your email to activate your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full p-3 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">OTP Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter OTP"
              className="w-full p-3 border rounded"
              maxLength={10}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-500 text-white px-4 py-2 rounded"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button onClick={handleResend} className="text-sm text-blue-600 underline">
            Didn't receive code?
          </button>
        </div>
      </div>
    </div>
  );
}
