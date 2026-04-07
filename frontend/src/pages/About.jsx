import React from "react";

export default function About() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white rounded-2xl shadow-md p-10">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
            About BidSphere
          </h1>

          <p className="text-gray-700 mb-6">
            BidSphere is an online auction platform connecting buyers and
            sellers with secure, transparent bidding. Our mission is to make
            auctions accessible, fair and easy to use.
          </p>

          <section className="mt-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              What we do
            </h2>
            <p className="text-gray-600">
              We provide listing tools, bidding, payment and delivery
              coordination to help users buy and sell in an auction-style
              marketplace.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Our values
            </h2>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Transparency — clear rules and fees.</li>
              <li>Trust — secure payments and verified sellers.</li>
              <li>Community — support collectors and small sellers.</li>
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Contact
            </h2>
            <p className="text-gray-600">
              For support, please use the{" "}
              <a href="/help" className="text-amber-500 font-medium">
                Help Centre
              </a>{" "}
              or submit feedback via our{" "}
              <a href="/feedback" className="text-amber-500 font-medium">
                Feedback
              </a>{" "}
              form.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
