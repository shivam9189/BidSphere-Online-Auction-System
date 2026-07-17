import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const secret = "$@BidSphere";

// Generate JWT Token
function setUser(user) {
    return jwt.sign(
        {
            _id: user._id,
            email: user.email,
        },
        secret
    );
}

// Verify JWT Token and resolve to DB user object (exclude sensitive fields)
async function getUser(token) {
    if (!token) return null;
    let payload;
    try {
        payload = jwt.verify(token, secret);
    } catch (err) {
        return null;
    }

    if (!payload || !payload._id) return null;

    const user = await User.findById(payload._id).select("-password -resetToken -resetTokenExpiry -verificationCode");
    return user;
}

// Generate Hash password
async function generateHashPassword(password) {
    return await bcrypt.hash(password, 10);
}

export { setUser, getUser, generateHashPassword };