import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, BookOpen, MessageCircle, Mail, Clock, AlertCircle, HelpCircle, Star, Users, CreditCard, Package, Shield, Play, ExternalLink } from "lucide-react";

export default function Help() {
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const helpCategories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <BookOpen className="w-5 h-5" />,
      color: 'blue',
      items: [
        { title: 'Create Account', description: 'Sign up and start bidding', link: '/register' },
        { title: 'Verify Email', description: 'Confirm your email address', link: '/verifyemail' },
        { title: 'Profile Settings', description: 'Manage your account details', link: '/settings' },
        { title: 'Buyer Dashboard', description: 'View your bids and orders', link: '/buyer-dashboard' }
      ]
    },
    {
      id: 'bidding',
      title: 'How to Bid',
      icon: <Users className="w-5 h-5" />,
      color: 'green',
      items: [
        { title: 'Browse Auctions', description: 'Find items to bid on', link: '/auctions' },
        { title: 'Place Bids', description: 'Make bids on live auctions', link: '/auctions' },
        { title: 'Watchlist', description: 'Save interesting auctions', link: '/watchlist' },
        { title: 'Bid History', description: 'View all your past bids', link: '/my-bids' }
      ]
    },
    {
      id: 'payments',
      title: 'Payments & Billing',
      icon: <CreditCard className="w-5 h-5" />,
      color: 'purple',
      items: [
        { title: 'Registration Fee', description: 'Pay your registration fee', link: '/registration-fee' },
        { title: 'Platform Fees', description: 'Understand our fee structure', link: '/terms' },
        { title: 'Privacy Policy', description: 'How we protect your data', link: '/privacy' }
      ]
    },
    {
      id: 'delivery',
      title: 'Delivery & Shipping',
      icon: <Package className="w-5 h-5" />,
      color: 'orange',
      items: [
        { title: 'Add Delivery Address', description: 'Set your shipping address', link: '/delivery/create' },
        { title: 'Track Orders', description: 'Monitor your deliveries', link: '/buyer-dashboard' }
      ]
    },
    {
      id: 'safety',
      title: 'Safety & Security',
      icon: <Shield className="w-5 h-5" />,
      color: 'red',
      items: [
        { title: 'Account Security', description: 'Keep your account safe', link: '/settings' },
        { title: 'Privacy Policy', description: 'Your data protection rights', link: '/privacy' },
        { title: 'Report Issues', description: 'Get help with problems', link: '/feedback' },
        { title: 'Terms of Service', description: 'Platform rules and policies', link: '/terms' }
      ]
    }
  ];

  const faqs = [
    {
      question: "How do I place a bid?",
      answer: "To place a bid, first find an auction you're interested in. Enter your bid amount in the bid box, ensuring it meets the minimum bid requirement. Click 'Place Bid' and confirm your action. You'll receive a confirmation if your bid was successful."
    },
    {
      question: "What is auto-bid and how does it work?",
      answer: "Auto-bid automatically places bids on your behalf up to your maximum amount. You set the maximum you're willing to pay, and the system bids for you when someone else bids, maintaining your winning position until your maximum is reached."
    },
    {
      question: "How do I pay for an auction I won?",
      answer: "After winning, go to your dashboard's 'Unpaid Wins' section. Click 'Pay Now' on the auction, select your payment method, and complete the payment process. You'll receive a confirmation and can add delivery details."
    },
    {
      question: "Can I retract a bid?",
      answer: "Generally, bids are binding and cannot be retracted. However, if you made an accidental bid, contact support immediately. Retractions are only considered in exceptional circumstances and may be subject to review."
    },
    {
      question: "How long does delivery take?",
      answer: "Standard delivery typically takes 5-7 business days after payment confirmation. International shipping may take 10-15 business days. You can track your order status in your dashboard's 'Deliveries' section."
    },
    {
      question: "What if the item doesn't match the description?",
      answer: "If your item doesn't match the auction description, contact us within 48 hours of delivery. We'll mediate between you and the seller to resolve the issue. Document the discrepancies with photos."
    }
  ];

  const quickActions = [
    { title: "Track Your Order", icon: <Package className="w-5 h-5" />, link: "/buyer-dashboard", color: "blue" },
    { title: "Contact Support", icon: <MessageCircle className="w-5 h-5" />, link: "/contact", color: "green" },
    { title: "Report an Issue", icon: <AlertCircle className="w-5 h-5" />, link: "/feedback", color: "red" },
    { title: "View Auction Rules", icon: <BookOpen className="w-5 h-5" />, link: "/terms", color: "purple" }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
      red: 'bg-red-50 text-red-600 border-red-200'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-[#fdfbf6]">
      {/* Quick Actions */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Help Centre</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className={`${getColorClasses(action.color)} border rounded-lg p-4 hover:shadow-md transition-all duration-200 group`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-2 group-hover:scale-110 transition-transform">{action.icon}</div>
                <span className="text-sm font-medium">{action.title}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Demo Video Section */}
      <div className="max-w-6xl mx-auto px-6 pb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">Watch Our Demo Video</h2>
              <p className="text-gray-600 mb-6">
                Learn how to use BidSphere like a pro! Our comprehensive demo covers everything from creating auctions to winning bids.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Watch on YouTube
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="w-48 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Play className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <div className="text-sm font-medium text-gray-600">5:30</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Help Categories */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Browse Help Topics</h2>
            
            {helpCategories.map((category) => (
              <div key={category.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <button
                  onClick={() => toggleSection(category.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`${getColorClasses(category.color)} p-2 rounded-lg`}>
                      {category.icon}
                    </div>
                    <span className="font-semibold text-lg">{category.title}</span>
                  </div>
                  {expandedSection === category.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                
                {expandedSection === category.id && (
                  <div className="px-6 py-4 border-t">
                    <div className="space-y-3">
                      {category.items.map((item, index) => (
                        <Link
                          key={index}
                          to={item.link}
                          className="block p-3 rounded-lg hover:bg-gray-50 group transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-4 h-4 text-gray-400" />
                            <div className="flex-1">
                              <div className="text-gray-700 group-hover:text-indigo-600 font-medium">{item.title}</div>
                              <div className="text-sm text-gray-500">{item.description}</div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
            
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="space-y-4">
                {faqs.slice(0, 4).map((faq, index) => (
                  <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0">
                    <button
                      onClick={() => toggleFAQ(index)}
                      className="w-full text-left flex items-start justify-between gap-2 hover:text-indigo-600 transition-colors"
                    >
                      <span className="font-medium text-sm">{faq.question}</span>
                      {expandedFAQ === index ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      )}
                    </button>
                    {expandedFAQ === index && (
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-12 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Still Need Help?</h2>
            <p className="text-gray-600 mb-6">
              Our support team is here to help you with any questions or issues
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Contact Support
              </Link>
              <Link
                to="/feedback"
                className="flex items-center justify-center gap-2 bg-white text-indigo-600 border border-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <Mail className="w-5 h-5" />
                Send Feedback
              </Link>
            </div>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="bg-white rounded-lg p-4">
                <Clock className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <h4 className="font-semibold mb-1">Response Time</h4>
                <p className="text-sm text-gray-600">Usually within 24 hours</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <Users className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <h4 className="font-semibold mb-1">Expert Team</h4>
                <p className="text-sm text-gray-600">Dedicated support specialists</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <Star className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <h4 className="font-semibold mb-1">Satisfaction Guaranteed</h4>
                <p className="text-sm text-gray-600">We're here to help you succeed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
