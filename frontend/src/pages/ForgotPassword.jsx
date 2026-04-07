import React, { useState } from "react";
import { requestPasswordReset } from "../api";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { toast.error("Enter your registered email"); return; }
    setLoading(true);
    try {
      const res = await requestPasswordReset({ email });
      toast.success(res.message || "Reset link sent to your email");
      navigate("/login");
    } catch (err) {
      toast.error(err?.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfbf6] p-6">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Forgot Password</h2>
        <input
          type="email"
          placeholder="Enter your registered email"
          className="w-full p-3 border rounded mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={loading} className="bg-red-500 text-white px-6 py-2 rounded w-full">
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </div>
  );
}