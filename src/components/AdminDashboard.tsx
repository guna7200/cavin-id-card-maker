import React, { useState, useEffect } from "react";
import { Region } from "../types";
import {
  LogOut,
  Save,
  Image as ImageIcon,
  BarChart3,
  Settings,
  Plus,
  Trash2,
  Users,
  Edit2,
} from "lucide-react";

interface AdminDashboardProps {
  onLogout: () => void;
  regions: Region[];
  setRegions: React.Dispatch<React.SetStateAction<Region[]>>;
}

export function AdminDashboard({
  onLogout,
  regions,
  setRegions,
}: AdminDashboardProps) {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [globalBg, setGlobalBg] = useState<string | null>(null);
  const [editingRegions, setEditingRegions] = useState<Region[]>(regions);
  const [appUsers, setAppUsers] = useState<Record<string, any>>({});
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"user" | "admin">("user");
  const [editingUser, setEditingUser] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch Stats
    fetch("/api/stats")
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Error fetching stats:", err));

    // 2. Fetch Global Background Setting
    fetch("/api/settings/globalBgImage")
      .then(res => res.json())
      .then(data => {
        if (data.value) setGlobalBg(data.value);
      })
      .catch(err => console.error("Error fetching global bg setting:", err));

    // 3. Fetch Users
    fetch("/api/users")
      .then(res => res.json())
      .then(data => setAppUsers(data))
      .catch(err => console.error("Error fetching users:", err));
  }, []);

  const handleSaveUser = async () => {
    if (!newUsername || !newPassword) {
      alert("Please provide both username and password");
      return;
    }
    if (appUsers[newUsername] && editingUser !== newUsername) {
      alert("Username already exists");
      return;
    }

    try {
      if (editingUser) {
        if (editingUser !== newUsername) {
          // Username changed: delete old user and insert new
          const delRes = await fetch(`/api/users/${editingUser}`, { method: "DELETE" });
          if (!delRes.ok) throw new Error("Failed to delete old username");

          const addRes = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: newUsername, password: newPassword, role: newUserRole }),
          });
          if (!addRes.ok) throw new Error("Failed to create new username");
        } else {
          // Just update password/role
          const putRes = await fetch(`/api/users/${newUsername}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: newPassword, role: newUserRole }),
          });
          if (!putRes.ok) throw new Error("Failed to update user details");
        }
      } else {
        // Create new user
        const addRes = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: newUsername, password: newPassword, role: newUserRole }),
        });
        if (!addRes.ok) {
          const errData = await addRes.json();
          throw new Error(errData.error || "Failed to create user");
        }
      }

      // Re-fetch users list to sync UI
      const usersRes = await fetch("/api/users");
      const updatedUsers = await usersRes.json();
      setAppUsers(updatedUsers);

      setNewUsername("");
      setNewPassword("");
      setNewUserRole("user");
      setEditingUser(null);
      alert(editingUser ? "User updated successfully!" : "User created successfully!");
    } catch (err: any) {
      alert(err.message || "An error occurred while saving user.");
    }
  };

  const handleEditUser = (username: string) => {
    setNewUsername(username);
    setNewPassword(appUsers[username]?.password || "");
    setNewUserRole(appUsers[username]?.role || "user");
    setEditingUser(username);
  };

  const handleDeleteUser = async (username: string) => {
    if (appUsers[username]?.role === "admin") {
      alert("Administrator users cannot be deleted.");
      return;
    }
    if (confirm(`Are you sure you want to delete user '${username}'?`)) {
      try {
        const response = await fetch(`/api/users/${username}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Failed to delete user");

        // Sync UI
        const usersRes = await fetch("/api/users");
        const updatedUsers = await usersRes.json();
        setAppUsers(updatedUsers);

        if (editingUser === username) {
          setNewUsername("");
          setNewPassword("");
          setNewUserRole("user");
          setEditingUser(null);
        }
      } catch (err: any) {
        alert(err.message || "An error occurred while deleting user.");
      }
    }
  };

  const handleGlobalBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        try {
          const response = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "globalBgImage", value: result }),
          });
          if (!response.ok) throw new Error("Failed to upload background setting");
          setGlobalBg(result);
          alert("Global background image updated!");
        } catch (err: any) {
          alert(err.message || "Failed to update global background.");
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const saveRegions = async () => {
    try {
      const response = await fetch("/api/regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRegions),
      });
      if (!response.ok) throw new Error("Failed to save regions");
      setRegions(editingRegions);
      alert("Regions updated successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to update regions.");
    }
  };

  const handleAddRegion = () => {
    const newRegion: Region = {
      id: crypto.randomUUID(),
      name: "New Unit",
      address: "",
      phone: "",
    };
    setEditingRegions((prev) => [...prev, newRegion]);
  };

  const handleRegionChange = (
    id: string,
    field: keyof Region,
    value: string,
  ) => {
    setEditingRegions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const handleRemoveRegion = (id: string) => {
    if (confirm("Are you sure you want to remove this unit?")) {
      setEditingRegions((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Admin Dashboard
              </h1>
              <p className="text-sm text-slate-500">
                Manage ID Card configurations and view stats
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stats Column */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4 text-blue-600">
                <BarChart3 className="w-5 h-5" />
                <h2 className="text-lg font-bold text-slate-900">
                  Creation Stats
                </h2>
              </div>

              <div className="space-y-3">
                {editingRegions.map((region) => (
                  <div
                    key={region.id}
                    className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <span className="font-semibold text-slate-700">
                      {region.name}
                    </span>
                    <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-xs font-bold">
                      {stats[region.id] || 0} cards
                    </span>
                  </div>
                ))}

                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center px-1">
                  <span className="font-bold text-slate-900">
                    Total Cards Created
                  </span>
                  <span className="font-black text-blue-600 text-xl">
                    {Object.values(stats).reduce(
                      (a: number, b: number) => a + b,
                      0,
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Global Background */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4 text-blue-600">
                <ImageIcon className="w-5 h-5" />
                <h2 className="text-lg font-bold text-slate-900">
                  Global Background
                </h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Set a default background for all users.
              </p>

              {globalBg && (
                <div className="mb-4 rounded-lg overflow-hidden border border-slate-200 h-32 relative">
                  <img
                    src={globalBg}
                    alt="Global Bg"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch("/api/settings", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ key: "globalBgImage", value: "" }),
                        });
                        if (!response.ok) throw new Error("Failed to clear background setting");
                        setGlobalBg(null);
                      } catch (err: any) {
                        alert(err.message || "Failed to clear background.");
                      }
                    }}
                    className="absolute top-2 right-2 bg-white text-red-500 p-1 rounded shadow text-xs font-bold"
                  >
                    Clear
                  </button>
                </div>
              )}

              <label className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer text-sm font-semibold text-slate-600 transition-colors">
                <ImageIcon className="w-4 h-4" />
                {globalBg ? "Replace Image" : "Upload Image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleGlobalBgUpload}
                />
              </label>
            </div>
          </div>

          {/* Units / Regions Manager */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Manage Units / Regions
                </h2>
                <p className="text-sm text-slate-500">
                  Update address and contact info for each plant
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddRegion}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Unit
                </button>
                <button
                  onClick={saveRegions}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {editingRegions.map((region) => (
                <div
                  key={region.id}
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase">
                          Unit Name
                        </label>
                        <button
                          onClick={() => handleRemoveRegion(region.id)}
                          className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1 rounded transition-colors"
                          title="Remove Unit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={region.name}
                        onChange={(e) =>
                          handleRegionChange(region.id, "name", e.target.value)
                        }
                        className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-blue-500 outline-none font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={region.phone || ""}
                        onChange={(e) =>
                          handleRegionChange(region.id, "phone", e.target.value)
                        }
                        className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-blue-500 outline-none"
                        placeholder="e.g. 04256 - 238 202"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Address
                    </label>
                    <textarea
                      value={region.address}
                      onChange={(e) =>
                        handleRegionChange(region.id, "address", e.target.value)
                      }
                      className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-blue-500 outline-none min-h-[60px]"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Management */}
          <div className="md:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" /> Manage Users
                </h2>
                <p className="text-sm text-slate-500">
                  Create users and provide credentials for ID Card generation
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Add User Form */}
              <div className="md:w-1/3 space-y-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                <h3 className="font-bold text-slate-800 mb-3">{editingUser ? "Edit User" : "Add New User"}</h3>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-blue-500 outline-none"
                    placeholder="e.g. jdoe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Password
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-blue-500 outline-none"
                    placeholder="Enter a secure password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as "user" | "admin")}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-blue-500 outline-none bg-white font-medium text-slate-800"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveUser}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm"
                  >
                    {editingUser ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                    {editingUser ? "Update User" : "Create User"}
                  </button>
                  {editingUser && (
                    <button
                      onClick={() => {
                        setEditingUser(null);
                        setNewUsername("");
                        setNewPassword("");
                        setNewUserRole("user");
                      }}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-colors shadow-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Users List */}
              <div className="md:w-2/3 space-y-3">
                <h3 className="font-bold text-slate-800 mb-3">
                  Existing Users
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {Object.entries(appUsers).map(
                    ([username, data]: [string, any]) => (
                      <div
                        key={username}
                        className={`flex justify-between items-center p-3 bg-white border ${editingUser === username ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'} rounded-lg shadow-sm`}
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            {username}
                          </div>
                          <div className="text-xs text-slate-500 capitalize">
                            Role: {data.role}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditUser(username)}
                            className="p-2 rounded transition-colors text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {data.role !== "admin" && (
                            <button
                              onClick={() => handleDeleteUser(username)}
                              className="p-2 rounded transition-colors text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
