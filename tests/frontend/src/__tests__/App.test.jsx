// Verifies top-level routing and scroll-to-top behavior for the App shell.
import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';

const stub = vi.hoisted(() => {
  return (label) => ({
    default: () => <div data-testid={label.replace(/\s+/g, '-')}>{label}</div>,
  });
});

vi.mock('../components/Navbar', () => stub('Navbar Component'));
vi.mock('../components/Footer', () => stub('Footer Component'));

vi.mock('../pages/Home', () => stub('Home Page'));
vi.mock('../pages/Categories', () => stub('Categories Page'));
vi.mock('../pages/Login', () => stub('Login Page'));
vi.mock('../pages/Register', () => stub('Register Page'));
vi.mock('../pages/VerifyMail', () => stub('Verify Mail Page'));
vi.mock('../pages/AdminDashboard', () => stub('Admin Dashboard Page'));
vi.mock('../pages/AdminLogin', () => stub('Admin Login Page'));
vi.mock('../pages/CreateAuction', () => stub('Create Auction Page'));
vi.mock('../pages/EditAuctionDraft', () => stub('Edit Auction Draft Page'));
vi.mock('../pages/AuctionDetails', () => stub('Auction Details Page'));
vi.mock('../pages/SellerInfo', () => stub('Seller Info Page'));
vi.mock('../pages/BidHistory', () => stub('Bid History Page'));
vi.mock('../pages/Auctions', () => stub('Auctions Page'));
vi.mock('../pages/UserDashboardSeller', () => stub('Seller Dashboard Page'));
vi.mock('../pages/MyListings', () => stub('My Listings Page'));
vi.mock('../pages/MyBids', () => stub('My Bids Page'));
vi.mock('../pages/Watchlist', () => stub('Watchlist Page'));
vi.mock('../pages/UserDashboardBuyer', () => stub('Buyer Dashboard Page'));
vi.mock('../pages/PayFees', () => stub('Pay Fees Page'));
vi.mock('../pages/DeliveryCreate', () => stub('Delivery Create Page'));
vi.mock('../pages/RegistrationFee', () => stub('Registration Fee Page'));
vi.mock('../pages/contact', () => stub('Contact Page'));
vi.mock('../pages/ForgotPassword', () => stub('Forgot Password Page'));
vi.mock('../pages/ResetPassword', () => stub('Reset Password Page'));
vi.mock('../pages/AuctionSettings', () => stub('Settings Page'));
vi.mock('../pages/About', () => stub('About Page'));
vi.mock('../pages/Help', () => stub('Help Page'));
vi.mock('../pages/Feedback', () => stub('Feedback Page'));
vi.mock('../pages/PrivacyPolicy', () => stub('Privacy Policy Page'));
vi.mock('../pages/TermsOfService', () => stub('Terms Page'));
vi.mock('../pages/CookiePolicy', () => stub('Cookies Page'));

import App from '../App';

const renderApp = (route = '/') => {
  const navigateRef = { current: null };

  function NavigateCapture({ children }) {
    const navigate = useNavigate();
    React.useEffect(() => {
      navigateRef.current = navigate;
    }, [navigate]);
    return children;
  }

  const view = render(
    <MemoryRouter initialEntries={[route]}>
      <NavigateCapture>
        <App />
      </NavigateCapture>
    </MemoryRouter>
  );
  return { ...view, navigateRef };
};

describe('App routing and utilities', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

  it('renders navbar, footer, and matched route', () => {
    renderApp('/about');
    expect(screen.getByTestId('Navbar-Component')).toBeInTheDocument();
    expect(screen.getByTestId('Footer-Component')).toBeInTheDocument();
    expect(screen.getByTestId('About-Page')).toHaveTextContent('About Page');
  });

  it('scrolls to top when the location changes', async () => {
    const { navigateRef } = renderApp('/');
    await waitFor(() => expect(navigateRef.current).toBeTruthy());

    act(() => {
      navigateRef.current('/help');
    });

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });
});
