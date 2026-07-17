import React, { useState } from "react";
import registerImg from "../assets/register.jpg";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api";
import { toast } from "react-toastify";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      toast.error("Please fill out all fields.");
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
      const res = await registerUser({
        username: form.name,
        email: form.email,
        password: form.password,
      });

      toast.success(res.message || "Verification OTP sent to your email");
      navigate("/verifyemail", { state: { email: form.email } });
    } catch (err) {
      toast.error(err.message || "Registration failed");
    } finally {
      setForm({ name: "", email: "", password: "" });
    }
  };

  return (
    <div className="flex p-10 items-center justify-center">   
      <div className="w-1/2">
        <img src={registerImg} alt="Register Banner" className="rounded-lg" />
      </div>

      <div className="w-1/2 pl-12">
        <h2 className="text-3xl font-bold mb-6">Create an account</h2>
        <form onSubmit={handleSubmit} noValidate>
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={form.name}
            onChange={handleChange}
            className="w-full p-3 border rounded mb-4"
          />
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

          <button
            type="submit"
            className="bg-red-500 text-white px-6 py-2 rounded w-full mb-3"
          >
            Create Account
          </button>
        </form>

        <p>
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
