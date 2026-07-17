import { getUser } from "../services/auth.js";

async function restrictToLoggedinUserOnly (req, res, next){
  try {
    const userToken = req.cookies?.token;

    if(!userToken) 
      return res.status(400).json({message:"You are not logged in, go to login page"});
    
    const user = await getUser(userToken);

    if(!user) 
      return res.status(400).json({message:"The user belonging to this token does no longer exist."});
    
    req.user = user;
    next();
  }
  catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
}

async function checkAuth (req, res, next){
  try {  
    const userToken = req.cookies?.token;

    const user = await getUser(userToken);
    
    // Only set req.user if we have a valid user
    if (user) {
      req.user = user;
    }
    next();
  }
  catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
}

export {
    restrictToLoggedinUserOnly,
    checkAuth
}