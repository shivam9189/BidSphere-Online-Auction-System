import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { logoutUser, getCurrentUser } from "../api"; 
import { logoutAdmin } from "../api/index";
import logo from "../assets/bidsphere.svg";

function Navbar() {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const navigate = useNavigate();
  const location = useLocation(); 
  const [searchTerm, setSearchTerm] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileToggleRef = useRef(null);

  //Load from local storage if data is already available
  const loadAuthFromStorage = () => {
    try {
      const storedUser = localStorage.getItem("bidsphere_user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Handle both cases: {user: null} and direct null/undefined
          if (parsedUser && parsedUser.user === null) {
            setUser(null);
          } else if (parsedUser && parsedUser.user) {
            setUser(parsedUser.user);
          } else if (parsedUser) {
            setUser(parsedUser);
          } else {
            setUser(null);
          }
        } catch (e) {
          // if parsing fails, don't set a raw string as user (will show as anonymous)
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      // defensive: try sessionStorage as a fallback
      try {
        const s = sessionStorage.getItem("bidsphere_user");
        setUser(s ? JSON.parse(s) : null);
      } catch {
        setUser(null);
      }
    }
    try {
      const storedAdmin = localStorage.getItem("bidsphere_admin");
      const adm = storedAdmin ? JSON.parse(storedAdmin) : null;
      setAdmin(adm && typeof adm === 'object' ? adm : null);
    } catch {setAdmin(null);}
  };

  // derive user image and initials for avatar display (defensive: only treat `user` as object)
  const userObj = (user && typeof user === 'object') ? user : null;
  const userImage = userObj?.profilePhoto || userObj?.profilePhotoUrl || userObj?.avatar || userObj?.profilePicture || null;
  const userHandle = (userObj?.username || userObj?.email || '').toString().trim();
  const userInitials = (userHandle ? userHandle : 'U')
    .split(' ')
    .map(s => s[0])
    .slice(0,2)
    .join('')
    .toUpperCase();

  useEffect(() => {
    // try to get authoritative user from backend first
    let mounted = true;
    (async () => {
      let res = null;
      try {
        res = await getCurrentUser();
        if (!mounted) return;
        if (res?.user) {
          setUser(res.user);
          // mirror into localStorage for compatibility with other flows
          try { localStorage.setItem("bidsphere_user", JSON.stringify(res.user)); } catch {}
          return;
        }
      } catch (err) {
        // ignore and fallback to storage
      }
      loadAuthFromStorage();
      // If backend call succeeded but returned no user, clear stale localStorage data
      if (res && !res?.user) {
        try {
          localStorage.removeItem("bidsphere_user");
        } catch {}
      }
    })();
    return () => { mounted = false; };
  }, [location]);

  // close menu when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // close mobile menu when clicking outside (ignore toggle)
  useEffect(() => {
    function onDocClick(e) {
      if (!mobileMenuRef.current) return;
      if (mobileToggleRef.current && mobileToggleRef.current.contains(e.target)) return;
      if (!mobileMenuRef.current.contains(e.target)) setMobileOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // listen to storage events so navbar updates when auth changes in other tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "bidsphere_user") loadAuthFromStorage();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleUserLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn("Logout API failed", e);
    }
    localStorage.removeItem("bidsphere_user");
    setUser(null);
    navigate("/");
  };

  const handleAdminLogout = async () => {
    try {
      if (admin) {
        await logoutAdmin();
      }
    } catch (e) {
      console.warn("Admin logout API failed", e);
    }
    localStorage.removeItem("bidsphere_admin");
    setAdmin(null);
    navigate("/admin/login");
  };

  return (
    <nav className="relative flex items-center justify-between bg-yellow-500 px-4 md:px-6 py-2 md:py-3">
      <div className="flex items-center gap-3">
        <Link to="/" className="inline-block">
          <img src={logo} alt="BidSphere" className="h-7 md:h-8" />
        </Link>
      </div>

      {/* Desktop search (hidden on small) */}
      <div className="hidden md:flex items-center bg-white rounded-md mr-6">
        <input
          type="text"
          aria-label="Search auctions"
          placeholder="What are you looking for?"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const q = searchTerm.trim();
              if (q) navigate(`/auctions?search=${encodeURIComponent(q)}`);
              else navigate('/auctions');
            }
          }}
          className="px-3 py-2 rounded-md w-64"
        />
        <button
          onClick={() => {
            const q = searchTerm.trim();
            if (q) navigate(`/auctions?search=${encodeURIComponent(q)}`);
            else navigate('/auctions');
          }}
          className="ml-2 bg-white text-gray-800 px-3 py-2 rounded-md"
          aria-label="Search">
          <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </button>
      </div>

      {/* Mobile hamburger */}
      <div className="flex items-center md:hidden">
        <button
          ref={mobileToggleRef}
          onClick={(e) => { e.stopPropagation(); setMobileOpen((s) => !s); }}
          className="p-2 rounded-md bg-white"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <ul className="hidden md:flex items-center space-x-6 font-medium">
        <li><Link to="/categories">Categories</Link></li>
        <li><Link to='/create-auction'>Create Auction</Link></li>

        {!user && !admin && (
          <>
            <li><Link to="/login">Login</Link></li>
            <li>
              <Link to="/register" className="bg-white px-3 py-1 rounded-md">
                Register
              </Link>
            </li>
          </>
        )}

        {user && !admin && (
            <li className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((s) => !s)}
              className="flex items-center gap-2 bg-white px-3 py-1 rounded-md hover:shadow"
              aria-haspopup="true"
              aria-expanded={showMenu}
            >
              {userImage ? (
                <img src={userImage} alt={user.username || 'User'} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">{userInitials}</div>
              )}
              <span className="hidden sm:inline">{user.username || (user.email || '').split('@')[0]}</span>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded shadow-lg z-50 border">
                <div className="px-4 py-3 border-b">
                  <div className="font-semibold">{user.username || (user.email || '').split('@')[0]}</div>
                  <div className="text-xs text-gray-500">Account</div>
                </div>
                <ul className="py-2">
                  <li>
                    <Link to="/seller-dashboard" className="block px-4 py-2 hover:bg-gray-50">SELLER Dashboard</Link>
                  </li>
                  <li>
                    <Link to="/buyer-dashboard" className="block px-4 py-2 hover:bg-gray-50">BIDDER Dashboard</Link>
                  </li>
                  <li>
                    <Link to="/settings" className="block px-4 py-2 hover:bg-gray-50">Account Settings</Link>
                  </li>
                  <li>
                    <button onClick={handleUserLogout} className="w-full text-left px-4 py-2 hover:bg-gray-50">Log Out</button>
                  </li>
                </ul>
              </div>
            )}
          </li>
        )}

        {admin && (
          <>
            <li>Hello Admin</li>
            <li>
              <button onClick={handleAdminLogout} className="bg-white px-3 py-1 rounded-md">
                Logout
              </button>
            </li>
          </>
        )}
        </ul>

        {/* Mobile dropdown panel (simple list) */}
        {mobileOpen && (
          <div ref={mobileMenuRef} className="absolute left-2 right-2 top-full mt-2 z-40 bg-white shadow-md border rounded md:hidden">
            <div className="flex flex-col p-3">
              <input
                type="text"
                aria-label="Search auctions"
                placeholder="Search auctions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const q = searchTerm.trim();
                    setMobileOpen(false);
                    if (q) navigate(`/auctions?search=${encodeURIComponent(q)}`);
                    else navigate('/auctions');
                  }
                }}
                className="mb-2 px-3 py-2 border rounded"
              />

              <Link to="/categories" onClick={() => setMobileOpen(false)} className="py-2 px-2 hover:bg-gray-50 rounded">Categories</Link>
              <Link to="/create-auction" onClick={() => setMobileOpen(false)} className="py-2 px-2 hover:bg-gray-50 rounded">Create Auction</Link>
              {!user && !admin && (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="py-2 px-2 hover:bg-gray-50 rounded">Login</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="py-2 px-2 hover:bg-gray-50 rounded">Register</Link>
                </>
              )}

              {user && !admin && (
                <>
                  <Link to="/seller-dashboard" onClick={() => setMobileOpen(false)} className="py-2 px-2 hover:bg-gray-50 rounded">Seller Dashboard</Link>
                  <Link to="/buyer-dashboard" onClick={() => setMobileOpen(false)} className="py-2 px-2 hover:bg-gray-50 rounded">Bidder Dashboard</Link>
                  <Link to="/settings" onClick={() => setMobileOpen(false)} className="py-2 px-2 hover:bg-gray-50 rounded">Account Settings</Link>
                  <button onClick={() => { setMobileOpen(false); handleUserLogout(); }} className="text-left py-2 px-2 hover:bg-gray-50 rounded">Log Out</button>
                </>
              )}

              {admin && (
                <>
                  <button onClick={() => { setMobileOpen(false); handleAdminLogout(); }} className="py-2 px-2 hover:bg-gray-50 rounded">Admin Logout</button>
                </>
              )}
            </div>
          </div>
        )}
    </nav>
  );
}

export default Navbar;
