import React, { useState } from "react";

export default function Feedback() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/bidsphere/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (!res.ok) throw new Error("Failed to send feedback");
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 bg-white rounded-2xl shadow-md p-8">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-3">
              Send us Feedback
            </h1>
            <p className="text-gray-600 mb-6">
              We read every message and use feedback to improve BidSphere.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={6}
                  className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  className="inline-flex items-center bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold px-5 py-2 rounded-lg transition"
                  disabled={status === "sending"}
                >
                  {status === "sending" ? "Sending..." : "Send Feedback"}
                </button>

                {status === "sent" && (
                  <div className="text-sm text-green-600">
                    Thanks — your feedback was sent.
                  </div>
                )}
                {status === "error" && (
                  <div className="text-sm text-red-600">
                    Error sending feedback. Try again later.
                  </div>
                )}
              </div>
            </form>
          </section>

          <aside className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              Need immediate help?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Visit the{" "}
              <a href="/help" className="font-medium text-amber-500">
                Help Centre
              </a>{" "}
              or email support at{" "}
              <span className="font-medium">bidsphere_support@gmail.com</span>
            </p>

            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">What to include</h4>
              <ul className="text-sm text-gray-600 list-disc ml-5 space-y-1">
                <li>Detailed description of the issue</li>
                <li>Relevant auction/item link or ID</li>
                <li>Screenshots if available</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
