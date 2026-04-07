import React, { useState } from "react";
import loginImg from "../assets/login.jpg"; 
import { Link, useNavigate } from "react-router-dom";
import { loginAdmin } from "../api"; 
import { toast } from "react-toastify";

function AdminLogin() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    if (!form.email || !form.password) return "Please fill in all fields.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return "Please enter a valid email address.";
    if (form.password.length < 8) return "Password must be at least 8 characters long.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginAdmin({ email: form.email, password: form.password });

      if (res?.admin) {
        localStorage.setItem("bidsphere_admin", JSON.stringify(res.admin));
      }

      toast.success(res?.message || "Admin login successful");
      navigate("/admin/dashboard");
    } catch (err) {
      toast.error(err?.message || "Login failed");
    } finally {
      setIsSubmitting(false);
      setForm({ email: "", password: "", remember: false });
    }
  };

  return (
    <div className="flex p-10 items-center justify-center">
      <div className="w-1/2">
        <img src={loginImg} alt="Admin Login Banner" className="rounded-lg" />
      </div>

      <div className="w-1/2 pl-12">
        <h2 className="text-3xl font-bold mb-6">Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email ID"
            value={form.email}
            onChange={handleChange}
            className="w-full p-3 border rounded mb-4"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full p-3 border rounded mb-4"
          />

          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              name="remember"
              checked={form.remember}
              onChange={handleChange}
              className="mr-2"
            />
            Remember Me
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-red-500 text-white px-6 py-2 rounded w-full mb-3"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-red-600 mb-2 cursor-pointer">
          Forgot Password?
        </p>
        <p>
          Need a user account?{" "}
          <Link to="/login" className="text-blue-600">
            Login as User
          </Link>
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;