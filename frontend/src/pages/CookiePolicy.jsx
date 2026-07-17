import React from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Settings, Shield, CheckCircle, XCircle, Info } from 'lucide-react';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-[#fdfbf6]">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <Cookie className="w-8 h-8" />
            <h1 className="text-4xl font-bold">Cookie Policy</h1>
          </div>
          <p className="text-lg opacity-90">
            Learn how BidSphere uses cookies to enhance your experience and keep our platform secure.
          </p>
          <p className="text-sm opacity-75 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* What are Cookies */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Cookie className="w-6 h-6 text-orange-600" />
            What Are Cookies?
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Cookies are small text files stored on your device when you visit websites. They help us 
            provide better services by remembering your preferences and improving site functionality.
          </p>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-gray-700">
              <strong>Think of cookies as memory cards</strong> for websites - they remember who you are, 
              what you like, and help us personalize your experience on BidSphere.
            </p>
          </div>
        </div>

        {/* Types of Cookies We Use */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-6 h-6 text-orange-600" />
            Cookies We Use
          </h2>
          
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg">Essential Cookies</h3>
              <p className="text-gray-600 mb-2">BidSphere uses only essential cookies required for authentication.</p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">User Authentication Token</h4>
                    <p className="text-sm text-gray-600">Keeps you logged in as a regular user. Contains a secure JWT token.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg">What We DON'T Use</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm">No tracking cookies</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm">No advertising cookies</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm">No analytics cookies</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm">No third-party cookies</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm">
                <strong>Simple & Minimal:</strong> BidSphere only uses 1 essential cookie for user authentication. 
                We don't track your behavior, show ads, or use analytics. Your privacy is important to us.
              </p>
            </div>
          </div>
        </div>

        {/* Cookie Duration */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Cookie Duration</h2>
          
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">User Authentication Cookie</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Duration: 7 days</span>
                </div>
                <p className="text-sm text-gray-600">
                  Your login session remains active for 7 days. You'll stay logged in even if you close your browser.
                  After 7 days, you'll need to log in again.
                </p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Admin Authentication Cookie</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Duration: 24 hours</span>
                </div>
                <p className="text-sm text-gray-600">
                  Admin sessions expire after 24 hours for security. This ensures admin access remains secure 
                  and requires regular re-authentication.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800 mb-1">Security Features</h4>
                  <p className="text-gray-700 text-sm">
                    Both cookies use secure settings: HttpOnly (prevents JavaScript access), 
                    Secure (HTTPS only), and SameSite (prevents cross-site requests).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Managing Cookies */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-6 h-6 text-orange-600" />
            Managing Your Cookie Preferences
          </h2>
          
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold mb-4">You Have Control</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800">Browser Settings</h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></span>
                      <span>Block all cookies or just third-party cookies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></span>
                      <span>Clear existing cookies when you close browser</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></span>
                      <span>Set exceptions for trusted sites like BidSphere</span>
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800">Our Cookie Center</h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></span>
                      <span>Customize cookie preferences anytime</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></span>
                      <span>Withdraw consent for optional cookies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></span>
                      <span>View detailed cookie information</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-orange-800 mb-1">Important Note</h4>
                  <p className="text-gray-700 text-sm">
                    Blocking essential cookies may prevent you from using some features of BidSphere, 
                    such as placing bids or managing your account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Third-Party Cookies */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Third-Party Cookies</h2>
          
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold text-lg">No Third-Party Cookies</h3>
              </div>
              <p className="text-gray-600">
                BidSphere does not use any third-party cookies. We don't work with external services that place cookies on your device.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>Complete Privacy:</strong> Since we only use one essential authentication cookie, there are no third-party cookies from analytics, advertising, social media, or payment processors.
              </p>
            </div>
          </div>
        </div>

        {/* Updates to Policy */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Updates to This Policy</h2>
          <p className="text-gray-600">
            We may update this cookie policy from time to time to reflect changes in our practices 
            or for other operational, legal, or regulatory reasons. We will notify you of any 
            significant changes by posting the new policy on this page and updating the "Last updated" date.
          </p>
        </div>

        {/* Contact */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Questions About Cookies?</h2>
          <p className="text-gray-600 mb-6">
            If you have any questions about our use of cookies or need help managing your preferences, 
            our support team is here to assist you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/contact" 
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Contact Support
            </Link>
            <Link 
              to="/help" 
              className="bg-white text-orange-600 border border-orange-600 px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors"
            >
              Visit Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
