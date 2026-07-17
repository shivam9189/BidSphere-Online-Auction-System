import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { UserProvider } from "./contexts/UserContext";
import Home from "./pages/Home";
import Categories from "./pages/Categories";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyMail";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import CreateAuction from "./pages/CreateAuction";
import EditAuctionDraft from "./pages/EditAuctionDraft";
import AuctionDetails from "./pages/AuctionDetails";
import SellerInfo from "./pages/SellerInfo";
import BidHistory from "./pages/BidHistory";
import Auctions from "./pages/Auctions";
import UserDashboardSeller from "./pages/UserDashboardSeller";
import MyListings from "./pages/MyListings";
import MyBids from "./pages/MyBids";
import Watchlist from "./pages/Watchlist";
import UserDashboardBuyer from "./pages/UserDashboardBuyer";
import PayFees from "./pages/PayFees";
import DeliveryCreate from "./pages/DeliveryCreate";
import InvoicePage from "./pages/Invoice";
import RegistrationFee from "./pages/RegistrationFee";
import Contact from "./pages/contact";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/AuctionSettings";
import About from "./pages/About";
import Help from "./pages/Help";
import Feedback from "./pages/Feedback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";

function App() {
  function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
      // Scroll to top on route change
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, [pathname]);
    return null;
  }
  return (
    <UserProvider>
      <div className="bg-[#fdfbf6] min-h-screen">
        <Navbar />
        <ScrollToTop />
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/categories/:name" element={<Home />} />
        <Route path="/auctions" element={<Auctions />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/verifyemail" element={<VerifyEmail />} />
        <Route path="/create-auction" element={<CreateAuction />} />
        <Route path="/auction/:id" element={<AuctionDetails />} />
        <Route path="/seller/:sellerId" element={<SellerInfo />} />
        <Route path="/auction/:id/bid-history" element={<BidHistory />} />
        <Route path="/seller-dashboard" element={<UserDashboardSeller />} />
        <Route path="/my-listings" element={<MyListings />} />
        <Route path="/my-bids" element={<MyBids />} />
        <Route path="/watchlist" element={<Watchlist />} />

        <Route path="/registration-fee" element={<RegistrationFee />} />
        <Route
          path="/registration-fee/:auctionId"
          element={<RegistrationFee />}
        />
        <Route path="/auction/:id/pay" element={<PayFees />} />
        <Route path="/invoice/:auctionId" element={<InvoicePage />} />
        <Route
          path="/delivery/create/:auctionId"
          element={<DeliveryCreate />}
        />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/edit-auction-draft/:id" element={<EditAuctionDraft />} />
        <Route path="/buyer-dashboard" element={<UserDashboardBuyer />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/about" element={<About />} />
        <Route path="/help" element={<Help />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        </Routes>
        <Footer />
      </div>
    </UserProvider>
  );
}

export default App;
