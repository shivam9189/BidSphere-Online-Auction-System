import React, { useState } from "react";
import loginImg from "../assets/login.jpg";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, getCurrentUser } from "../api"; 
import { toast } from "react-toastify";

function Login() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      toast.error("Please fill in all fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    try {
      const res = await loginUser({ email: form.email, password: form.password });

      // store whatever server returned immediately (legacy clients expect this)
      if (res.user) {
        localStorage.setItem("bidsphere_user", JSON.stringify(res.user));
      }

      // fetch authoritative user from /me and overwrite localStorage if available
      try {
        const me = await getCurrentUser();
        if (me && me.user) {
          localStorage.setItem("bidsphere_user", JSON.stringify(me.user));
        }
      } catch (err) {
        // ignore - fallback to earlier stored user
      }

      toast.success(res.message || "Logged in successfully");

      navigate("/");
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setForm({ email: "", password: "", remember: false });
    }
  };

  return (
    <div className="flex p-10 items-center justify-center">
      
      <div className="w-1/2">
        <img src={loginImg} alt="Login Banner" className="rounded-lg" />
      </div>

     
      <div className="w-1/2 pl-12">
        <h2 className="text-3xl font-bold mb-6">Log in</h2>
        <form onSubmit={handleSubmit} noValidate>
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
            className="bg-red-500 text-white px-6 py-2 rounded w-full mb-3"
          >
            Log In
          </button>
        </form>

        <div className="flex items-center justify-start mb-2">
          <p className="text-sm text-red-600 cursor-pointer">
            <Link to="/forgot-password">Forgot Password?</Link>
          </p>
        </div>
        <p>
          Don’t have an account?{" "}
          <Link to="/register" className="text-blue-600">
            Register Here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
