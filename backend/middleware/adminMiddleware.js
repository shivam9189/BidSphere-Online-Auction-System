
function restrictAdminIP(req, res, next) {
  try {
    const allowedIP = process.env.ADMIN_IP; 
    let requestIP = req.ip;

    // Handle IPv4-mapped IPv6 (::ffff:192.168.1.12 -> 192.168.1.12)
    if (requestIP.startsWith("::ffff:")) {
      requestIP = requestIP.split("::ffff:")[1];
    }
    
    console.log("request IP:", requestIP); 

    if (requestIP !== allowedIP) {
      return res.status(403).json({ message: "Access denied" });
    }

    console.log("Admin logged in by IP: ", requestIP) 

    next();
  }
  catch (err) {
    console.error("Admin IP restriction error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  } 
}

function requireAdminAuth(req, res, next) {
  try {
    const adminToken = req.cookies?.adminToken;

    if (!adminToken || adminToken !== "admin_logged_in") {
      return res.status(401).json({ 
        success: false,
        message: "Admin authentication required. Please log in." 
      });
    }

    next();
  }
  catch (err) {
    console.error("Admin auth middleware error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
}

export { restrictAdminIP, requireAdminAuth };

