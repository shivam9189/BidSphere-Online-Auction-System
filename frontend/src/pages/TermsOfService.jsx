import React from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Shield, Users, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#fdfbf6]">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <Gavel className="w-8 h-8" />
            <h1 className="text-4xl font-bold">Terms of Service</h1>
          </div>
          <p className="text-lg opacity-90">
            Welcome to BidSphere! These terms govern your use of our auction platform and services.
          </p>
          <p className="text-sm opacity-75 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Agreement */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-blue-600" />
            Agreement to Terms
          </h2>
          <p className="text-gray-600 leading-relaxed">
            By accessing and using BidSphere, you agree to be bound by these Terms of Service. 
            If you disagree with any part of these terms, you may not access our services.
          </p>
        </div>

        {/* User Responsibilities */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            User Responsibilities
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Account Security</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Maintain accurate and up-to-date information</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Keep your password secure and confidential</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Notify us immediately of unauthorized access</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Conduct Guidelines</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Act honestly and in good faith</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Don't engage in fraudulent activities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Respect other users and the platform</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Auction Rules */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Gavel className="w-6 h-6 text-blue-600" />
            Auction Rules & Guidelines
          </h2>
          
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-blue-800">Bidding Rules</h3>
              <ul className="space-y-1 text-gray-600 text-sm">
                <li>• All bids are binding and cannot be retracted</li>
                <li>• You must have sufficient funds to honor your bids</li>
                <li>• Bid increment rules apply to all auctions</li>
                <li>• Automatic bidding may be used within limits</li>
              </ul>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-green-800">Payment Requirements</h3>
              <ul className="space-y-1 text-gray-600 text-sm">
                <li>• Winners must complete payment within specified timeframe</li>
                <li>• Payment methods must be verified and valid</li>
                <li>• Platform fees apply to all successful transactions</li>
                <li>• Late payments may result in account suspension</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-purple-800">Seller Guidelines</h3>
              <ul className="space-y-1 text-gray-600 text-sm">
                <li>• Items must be accurately described</li>
                <li>• Photos must represent actual condition</li>
                <li>• Shipping must be arranged promptly</li>
                <li>• Returns policy must be clearly stated</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Prohibited Activities */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-600" />
            Prohibited Activities
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <span className="text-red-600 font-bold">✗</span>
                <span className="text-gray-700">Shill bidding (bidding on your own items)</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <span className="text-red-600 font-bold">✗</span>
                <span className="text-gray-700">Listing prohibited or illegal items</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <span className="text-red-600 font-bold">✗</span>
                <span className="text-gray-700">Manipulating auction prices or outcomes</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <span className="text-red-600 font-bold">✗</span>
                <span className="text-gray-700">Using false or misleading information</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <span className="text-red-600 font-bold">✗</span>
                <span className="text-gray-700">Interfering with other users' transactions</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <span className="text-red-600 font-bold">✗</span>
                <span className="text-gray-700">Circumventing platform fees or policies</span>
              </div>
            </div>
          </div>
        </div>

        {/* Service Availability */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            Service Availability & Modifications
          </h2>
          
          <div className="space-y-3 text-gray-600">
            <p>We strive to maintain 99.9% uptime but cannot guarantee uninterrupted service.</p>
            <p>We reserve the right to modify, suspend, or discontinue services at any time.</p>
            <p>Users will be notified of significant changes to these terms or services.</p>
            <p>Platform features and pricing may change with appropriate notice.</p>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Questions About Our Terms?</h2>
          <p className="text-gray-600 mb-6">
            If you need clarification on any part of these terms or have questions about your rights and responsibilities, we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/contact" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Contact Support
            </Link>
            <Link 
              to="/help" 
              className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
