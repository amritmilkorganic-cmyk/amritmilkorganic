"use client";

import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Separator } from "@/components/ui/separator";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  CircleCheck,
  Clock,
  CreditCard,
  Home,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Settings,
  Star,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: string;
  total: number;
  items?: any;
}

interface Subscription {
  id: string;
  subscriptionId?: string;
  status?: string;
  product?: any;
  planType?: string;
  plan?: any;
  paymentMethod?: string;
  deliveryInstructions?: string;
  createdAt?: string;
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  tier: string;
  totalSpent: number;
  activeSubscriptions: number;
  impactPoints: number;
}

export default function AccountPage() {
  const [greeting, setGreeting] = useState("Good Day");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<Subscription[]>([]);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
const [savingAddress, setSavingAddress] = useState(false);
const [addressMessage, setAddressMessage] = useState("");
const [addressError, setAddressError] = useState("");

const [addressForm, setAddressForm] = useState({
  address: "",
  city: "",
  state: "",
  pincode: "",
});
  
  const formattedAddress = [
  userProfile?.address,
  userProfile?.city,
  userProfile?.state,
]
  .map((part) => String(part || "").trim())
  .filter((part) => part && /[a-zA-Z0-9\u0900-\u097F]/.test(part))
  .join(", ");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    const storedPhone = localStorage.getItem("amrit_user_phone");
    if (storedPhone) setPhoneInput(storedPhone);
  }, []);

  const handleLogin = async (phone: string, password: string) => {
    setLoading(true);
    setLoginError("");

    try {
      const loginRes = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        setLoginError(loginData.error || "Login failed");
        return;
      }

      const profileRes = await fetch(`/api/user/profile?phone=${phone}`);
      const profileData = await profileRes.json();

      if (profileRes.ok) {
        setUserProfile(profileData.profile);
        setUserOrders(profileData.orders || []);
        setUserSubscriptions(profileData.subscriptions || []);
        setIsAuthenticated(true);
        localStorage.setItem("amrit_user_phone", phone);
      } else {
        setLoginError("Could not load customer profile.");
      }
    } catch (err) {
      console.error(err);
      setLoginError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startAddressEdit = () => {
    setAddressMessage("");
    setAddressError("");
    setAddressForm({
      address: userProfile?.address || "",
      city: userProfile?.city || "",
      state: userProfile?.state || "",
      pincode: userProfile?.pincode || "",
    });
    setIsEditingAddress(true);
  };

  const handleSaveAddress = async () => {
    if (!userProfile?.phone) {
      setAddressError("Customer phone number is missing.");
      return;
    }

    if (!addressForm.address.trim()) {
      setAddressError("Please enter your delivery address.");
      return;
    }

    setSavingAddress(true);
    setAddressMessage("");
    setAddressError("");

    try {
      const response = await fetch("/api/user/update-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: userProfile.phone,
          ...addressForm,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAddressError(data.error || "Unable to save address.");
        return;
      }

      setUserProfile((current) =>
        current
          ? {
              ...current,
              address: data.address?.address ?? addressForm.address,
              city: data.address?.city ?? addressForm.city,
              state: data.address?.state ?? addressForm.state,
              pincode: data.address?.pincode ?? addressForm.pincode,
            }
          : current
      );

      setAddressMessage(data.message || "Address updated successfully.");
      setIsEditingAddress(false);
    } catch (error) {
      console.error(error);
      setAddressError("Unable to save address. Please try again.");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("amrit_user_phone");
    setUserProfile(null);
    setUserOrders([]);
    setUserSubscriptions([]);
    setPasswordInput("");
    setLoginError("");
    setActiveTab("dashboard");
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, staggerChildren: 0.1 },
    },
  };

  if (!isAuthenticated) {
    return (
      <main className="bg-theme-primary min-h-screen pt-32 pb-20 relative overflow-hidden flex items-center justify-center">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-terracotta/5 dark:bg-gold/5 rounded-full blur-[100px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gold/5 dark:bg-gold/5 rounded-full blur-[100px] -ml-64 -mb-64" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-theme p-10 rounded-[3rem] border-theme-light shadow-2xl max-w-md w-full relative z-10"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-tr from-gold to-warmGold rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg">
              <User className="w-10 h-10 text-espresso" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-theme-primary mb-2">
              Welcome Back
            </h1>
            <p className="text-theme-secondary italic">
              Enter your phone number and password to access your premium dashboard.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-theme-muted pl-4">
                Phone Number
              </label>
              <div className="relative group">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-accent" />
                <input
                  type="tel"
                  placeholder="Enter your registered number"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-theme-secondary/50 text-theme-primary border border-theme-light rounded-2xl p-5 pl-14 focus:border-terracotta dark:focus:border-gold outline-none transition-all font-bold shadow-soft text-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-theme-muted pl-4">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-accent" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      phoneInput.length >= 10 &&
                      passwordInput.length >= 4 &&
                      !loading
                    ) {
                      handleLogin(phoneInput, passwordInput);
                    }
                  }}
                  className="w-full bg-theme-secondary/50 text-theme-primary border border-theme-light rounded-2xl p-5 pl-14 focus:border-terracotta dark:focus:border-gold outline-none transition-all font-bold shadow-soft text-lg"
                />
              </div>
            </div>

            {loginError && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-600 dark:text-red-300">
                {loginError}
              </div>
            )}

            <Button
              onClick={() => handleLogin(phoneInput, passwordInput)}
              disabled={
                loading ||
                phoneInput.replace(/\D/g, "").length < 10 ||
                passwordInput.length < 4
              }
              className="w-full bg-gradient-to-tr from-terracotta to-[#8B4513] dark:from-gold dark:to-warmGold text-white dark:text-espresso rounded-[1.5rem] py-7 text-lg font-black shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Secure Login"}
            </Button>

            <div className="text-center text-xs text-theme-muted leading-relaxed">
              <Link
                href="/account/forgot-password"
                className="font-semibold text-terracotta dark:text-gold hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="bg-theme-primary min-h-screen pt-32 pb-20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-terracotta/5 dark:bg-gold/5 rounded-full blur-[100px] -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gold/5 dark:bg-gold/5 rounded-full blur-[100px] -ml-64 -mb-64" />

      <Section className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <h2 className="text-theme-accent font-bold uppercase tracking-[0.3em] mb-2 text-sm">
              {greeting}
            </h2>
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-theme-primary">
              Welcome,{" "}
              <span className="text-terracotta dark:text-gold italic">
                {userProfile?.name?.split(" ")[0] || "Friend"}
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-4 bg-theme-secondary/50 p-4 rounded-3xl border border-theme-light">
            <User className="w-10 h-10 text-theme-muted" />
            <div className="text-sm font-medium text-theme-secondary">
              <span className="text-terracotta dark:text-gold font-bold">
                Member Tier
              </span>
              <br />
              {userProfile?.tier || "Silver Member"}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-3 space-y-4"
          >
            <nav className="glass-theme p-4 rounded-[2.5rem] border-theme-light shadow-2xl">
              <div className="space-y-1">
                {[
                  { id: "dashboard", icon: Home, label: "Dashboard" },
                  { id: "orders", icon: Package, label: "My Orders" },
                  { id: "addresses", icon: MapPin, label: "Addresses" },
                  { id: "payment", icon: CreditCard, label: "Payments" },
                  { id: "subscription", icon: Clock, label: "Subscription" },
                  { id: "settings", icon: Settings, label: "Settings" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${
                      activeTab === item.id
                        ? "bg-terracotta dark:bg-gold text-white dark:text-espresso shadow-lg scale-[1.02]"
                        : "hover:bg-theme-secondary text-theme-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <item.icon className="w-5 h-5" />
                      <span className="font-semibold tracking-wide">
                        {item.label}
                      </span>
                    </div>
                    {activeTab === item.id && <ChevronRight className="w-4 h-4" />}
                  </button>
                ))}
              </div>

              <Separator className="my-6 bg-theme-light" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-4 text-espresso-muted hover:text-red-500 transition-colors py-2 px-4 font-medium w-full"
              >
                <LogOut className="w-5 h-5" />
                <span>Log Out</span>
              </button>
            </nav>
          </motion.div>

          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === "dashboard" && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        {
                          label: "Total Investment",
                          value: `₹${userProfile?.totalSpent?.toLocaleString() || "0"}`,
                          sub: "Lifetime Value",
                          icon: CircleCheck,
                        },
                        {
                          label: "Active Subscriptions",
                          value: `${userProfile?.activeSubscriptions || 0} Plans`,
                          sub: "Manage Subscription",
                          icon: Clock,
                        },
                        {
                          label: "Impact Points",
                          value: `${userProfile?.impactPoints || 0} px`,
                          sub: "Loyalty Rewards",
                          icon: Star,
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="glass-theme p-8 rounded-[2.5rem] border-theme-light shadow-xl"
                        >
                          <stat.icon className="w-7 h-7 text-theme-accent mb-5" />
                          <h4 className="text-theme-secondary text-sm font-medium mb-1">
                            {stat.label}
                          </h4>
                          <div className="text-3xl font-bold text-theme-primary mb-1">
                            {stat.value}
                          </div>
                          <p className="text-xs text-theme-muted font-medium italic">
                            {stat.sub}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "orders" && (
                  <div className="glass-theme p-10 rounded-[3rem] border-theme-light shadow-2xl">
                    <h2 className="text-4xl font-serif font-bold text-theme-primary mb-10">
                      Order History
                    </h2>

                    {userOrders.length > 0 ? (
                      <div className="space-y-4">
                        {userOrders.map((order) => (
                          <div
                            key={order.id}
                            className="flex flex-col md:flex-row md:items-center justify-between p-8 rounded-[2.5rem] bg-theme-secondary/30 border border-theme-light"
                          >
                            <div>
                              <div className="text-xl font-bold text-theme-primary italic mb-1">
                                Order #{order.orderNumber}
                              </div>
                              <div className="text-xs text-theme-muted font-bold uppercase">
                                {new Date(order.date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-lg font-bold text-theme-primary">
                              ₹{order.total}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-theme-muted italic">
                        No orders found.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "addresses" && (
                  <div className="glass-theme p-10 rounded-[3rem] border-theme-light shadow-2xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <h2 className="text-4xl font-serif font-bold text-theme-primary">
                        Saved Addresses
                      </h2>

                      {!isEditingAddress && (
                        <Button
                          onClick={startAddressEdit}
                          className="bg-gradient-to-tr from-terracotta to-[#8B4513] dark:from-gold dark:to-warmGold text-white dark:text-espresso rounded-2xl px-6 py-5 font-bold"
                        >
                          {formattedAddress ? "Edit Address" : "Add Address"}
                        </Button>
                      )}
                    </div>

                    <p className="text-theme-secondary mb-8">
                      Add or update your primary delivery address.
                    </p>

                    {addressMessage && (
                      <div className="mb-6 rounded-2xl border border-green-500/20 bg-green-500/10 px-5 py-4 text-sm font-semibold text-green-600 dark:text-green-300">
                        {addressMessage}
                      </div>
                    )}

                    {addressError && (
                      <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-600 dark:text-red-300">
                        {addressError}
                      </div>
                    )}

                    {isEditingAddress ? (
                      <div className="rounded-[2rem] bg-theme-secondary/40 border border-theme-light p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-theme-muted">
                              Delivery Address
                            </label>
                            <textarea
                              rows={4}
                              value={addressForm.address}
                              onChange={(e) =>
                                setAddressForm((current) => ({
                                  ...current,
                                  address: e.target.value,
                                }))
                              }
                              placeholder="House / Flat, Street, Area, Landmark"
                              className="w-full bg-theme-primary text-theme-primary border border-theme-light rounded-2xl p-5 focus:border-terracotta dark:focus:border-gold outline-none transition-all font-semibold shadow-soft resize-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-theme-muted">
                              City
                            </label>
                            <input
                              type="text"
                              value={addressForm.city}
                              onChange={(e) =>
                                setAddressForm((current) => ({
                                  ...current,
                                  city: e.target.value,
                                }))
                              }
                              placeholder="City"
                              className="w-full bg-theme-primary text-theme-primary border border-theme-light rounded-2xl p-5 focus:border-terracotta dark:focus:border-gold outline-none transition-all font-semibold shadow-soft"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-theme-muted">
                              State
                            </label>
                            <input
                              type="text"
                              value={addressForm.state}
                              onChange={(e) =>
                                setAddressForm((current) => ({
                                  ...current,
                                  state: e.target.value,
                                }))
                              }
                              placeholder="State"
                              className="w-full bg-theme-primary text-theme-primary border border-theme-light rounded-2xl p-5 focus:border-terracotta dark:focus:border-gold outline-none transition-all font-semibold shadow-soft"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-theme-muted">
                              Pincode
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={addressForm.pincode}
                              onChange={(e) =>
                                setAddressForm((current) => ({
                                  ...current,
                                  pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                                }))
                              }
                              placeholder="6-digit pincode"
                              className="w-full bg-theme-primary text-theme-primary border border-theme-light rounded-2xl p-5 focus:border-terracotta dark:focus:border-gold outline-none transition-all font-semibold shadow-soft"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 mt-8">
                          <Button
                            onClick={handleSaveAddress}
                            disabled={savingAddress}
                            className="bg-gradient-to-tr from-terracotta to-[#8B4513] dark:from-gold dark:to-warmGold text-white dark:text-espresso rounded-2xl px-8 py-6 font-bold disabled:opacity-50"
                          >
                            {savingAddress ? "Saving..." : "Save Address"}
                          </Button>

                          <Button
                            onClick={() => {
                              setIsEditingAddress(false);
                              setAddressError("");
                            }}
                            disabled={savingAddress}
                            className="bg-theme-secondary text-theme-primary border border-theme-light rounded-2xl px-8 py-6 font-bold"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[2rem] bg-theme-secondary/40 border border-theme-light p-8">
                        <div className="flex items-start gap-5">
                          <MapPin className="w-7 h-7 text-theme-accent mt-1" />
                          <div>
                            <div className="text-xs font-black uppercase tracking-[0.25em] text-theme-muted mb-2">
                              Primary Address
                            </div>
                            <h3 className="text-2xl font-bold text-theme-primary">
                              {userProfile?.name || "Customer"}
                            </h3>
                            <p className="text-theme-secondary mt-2 leading-relaxed">
                              {formattedAddress || "No address saved yet."}
                              {userProfile?.pincode ? ` - ${userProfile.pincode}` : ""}
                            </p>
                            <p className="text-theme-muted mt-2">
                              Phone: {userProfile?.phone || "--"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "payment" && (
                  <div className="glass-theme p-10 rounded-[3rem] border-theme-light shadow-2xl">
                    <h2 className="text-4xl font-serif font-bold text-theme-primary mb-4">
                      Payments
                    </h2>
                    <p className="text-theme-secondary mb-8">
                      Online payments are securely processed through CCAvenue.
                    </p>

                    <div className="rounded-[2rem] bg-theme-secondary/40 border border-theme-light p-8">
                      <div className="flex items-start gap-5">
                        <CreditCard className="w-7 h-7 text-theme-accent mt-1" />
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.25em] text-theme-muted mb-2">
                            Payment Method
                          </div>
                          <h3 className="text-2xl font-bold text-theme-primary">
                            CCAvenue Online Payment
                          </h3>
                          <p className="text-theme-secondary mt-2">
                            Saved cards or UPI mandates are not stored on Amrit Milk Organic.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "subscription" && (
                  <div className="glass-theme p-10 rounded-[3rem] border-theme-light shadow-2xl">
                    <h2 className="text-4xl font-serif font-bold text-theme-primary mb-4">
                      Subscription
                    </h2>
                    <p className="text-theme-secondary mb-8">
                      Your milk subscription records are shown below.
                    </p>

                    <div className="rounded-[2rem] bg-[#1a1a1a] text-ivory p-8 mb-8">
                      <Clock className="w-7 h-7 text-gold mb-5" />
                      <div className="text-xs font-black uppercase tracking-[0.25em] text-ivory/50 mb-2">
                        Current Status
                      </div>
                      <h3 className="text-2xl font-bold text-gold">
                        {userProfile?.activeSubscriptions
                          ? `${userProfile.activeSubscriptions} Active ${
                              userProfile.activeSubscriptions === 1 ? "Plan" : "Plans"
                            }`
                          : "No Active Subscription"}
                      </h3>
                      <p className="text-ivory/70 mt-2">
                        Pause, resume, quantity and delivery changes will be enabled in a later phase.
                      </p>
                    </div>

                    {userSubscriptions.length > 0 ? (
                      <div className="space-y-4">
                        {userSubscriptions.map((subscription) => {
                          const productName =
                            subscription.product?.title ||
                            subscription.product?.name ||
                            subscription.product?.productName ||
                            (typeof subscription.product === "string"
                              ? subscription.product
                              : "Milk Subscription");

                          const frequency =
                            subscription.plan?.frequency ||
                            subscription.planType ||
                            subscription.plan?.planType ||
                            "";

                          const formatLabel = (value: string) =>
                            value
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (letter) => letter.toUpperCase());

                          const startDate =
                            subscription.plan?.startDate || subscription.createdAt;

                          const nextDelivery = subscription.plan?.nextDelivery;

                          return (
                            <div
                              key={subscription.id}
                              className="rounded-[2rem] bg-theme-secondary/40 border border-theme-light p-7"
                            >
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                                <div className="flex-1">
                                  <div className="text-xs font-black uppercase tracking-[0.2em] text-theme-muted mb-2">
                                    {subscription.subscriptionId
                                      ? `Subscription #${subscription.subscriptionId}`
                                      : "Subscription"}
                                  </div>

                                  <h3 className="text-2xl font-bold text-theme-primary">
                                    {productName}
                                  </h3>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                                    {subscription.product?.variant && (
                                      <SubscriptionDetail
                                        label="Variant"
                                        value={String(subscription.product.variant)}
                                      />
                                    )}

                                    {subscription.product?.quantity != null && (
                                      <SubscriptionDetail
                                        label="Quantity"
                                        value={String(subscription.product.quantity)}
                                      />
                                    )}

                                    {subscription.product?.price != null && (
                                      <SubscriptionDetail
                                        label="Price"
                                        value={`₹${Number(
                                          subscription.product.price
                                        ).toLocaleString("en-IN")}`}
                                      />
                                    )}

                                    {frequency && (
                                      <SubscriptionDetail
                                        label="Frequency"
                                        value={formatLabel(String(frequency))}
                                      />
                                    )}

                                    {startDate && (
                                      <SubscriptionDetail
                                        label="Start Date"
                                        value={new Date(startDate).toLocaleDateString("en-IN")}
                                      />
                                    )}

                                    {nextDelivery && (
                                      <SubscriptionDetail
                                        label="Next Delivery"
                                        value={new Date(nextDelivery).toLocaleDateString("en-IN")}
                                      />
                                    )}

                                    {subscription.paymentMethod && (
                                      <SubscriptionDetail
                                        label="Payment"
                                        value={formatLabel(subscription.paymentMethod)}
                                      />
                                    )}
                                  </div>

                                  {subscription.deliveryInstructions && (
                                    <div className="mt-5 rounded-2xl bg-theme-primary/60 border border-theme-light p-4">
                                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-muted mb-1">
                                        Delivery Instructions
                                      </div>
                                      <p className="text-theme-secondary text-sm">
                                        {subscription.deliveryInstructions}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <span className="inline-flex self-start rounded-full bg-theme-primary border border-theme-light px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-theme-accent">
                                  {subscription.status || "Status unavailable"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-[2rem] bg-theme-secondary/40 border border-theme-light p-8 text-center text-theme-muted italic">
                        No subscription records found.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "settings" && (
                  <div className="glass-theme p-12 rounded-[3rem] border-theme-light shadow-2xl">
                    <h2 className="text-4xl font-serif font-bold text-theme-primary mb-2">
                      Account Settings
                    </h2>
                    <p className="text-theme-secondary font-medium italic mb-10">
                      Your saved customer profile details.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <ProfileField icon={User} label="Full Name" value={userProfile?.name} />
                      <ProfileField icon={Mail} label="Email" value={userProfile?.email} />
                      <ProfileField icon={Phone} label="Phone" value={userProfile?.phone} />
                      <ProfileField
                      icon={Home}
  label="Address"
  value={formattedAddress || "No address saved yet."}
/>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Section>
    </main>
  );
}

function SubscriptionDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-theme-primary/50 border border-theme-light px-4 py-3">
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-theme-muted mb-1">
        {label}
      </div>
      <div className="text-sm font-bold text-theme-primary">{value}</div>
    </div>
  );
}

function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value?: string;
}) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-theme-muted pl-1">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-accent" />
        <input
          type="text"
          value={value || ""}
          readOnly
          className="w-full bg-theme-secondary/50 text-theme-primary border border-theme-light rounded-2xl p-5 pl-14 outline-none font-bold shadow-soft"
        />
      </div>
    </div>
  );
}