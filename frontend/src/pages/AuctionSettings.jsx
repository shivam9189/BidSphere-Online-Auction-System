// frontend/src/pages/Settings.jsx
import React, { useState, useEffect, useRef } from "react";
import { updateUserProfile, uploadImagesFormData } from "../api";
import { useUser } from "../contexts/UserContext";
import { toast } from "react-toastify";

export default function Settings() {
  const { user: ctxUser, loading: userLoading } = useUser() || {};
  const [loading, setLoading] = useState(userLoading ?? true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState({
    fullname: '',
    email: '',
    bio: '',
    profilePhoto: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    }
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('');
  const fileInputRef = useRef(null);

  // Load user data from centralized UserContext
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        if (ctxUser) {
          setUserData((prev) => ({
            ...prev,
            ...ctxUser,
            address: ctxUser.address || prev.address,
          }));
          if (ctxUser.profilePhoto) setPreview(ctxUser.profilePhoto);
        }
      } catch (error) {
        console.error("Failed to load user data from context:", error);
        toast.error("Failed to load user data");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    setLoading(Boolean(userLoading));
    if (!userLoading) init();

    return () => (mounted = false);
  }, [ctxUser, userLoading]);

  const handleFileChange = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setUserData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent] || {}),
          [child]: value,
        },
      }));
      return;
    }
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      let profilePhotoUrl = userData.profilePhoto;
      
      // Upload new profile photo if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append("images", selectedFile);
        const { files } = await uploadImagesFormData(formData);
        if (files && files.length > 0) profilePhotoUrl = files[0];
      }

      // Update user profile
      const updatedData = {
        ...userData,
        profilePhoto: profilePhotoUrl
      };
      
      const result = await updateUserProfile(updatedData);
      toast.success("Profile updated successfully!");

      // Update local state with new data
      setUserData((prev) => ({
        ...prev,
        ...result.user,
        address: result.user.address || prev.address,
      }));
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Photo */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Profile Photo</h2>
          <div className="flex items-center space-x-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200">
              {preview ? (
                <img 
                  src={preview} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <span>No photo</span>
                </div>
              )}
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Change Photo
              </button>
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                name="fullname"
                value={userData.fullname || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={userData.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              name="bio"
              value={userData.bio || ''}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Tell us about yourself..."
            ></textarea>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
              <input
                type="text"
                name="address.street"
                value={userData.address?.street || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="address.city"
                value={userData.address?.city || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
              <input
                type="text"
                name="address.state"
                value={userData.address?.state || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
              <input
                type="text"
                name="address.postalCode"
                value={userData.address?.postalCode || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                name="address.country"
                value={userData.address?.country || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}