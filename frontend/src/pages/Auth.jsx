import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function OtpPage() {
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();

  const handleVerify = (e) => {
    e.preventDefault();
    if (otp === "1234") {
      toast.success("✅ OTP Verified Successfully!");
      navigate("/login"); 
    } else {
      toast.error("Invalid OTP! Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fefaf5]">
      <div className="bg-white p-10 rounded-2xl shadow-lg flex flex-col items-center w-[400px] text-center">
        <h2 className="text-3xl font-bold mb-4">Verify OTP</h2>
        <p className="mb-6 text-gray-600">
          Enter the 4-digit OTP sent to your registered email.
        </p>

        <form onSubmit={handleVerify} className="flex flex-col items-center w-full">
          <input
            type="text"
            maxLength={4}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            className="text-center tracking-widest text-xl border-b border-gray-400 focus:outline-none py-2 mb-6 w-3/4"
          />

          <button
            type="submit"
            className="bg-red-600 text-white py-2 px-6 rounded-md hover:bg-red-700 w-3/4"
          >
            Verify OTP
          </button>
        </form>

        <p className="text-sm mt-4">
          Didn’t receive the OTP?{" "}
          <button
            type="button"
            className="text-blue-600 underline"
            onClick={() => toast.info("OTP Resent!")}
          >
            Resend OTP
          </button>
        </p>
      </div>
    </div>
  );
}

export default OtpPage;
