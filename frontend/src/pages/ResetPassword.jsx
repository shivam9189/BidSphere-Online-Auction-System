import React, { useEffect, useState } from "react";
import { resetPassword } from "../api";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get("token") || "";
    const e = params.get("email") || "";
    setToken(t);
    setEmail(e);
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !token || !newPassword || !confirmNewPassword) {
      toast.error("All fields are required");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword({ token, email, newPassword: newPassword.trim(), confirmNewPassword: confirmNewPassword.trim() });
      toast.success(res?.message || "Password reset successful");
      navigate("/login");
    } catch (err) {
      const msg = err?.message || err?.msg || (typeof err === 'string' ? err : JSON.stringify(err));
      toast.error(msg || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfbf6] p-6">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Reset Password</h2>
        <input
          type="email"
          placeholder="Registered Email"
          className="w-full p-3 border rounded mb-3 bg-gray-100"
          value={email}
          readOnly
        />
        <input type="password" placeholder="New Password" className="w-full p-3 border rounded mb-3" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} />
        <input type="password" placeholder="Confirm New Password" className="w-full p-3 border rounded mb-3" value={confirmNewPassword} onChange={(e)=>setConfirmNewPassword(e.target.value)} />
        <button disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded w-full">
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}