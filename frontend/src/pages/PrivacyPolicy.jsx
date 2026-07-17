import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Database } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#fdfbf6]">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8" />
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-lg opacity-90">
            Your privacy is our priority. Learn how we protect and handle your data at BidSphere.
          </p>
          <p className="text-sm opacity-75 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Introduction */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-6 h-6 text-green-600" />
            Our Commitment to Privacy
          </h2>
          <p className="text-gray-600 leading-relaxed">
            At BidSphere, we are committed to protecting your personal information and ensuring transparency 
            in how we collect, use, and share your data. This privacy policy explains our practices and 
            your rights regarding your information.
          </p>
        </div>

        {/* Information We Collect */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Database className="w-6 h-6 text-green-600" />
            Information We Collect
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Personal Information</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Name, email address, phone number</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Delivery address and payment information</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Profile photos and bio information</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Usage Information</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Bidding history and auction participation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Watchlist and saved items</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Platform activity and preferences</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* How We Use Your Information */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-6 h-6 text-green-600" />
            How We Use Your Information
          </h2>
          
          <div className="space-y-4">
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-green-800">Service Provision</h3>
              <p className="text-gray-600">To facilitate auctions, process payments, and deliver items</p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-blue-800">Platform Improvement</h3>
              <p className="text-gray-600">To enhance user experience and develop new features</p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-purple-800">Communication</h3>
              <p className="text-gray-600">To send important updates and support messages</p>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-orange-800">Security & Trust</h3>
              <p className="text-gray-600">To maintain platform safety and prevent fraud</p>
            </div>
          </div>
        </div>

        {/* Data Protection */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Protection Measures</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Encryption</h3>
              <p className="text-sm text-gray-600">All data is encrypted using industry-standard protocols</p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Secure Storage</h3>
              <p className="text-sm text-gray-600">Your information is stored in secure, access-controlled environments</p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Limited Access</h3>
              <p className="text-sm text-gray-600">Only authorized personnel can access your personal data</p>
            </div>
          </div>
        </div>

        {/* Your Rights */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Access</span>
              <p className="text-gray-600">Request access to your personal information</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Correction</span>
              <p className="text-gray-600">Update or correct inaccurate information</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">Deletion</span>
              <p className="text-gray-600">Request deletion of your personal data</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">Portability</span>
              <p className="text-gray-600">Request a copy of your data in a portable format</p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Questions About Privacy?</h2>
          <p className="text-gray-600 mb-6">
            If you have any questions about this privacy policy or how we handle your data, 
            please don't hesitate to contact us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/contact" 
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Contact Us
            </Link>
            <Link 
              to="/help" 
              className="bg-white text-green-600 border border-green-600 px-6 py-3 rounded-lg hover:bg-green-50 transition-colors"
            >
              Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
