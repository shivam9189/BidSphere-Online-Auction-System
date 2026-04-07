import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    fullname:{
        type: String,
    },
    username: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    bio: {
        type: String,
    },
    address: {
      type: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        postalCode: { type: String },
        country: { type: String }
      },
      default: null
    },
    profilePhoto:{
        type : String,
    },
    isVerified: { 
        type: Boolean, 
        default: false 
    },
    verificationCode: String,
    
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
},{timestamps: true});

const User = mongoose.model('user', userSchema);

try {
    mongoose.model("User");
} catch {
    mongoose.model("User", userSchema);
}

export default User;