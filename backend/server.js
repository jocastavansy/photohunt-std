try { require("dotenv").config(); } catch (e) { }
const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const http = require("http");
const fs = require("fs");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

/* ================= MONGOOSE CONNECTION ================= */
const mongoURI = process.env.MONGO_URI || process.env.MONGO_URL || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/photohunt_backend";
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected. Database:", mongoose.connection.name))
  .catch(err => console.error("❌ MongoDB Connection Error:", err.message));

/* ================= MIDDLEWARE & STATIC ================= */
app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicPath = path.join(__dirname, "../public");
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}
app.use("/images", express.static(path.join(__dirname, "images")));

// Root route
app.get("/", (req, res) => {
  if (fs.existsSync(path.join(__dirname, "../public/customer-app.html"))) {
    res.redirect("/customer-app.html");
  } else {
    res.json({
      message: "PhotoHunt API Server is running",
      status: "online",
      database: mongoose.connection.name || (mongoose.connection.db ? mongoose.connection.db.databaseName : "unknown")
    });
  }
});

/* ================= SCHEMAS & MODELS ================= */
const schemaOptions = {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
};

// 1. User Schema
const userSchema = new mongoose.Schema({
  id: { type: Number, unique: true, sparse: true }, // Business numeric ID (e.g. 23)
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true }, // 'customer' or 'mitra'
  phone: { type: String, default: null },
  gender: { type: String, default: null },
  birthday: { type: Date, default: null },
  image: { type: String, default: null }
}, schemaOptions);

const User = mongoose.model("User", userSchema);

// 2. Studio Schema
const studioSchema = new mongoose.Schema({
  id: { type: Number, unique: true, sparse: true }, // Business numeric ID (e.g. 32)
  mitraId: { type: Number }, // References users.id (e.g. 23)
  mitra_id: { type: mongoose.Schema.Types.Mixed }, // Compatibility fallback
  name: { type: String, required: true },
  logo: { type: String, default: null },
  location: { type: String, default: null },
  city: { type: String, default: null },
  category: { type: String, default: null },
  description: { type: String, default: null },
  price: { type: Number, default: null },
  priceRange: { type: String, default: null },
  price_range: { type: String, default: null },
  capacity: { type: Number, default: null },
  gmapsLink: { type: String, default: null },
  gmaps_link: { type: String, default: null },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  status: { type: String, default: "active" },
  image: { type: String, default: null },
  paymentBankName: { type: String, default: null },
  payment_bank_name: { type: String, default: null },
  paymentAccountNumber: { type: String, default: null },
  payment_account_number: { type: String, default: null },
  paymentAccountHolder: { type: String, default: null },
  payment_account_holder: { type: String, default: null },
  qrisImage: { type: String, default: null },
  qris_image: { type: String, default: null },
  facilities: [{ type: String }],
  images: [{ type: String }],
  schedules: [{
    day: { type: String, required: true },
    is_closed: { type: Boolean, default: false },
    isClosed: { type: Boolean, default: false },
    open_time: { type: String, default: null },
    close_time: { type: String, default: null },
    openTime: { type: String, default: null },
    closeTime: { type: String, default: null }
  }],
  packages: [{
    id: { type: Number },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, default: null },
    session_duration: { type: Number, default: 60 },
    break_duration: { type: Number, default: 0 },
    duration: { type: Number, default: 60 },
    break: { type: Number, default: 0 }
  }]
}, { ...schemaOptions, collection: "studios" });

const Studio = mongoose.model("Studio", studioSchema);

// 2.1 Studio Image Schema (for gallery images in studioImages collection)
const studioImageSchema = new mongoose.Schema({
  id: { type: Number, sparse: true },
  studio_id: { type: mongoose.Schema.Types.Mixed },
  studioId: { type: mongoose.Schema.Types.Mixed },
  image: { type: String, required: true }
}, schemaOptions);

const StudioImage = mongoose.model("StudioImage", studioImageSchema, "studioImages");

// 2.2 Studio Facility Schema (for facilities in studioFacilities collection)
const studioFacilitySchema = new mongoose.Schema({
  id: { type: Number, sparse: true },
  studio_id: { type: mongoose.Schema.Types.Mixed },
  studioId: { type: mongoose.Schema.Types.Mixed },
  facility: { type: String, required: true }
}, schemaOptions);

const StudioFacility = mongoose.model("StudioFacility", studioFacilitySchema, "studioFacilities");

// 3. Booking Schema
const bookingSchema = new mongoose.Schema({
  id: { type: Number, unique: true, sparse: true },
  studio_id: { type: mongoose.Schema.Types.Mixed },
  studioId: { type: mongoose.Schema.Types.Mixed },
  customer_id: { type: mongoose.Schema.Types.Mixed },
  customerId: { type: mongoose.Schema.Types.Mixed },
  mitra_id: { type: mongoose.Schema.Types.Mixed },
  mitraId: { type: mongoose.Schema.Types.Mixed },
  package_id: { type: mongoose.Schema.Types.Mixed },
  packageId: { type: mongoose.Schema.Types.Mixed },
  booking_date: { type: String },
  bookingDate: { type: String },
  booking_time: { type: String },
  bookingTime: { type: String },
  total_price: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  package_name: { type: String, default: null },
  packageName: { type: String, default: null },
  pax: { type: Number, default: 1 },
  status: { type: String, default: "pending" },
  reason: { type: String, default: null },
  gdrive_link: { type: String, default: null },
  gdriveLink: { type: String, default: null }
}, schemaOptions);

const Booking = mongoose.model("Booking", bookingSchema);

// 4. Payment Schema
const paymentSchema = new mongoose.Schema({
  id: { type: Number, sparse: true },
  booking_id: { type: mongoose.Schema.Types.Mixed },
  bookingId: { type: mongoose.Schema.Types.Mixed },
  customer_id: { type: mongoose.Schema.Types.Mixed },
  customerId: { type: mongoose.Schema.Types.Mixed },
  mitra_id: { type: mongoose.Schema.Types.Mixed },
  mitraId: { type: mongoose.Schema.Types.Mixed },
  payment_method: { type: String },
  paymentMethod: { type: String },
  payment_channel: { type: String, default: null },
  paymentChannel: { type: String, default: null },
  amount: { type: Number, default: 0 },
  status: { type: String, default: "pending" },
  proof_image: { type: String, default: null },
  proofImage: { type: String, default: null },
  paid_at: { type: Date, default: Date.now },
  paidAt: { type: Date, default: Date.now }
}, schemaOptions);

const Payment = mongoose.model("Payment", paymentSchema);

// 5. Cancellation Schema
const cancellationSchema = new mongoose.Schema({
  id: { type: Number, sparse: true },
  booking_id: { type: mongoose.Schema.Types.Mixed },
  bookingId: { type: mongoose.Schema.Types.Mixed },
  reason: { type: String, default: null },
  bank_name: { type: String, default: null },
  bankName: { type: String, default: null },
  account_number: { type: String, default: null },
  accountNumber: { type: String, default: null },
  account_name: { type: String, default: null },
  accountName: { type: String, default: null },
  status: { type: String, default: "pending" },
  refund_amount: { type: mongoose.Schema.Types.Mixed, default: 0 },
  refundAmount: { type: mongoose.Schema.Types.Mixed, default: 0 }
}, schemaOptions);

const Cancellation = mongoose.model("Cancellation", cancellationSchema);

// 6. Review Schema
const reviewSchema = new mongoose.Schema({
  id: { type: Number, sparse: true },
  booking_id: { type: mongoose.Schema.Types.Mixed },
  bookingId: { type: mongoose.Schema.Types.Mixed },
  studio_id: { type: mongoose.Schema.Types.Mixed },
  studioId: { type: mongoose.Schema.Types.Mixed },
  user_id: { type: mongoose.Schema.Types.Mixed },
  userId: { type: mongoose.Schema.Types.Mixed },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" }
}, schemaOptions);

const Review = mongoose.model("Review", reviewSchema);

// 7. Chat Schema
const chatSchema = new mongoose.Schema({
  id: { type: Number, sparse: true },
  sender_id: { type: mongoose.Schema.Types.Mixed },
  senderId: { type: mongoose.Schema.Types.Mixed },
  receiver_id: { type: mongoose.Schema.Types.Mixed },
  receiverId: { type: mongoose.Schema.Types.Mixed },
  booking_id: { type: mongoose.Schema.Types.Mixed },
  bookingId: { type: mongoose.Schema.Types.Mixed },
  message: { type: String, required: true },
  is_read: { type: mongoose.Schema.Types.Mixed, default: false },
  isRead: { type: mongoose.Schema.Types.Mixed, default: false }
}, schemaOptions);

const Chat = mongoose.model("Chat", chatSchema);

/* ================= HELPER FUNCTIONS & TRANSFORMERS ================= */

// Helper to auto-increment numeric ID if not present
async function getNextSequence(modelName) {
  let model;
  if (modelName === "User") model = User;
  else if (modelName === "Studio") model = Studio;
  else if (modelName === "Booking") model = Booking;
  else return Date.now();

  const maxDoc = await model.findOne().sort({ id: -1 }).exec();
  if (maxDoc && typeof maxDoc.id === 'number') {
    return maxDoc.id + 1;
  }
  return 1;
}

// Parse flat bracket keys from Multer multipart/form-data into nested objects (schedule & packages)
function parseNestedBody(body) {
  const result = { ...body };

  if (!result.schedule || typeof result.schedule !== 'object') {
    result.schedule = {};
  }
  if (!result.packages || typeof result.packages !== 'object') {
    result.packages = {};
  }

  for (const key in body) {
    // Match schedule[senin][open] or schedule[senin][close]
    const schedMatch = key.match(/^schedule\[([^\]]+)\]\[([^\]]+)\]$/i);
    if (schedMatch) {
      const day = schedMatch[1];
      const field = schedMatch[2];
      if (!result.schedule[day]) result.schedule[day] = {};
      result.schedule[day][field] = body[key];
    }

    // Match packages[0][name], packages[0][price], packages[0][duration], etc.
    const pkgMatch = key.match(/^packages\[(\d+)\]\[([^\]]+)\]$/i);
    if (pkgMatch) {
      const idx = pkgMatch[1];
      const field = pkgMatch[2];
      if (!result.packages[idx]) result.packages[idx] = {};
      result.packages[idx][field] = body[key];
    }
  }

  return result;
}

// Format number to Rupiah string (e.g. 150000 -> "Rp 150.000")
function formatRupiahNum(num) {
  return "Rp " + Number(num).toLocaleString("id-ID");
}

// Calculate dynamic min-max price range from packages array
function calculatePriceRange(packages) {
  if (!packages || !Array.isArray(packages) || packages.length === 0) {
    return null;
  }

  const validPrices = packages
    .map(p => Number(p.price))
    .filter(val => !isNaN(val) && val > 0);

  if (validPrices.length === 0) return null;

  const minPrice = Math.min(...validPrices);
  const maxPrice = Math.max(...validPrices);

  if (minPrice === maxPrice) {
    return formatRupiahNum(minPrice);
  }
  return `${formatRupiahNum(minPrice)} - ${formatRupiahNum(maxPrice)}`;
}

// Flexible query filter for matching studio by mitra numeric id or string id
function getMitraStudioFilter(mitraId) {
  const numId = Number(mitraId);
  const strId = String(mitraId);
  const conditions = [];

  if (!isNaN(numId)) {
    conditions.push({ mitraId: numId });
    conditions.push({ mitra_id: numId });
  }
  conditions.push({ mitraId: strId });
  conditions.push({ mitra_id: strId });

  if (mongoose.Types.ObjectId.isValid(strId)) {
    conditions.push({ mitraId: new mongoose.Types.ObjectId(strId) });
    conditions.push({ mitra_id: new mongoose.Types.ObjectId(strId) });
  }

  return { $or: conditions };
}

// Flexible query filter for bookings
async function getMitraBookingFilter(mitraId) {
  const numId = Number(mitraId);
  const strId = String(mitraId);
  const conditions = [];

  if (!isNaN(numId)) {
    conditions.push({ mitra_id: numId });
    conditions.push({ mitraId: numId });
  }
  conditions.push({ mitra_id: strId });
  conditions.push({ mitraId: strId });

  if (mongoose.Types.ObjectId.isValid(strId)) {
    conditions.push({ mitra_id: new mongoose.Types.ObjectId(strId) });
    conditions.push({ mitraId: new mongoose.Types.ObjectId(strId) });
  }

  try {
    const studioFilter = getMitraStudioFilter(mitraId);
    const myStudios = await Studio.find(studioFilter).select("_id id").lean();
    const myStudioIds = myStudios.flatMap(s => [s._id, s._id ? s._id.toString() : null, s.id, s.id !== undefined ? String(s.id) : null].filter(Boolean));
    if (myStudioIds.length > 0) {
      conditions.push({ studio_id: { $in: myStudioIds } });
      conditions.push({ studioId: { $in: myStudioIds } });
    }
  } catch (err) {
    console.warn("Studio filter fallback warning:", err);
  }

  return { $or: conditions };
}

// Format User response to ensure 'id' is present
function formatUser(user) {
  if (!user) return null;
  const obj = typeof user.toObject === 'function' ? user.toObject({ virtuals: true }) : { ...user };
  return {
    ...obj,
    id: obj.id !== undefined ? obj.id : obj._id.toString(),
    _id: obj._id
  };
}

// Format Studio response so BOTH camelCase & snake_case exist simultaneously
function formatStudio(studio, galleryDocs = null, facilityDocs = null) {
  if (!studio) return null;
  const obj = typeof studio.toObject === 'function' ? studio.toObject({ virtuals: true }) : { ...studio };

  const studioId = obj.id !== undefined ? obj.id : obj._id.toString();
  const mIdRaw = obj.mitraId !== undefined ? obj.mitraId : obj.mitra_id;
  const mId = !isNaN(Number(mIdRaw)) ? Number(mIdRaw) : mIdRaw;

  const gmaps = obj.gmapsLink || obj.gmaps_link || "";
  const calculatedRange = calculatePriceRange(obj.packages);
  const pRange = calculatedRange || obj.priceRange || obj.price_range || "";
  const bankName = obj.paymentBankName || obj.payment_bank_name || "";
  const bankNum = obj.paymentAccountNumber || obj.payment_account_number || "";
  const bankHolder = obj.paymentAccountHolder || obj.payment_account_holder || "";
  const qris = obj.qrisImage || obj.qris_image || "";
  const logo = obj.logo || obj.image || "";
  const mainImg = obj.image || obj.logo || "";

  let galleryImages = [];
  if (Array.isArray(galleryDocs) && galleryDocs.length > 0) {
    const rawList = galleryDocs.map(img => (typeof img === 'string' ? img : img.image || "")).filter(Boolean);
    const seenImg = new Set();
    rawList.forEach(name => {
      if (!seenImg.has(name)) {
        seenImg.add(name);
        galleryImages.push(name);
      }
    });
  } else if (Array.isArray(obj.images) && obj.images.length > 0) {
    const rawList = obj.images.map(img => (typeof img === 'string' ? img : img.image || "")).filter(Boolean);
    const seenImg = new Set();
    rawList.forEach(name => {
      if (!seenImg.has(name)) {
        seenImg.add(name);
        galleryImages.push(name);
      }
    });
  }

  if (galleryImages.length === 0) {
    if (mainImg) galleryImages.push(mainImg);
    if (logo && logo !== mainImg) galleryImages.push(logo);
  }

  const galleryImageFirst = galleryImages.length > 0 ? galleryImages[0] : (mainImg || logo || null);
  const formattedImages = galleryImages.map(img => ({ image: img }));

  // Facility handling: merge studioFacilities collection docs + embedded facilities array
  let rawFacilities = [];
  if (Array.isArray(facilityDocs) && facilityDocs.length > 0) {
    facilityDocs.forEach(f => {
      const text = typeof f === 'string' ? f : (f.facility || "");
      if (text && text.trim()) rawFacilities.push(text.trim());
    });
  }
  if (Array.isArray(obj.facilities) && obj.facilities.length > 0) {
    obj.facilities.forEach(f => {
      const text = typeof f === 'string' ? f : (f.facility || "");
      if (text && text.trim()) rawFacilities.push(text.trim());
    });
  }

  const seenFac = new Set();
  const uniqueFacilities = [];
  rawFacilities.forEach(fStr => {
    const key = fStr.toLowerCase();
    if (!seenFac.has(key)) {
      seenFac.add(key);
      uniqueFacilities.push(fStr);
    }
  });

  const formattedFacilities = uniqueFacilities.map(f => ({ facility: f }));

  return {
    ...obj,
    id: studioId,
    _id: obj._id,
    mitraId: mId,
    mitra_id: mId,
    logo: logo,
    image: mainImg,
    gmapsLink: gmaps,
    gmaps_link: gmaps,
    priceRange: pRange,
    price_range: pRange,
    paymentBankName: bankName,
    payment_bank_name: bankName,
    paymentAccountNumber: bankNum,
    payment_account_number: bankNum,
    paymentAccountHolder: bankHolder,
    payment_account_holder: bankHolder,
    qrisImage: qris,
    qris_image: qris,
    gallery_image: galleryImageFirst,
    images: formattedImages,
    facilities: formattedFacilities
  };
}

// Format Booking response so BOTH camelCase & snake_case exist simultaneously
function formatBooking(booking) {
  if (!booking) return null;
  const obj = typeof booking.toObject === 'function' ? booking.toObject({ virtuals: true }) : { ...booking };

  const id = obj.id !== undefined ? obj.id : obj._id.toString();
  const studioId = obj.studioId !== undefined ? obj.studioId : (obj.studio_id !== undefined ? obj.studio_id : null);
  const customerId = obj.customerId !== undefined ? obj.customerId : (obj.customer_id !== undefined ? obj.customer_id : null);
  const mitraId = obj.mitraId !== undefined ? obj.mitraId : (obj.mitra_id !== undefined ? obj.mitra_id : null);

  const bookingDate = obj.bookingDate || obj.booking_date || "";
  const bookingTime = obj.bookingTime || obj.booking_time || "";
  const totalPrice = obj.totalPrice !== undefined ? obj.totalPrice : (obj.total_price !== undefined ? obj.total_price : 0);
  const packageName = obj.packageName || obj.package_name || "Paket Reservasi";
  const pax = obj.pax || 1;
  const status = obj.status || "pending";

  const createdAt = obj.createdAt || obj.created_at || new Date();
  const gdriveLink = obj.gdriveLink || obj.gdrive_link || null;

  return {
    ...obj,
    id: !isNaN(Number(id)) ? Number(id) : id,
    _id: obj._id,
    studioId,
    studio_id: studioId,
    customerId,
    customer_id: customerId,
    mitraId,
    mitra_id: mitraId,
    bookingDate,
    booking_date: bookingDate,
    bookingTime,
    booking_time: bookingTime,
    totalPrice: Number(totalPrice),
    total_price: Number(totalPrice),
    packageName,
    package_name: packageName,
    pax,
    status,
    createdAt,
    created_at: createdAt,
    gdriveLink,
    gdrive_link: gdriveLink
  };
}

// Format Payment response so BOTH camelCase & snake_case exist simultaneously
function formatPayment(payment) {
  if (!payment) return null;
  const obj = typeof payment.toObject === 'function' ? payment.toObject({ virtuals: true }) : { ...payment };

  const id = obj.id !== undefined ? obj.id : obj._id.toString();
  const bookingId = obj.bookingId !== undefined ? obj.bookingId : (obj.booking_id !== undefined ? obj.booking_id : null);
  const customerId = obj.customerId !== undefined ? obj.customerId : (obj.customer_id !== undefined ? obj.customer_id : null);
  const mitraId = obj.mitraId !== undefined ? obj.mitraId : (obj.mitra_id !== undefined ? obj.mitra_id : null);

  const paymentMethod = obj.paymentMethod || obj.payment_method || "bank_transfer";
  const paymentChannel = obj.paymentChannel || obj.payment_channel || "BCA";
  const amount = obj.amount !== undefined ? obj.amount : 0;
  const status = obj.status || "pending";
  const proofImage = obj.proofImage || obj.proof_image || null;
  const paidAt = obj.paidAt || obj.paid_at || obj.createdAt || null;

  return {
    ...obj,
    id: !isNaN(Number(id)) ? Number(id) : id,
    _id: obj._id,
    bookingId,
    booking_id: bookingId,
    customerId,
    customer_id: customerId,
    mitraId,
    mitra_id: mitraId,
    paymentMethod,
    payment_method: paymentMethod,
    paymentChannel,
    payment_channel: paymentChannel,
    amount: Number(amount),
    status,
    proofImage,
    proof_image: proofImage,
    paidAt,
    paid_at: paidAt
  };
}

// Format Cancellation response so BOTH camelCase & snake_case exist simultaneously
function formatCancellation(cancellation) {
  if (!cancellation) return null;
  const obj = typeof cancellation.toObject === 'function' ? cancellation.toObject({ virtuals: true }) : { ...cancellation };

  const id = obj.id !== undefined ? obj.id : obj._id.toString();
  const bookingId = obj.bookingId !== undefined ? obj.bookingId : (obj.booking_id !== undefined ? obj.booking_id : null);
  const reason = obj.reason || "";
  const bankName = obj.bankName || obj.bank_name || "";
  const accountNumber = obj.accountNumber || obj.account_number || "";
  const accountName = obj.accountName || obj.account_name || "";
  const status = obj.status || "pending";

  let refundAmount = 0;
  if (obj.refundAmount !== undefined && obj.refundAmount !== null) {
    if (typeof obj.refundAmount === 'object' && obj.refundAmount.$numberDecimal) {
      refundAmount = Number(obj.refundAmount.$numberDecimal);
    } else {
      refundAmount = Number(obj.refundAmount);
    }
  } else if (obj.refund_amount !== undefined && obj.refund_amount !== null) {
    refundAmount = Number(obj.refund_amount);
  }

  return {
    ...obj,
    id: !isNaN(Number(id)) ? Number(id) : id,
    _id: obj._id,
    bookingId,
    booking_id: bookingId,
    reason,
    bankName,
    bank_name: bankName,
    accountNumber,
    account_number: accountNumber,
    accountName,
    account_name: accountName,
    status,
    refundAmount,
    refund_amount: refundAmount
  };
}

// Format Review response
function formatReview(review) {
  if (!review) return null;
  const obj = typeof review.toObject === 'function' ? review.toObject({ virtuals: true }) : { ...review };

  const id = obj.id !== undefined ? obj.id : obj._id.toString();
  const bookingId = obj.bookingId !== undefined ? obj.bookingId : (obj.booking_id !== undefined ? obj.booking_id : null);
  const studioId = obj.studioId !== undefined ? obj.studioId : (obj.studio_id !== undefined ? obj.studio_id : null);
  const userId = obj.userId !== undefined ? obj.userId : (obj.user_id !== undefined ? obj.user_id : null);

  return {
    ...obj,
    id: !isNaN(Number(id)) ? Number(id) : id,
    _id: obj._id,
    bookingId,
    booking_id: bookingId,
    studioId,
    studio_id: studioId,
    userId,
    user_id: userId,
    rating: Number(obj.rating || 5),
    comment: obj.comment || ""
  };
}

// Format Chat response
function formatChat(chat) {
  if (!chat) return null;
  const obj = typeof chat.toObject === 'function' ? chat.toObject({ virtuals: true }) : { ...chat };

  const id = obj.id !== undefined ? obj.id : obj._id.toString();
  const senderId = obj.senderId !== undefined ? obj.senderId : (obj.sender_id !== undefined ? obj.sender_id : null);
  const receiverId = obj.receiverId !== undefined ? obj.receiverId : (obj.receiver_id !== undefined ? obj.receiver_id : null);
  const bookingId = obj.bookingId !== undefined ? obj.bookingId : (obj.booking_id !== undefined ? obj.booking_id : null);

  return {
    ...obj,
    id: !isNaN(Number(id)) ? Number(id) : id,
    _id: obj._id,
    senderId,
    sender_id: senderId,
    receiverId,
    receiver_id: receiverId,
    bookingId,
    booking_id: bookingId,
    message: obj.message || "",
    isRead: Boolean(obj.isRead !== undefined ? obj.isRead : obj.is_read),
    is_read: Boolean(obj.isRead !== undefined ? obj.isRead : obj.is_read)
  };
}

/* ================= MULTER UPLOAD CONFIG ================= */
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "images/studios"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, name + ext);
    }
  })
});

const uploadPayments = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "images/payments"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = "proof-" + Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, name + ext);
    }
  })
});

const uploadProfile = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "images/users"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = "profile-" + Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, name + ext);
    }
  })
});

const cpUpload = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'studio_images[]', maxCount: 10 },
  { name: 'qris_image', maxCount: 1 }
]);

/* ================= USER AUTH & PROFILE ENDPOINTS ================= */

// REGISTER
app.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, phone, gender } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const exist = await User.findOne({ email });
    if (exist) {
      return res.status(409).json({ message: "Email sudah terdaftar" });
    }

    const nextId = await getNextSequence("User");

    const user = await User.create({
      id: nextId,
      name,
      email,
      password,
      role,
      phone: phone || null,
      gender: gender || null
    });

    res.json({ success: true, user: formatUser(user) });
  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);
    res.status(500).json({ message: "Register gagal" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });

    if (!user) return res.status(401).json({ message: "Login gagal! Periksa email/password." });

    res.json(formatUser(user));
  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    res.status(500).json({ message: "Login gagal" });
  }
});

// GET USER BY ID
app.get("/users/:id", async (req, res) => {
  try {
    const paramId = req.params.id;
    let user;
    if (!isNaN(Number(paramId))) {
      user = await User.findOne({ id: Number(paramId) });
    }
    if (!user && mongoose.Types.ObjectId.isValid(paramId)) {
      user = await User.findById(paramId);
    }
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(formatUser(user));
  } catch (err) {
    res.status(500).json({ message: "Gagal ambil data user" });
  }
});

// GET PROFILE
app.get('/profile', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  try {
    let user;
    if (!isNaN(Number(token))) {
      user = await User.findOne({ id: Number(token) });
    }
    if (!user && mongoose.Types.ObjectId.isValid(token)) {
      user = await User.findById(token);
    }

    if (!user) return res.status(404).send("User tidak ditemukan");
    res.json(formatUser(user));
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Error database");
  }
});

// UPDATE USER
app.put("/users/:id", async (req, res) => {
  const userId = req.params.id;
  const { name, email, phone, password } = req.body;

  try {
    const updateData = { name, email, phone };
    if (password && password.trim() !== "") {
      updateData.password = password;
    }

    let user;
    if (!isNaN(Number(userId))) {
      user = await User.findOneAndUpdate({ id: Number(userId) }, updateData, { new: true });
    }
    if (!user && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findByIdAndUpdate(userId, updateData, { new: true });
    }

    res.json({
      success: true,
      user: formatUser(user),
      message: "Profil berhasil diperbarui"
    });
  } catch (err) {
    console.error("❌ UPDATE USER ERROR:", err);
    res.status(500).json({ message: "Gagal update profil" });
  }
});

// UPDATE PROFILE
app.put('/profile', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);
  const userId = token;
  const { name, phone, gender, birthday } = req.body;

  try {
    let user;
    const updateData = { name, phone, gender: gender || null, birthday: birthday || null };
    if (!isNaN(Number(userId))) {
      user = await User.findOneAndUpdate({ id: Number(userId) }, updateData, { new: true });
    }
    if (!user && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findByIdAndUpdate(userId, updateData, { new: true });
    }

    res.json({
      success: true,
      user: formatUser(user),
      message: "Profil berhasil diperbarui"
    });
  } catch (err) {
    console.error("❌ UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: "Gagal update profil: " + err.message });
  }
});

// CHANGE PASSWORD
app.post('/change-password', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);
  const userId = token;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Data tidak lengkap" });
  }

  try {
    let user;
    if (!isNaN(Number(userId))) {
      user = await User.findOne({ id: Number(userId) });
    }
    if (!user && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    if (user.password !== currentPassword) {
      return res.status(400).json({ message: "Password saat ini salah" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password berhasil diubah" });
  } catch (err) {
    console.error("❌ CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ message: "Gagal ganti password" });
  }
});

// UPLOAD PROFILE PHOTO
app.post("/profile/upload-photo", uploadProfile.single("photo"), async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const userId = token;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Tidak ada file yang diupload" });
    }

    let user;
    if (!isNaN(Number(userId))) {
      user = await User.findOne({ id: Number(userId) });
    }
    if (!user && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }

    if (user && user.image) {
      const oldPath = path.join(__dirname, "images/users", user.image);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) { }
      }
    }

    if (user) {
      user.image = file.filename;
      await user.save();
    }

    res.json({
      success: true,
      image: file.filename,
      message: "Foto profil berhasil diperbarui"
    });
  } catch (err) {
    console.error("❌ PROFILE UPLOAD ERROR:", err);
    res.status(500).json({ message: "Gagal upload foto profil" });
  }
});

/* ================= STUDIOS MANAGEMENT ENDPOINTS ================= */

// GET LIST STUDIOS
app.get("/studios", async (req, res) => {
  try {
    const { category, city } = req.query;
    const filter = {
      $or: [
        { status: "active" },
        { status: { $exists: false } },
        { status: null },
        { status: "" }
      ]
    };

    if (category && typeof category === "string" && !["all", "semua", ""].includes(category.trim().toLowerCase())) {
      filter.category = new RegExp(category.trim(), "i");
    }

    if (city && typeof city === "string" && !["all", "semua", ""].includes(city.trim().toLowerCase())) {
      const cleanCity = city.trim();
      filter.$and = [
        {
          $or: [
            { city: new RegExp(cleanCity, "i") },
            { location: new RegExp(cleanCity, "i") }
          ]
        }
      ];
    }

    const studios = await Studio.find(filter).lean();

    // Safety deduplication by unique ID / name
    const seen = new Set();
    const uniqueStudios = [];
    for (const s of studios) {
      const key = s.id !== undefined && s.id !== null ? `id_${s.id}` : `name_${(s.name || '').trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueStudios.push(s);
      }
    }

    const studioIds = uniqueStudios.map(s => s.id || s._id).filter(Boolean);
    const galleryDocs = await StudioImage.find({ $or: [{ studio_id: { $in: studioIds } }, { studioId: { $in: studioIds } }] }).lean();
    const facilityDocs = await StudioFacility.find({ $or: [{ studio_id: { $in: studioIds } }, { studioId: { $in: studioIds } }] }).lean();

    const galleryMap = {};
    galleryDocs.forEach(g => {
      const sIdKey = String(g.studioId !== undefined ? g.studioId : g.studio_id);
      if (!galleryMap[sIdKey]) galleryMap[sIdKey] = [];
      galleryMap[sIdKey].push(g);
    });

    const facilityMap = {};
    facilityDocs.forEach(f => {
      const sIdKey = String(f.studioId !== undefined ? f.studioId : f.studio_id);
      if (!facilityMap[sIdKey]) facilityMap[sIdKey] = [];
      facilityMap[sIdKey].push(f);
    });

    const result = uniqueStudios.map(s => {
      const gDocs = galleryMap[String(s.id)] || galleryMap[String(s._id)] || null;
      const fDocs = facilityMap[String(s.id)] || facilityMap[String(s._id)] || null;
      return formatStudio(s, gDocs, fDocs);
    });

    res.json(result);
  } catch (err) {
    console.error("❌ GET STUDIOS ERROR:", err);
    res.status(500).json({ message: "Gagal ambil list studio" });
  }
});

// CREATE STUDIO
app.post("/studios", cpUpload, async (req, res) => {
  try {
    const parsedBody = parseNestedBody(req.body);

    const mitraIdRaw = parsedBody.mitraId || parsedBody.mitra_id;
    const {
      studio_name, studio_type, city,
      gmaps_link, gmapsLink, price_range, priceRange, description, address,
      payment_bank_name, paymentBankName, payment_account_number, paymentAccountNumber,
      payment_account_holder, paymentAccountHolder
    } = parsedBody;

    const studioName = studio_name || parsedBody.name;
    if (!mitraIdRaw || !studioName) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const mitraId = !isNaN(Number(mitraIdRaw)) ? Number(mitraIdRaw) : mitraIdRaw;

    const files = req.files || {};
    const logoFile = files['logo'] ? files['logo'][0].filename : null;
    const galleryFiles = files['studio_images[]'] || [];
    const image = logoFile || (galleryFiles.length > 0 ? galleryFiles[0].filename : null);
    const qrisFile = files['qris_image'] ? files['qris_image'][0].filename : null;

    const schedules = [];
    if (parsedBody.schedule) {
      for (const day in parsedBody.schedule) {
        const item = parsedBody.schedule[day] || {};
        const isClosed = item.closed === true || item.closed === "true" || item.closed === "on" || item.is_closed === true || item.is_closed === "true";
        schedules.push({
          day: day,
          is_closed: isClosed,
          isClosed: isClosed,
          open_time: isClosed ? "Libur" : (item.open || null),
          close_time: isClosed ? "Libur" : (item.close || null),
          openTime: isClosed ? "Libur" : (item.open || null),
          closeTime: isClosed ? "Libur" : (item.close || null)
        });
      }
    }

    const packages = [];
    if (parsedBody.packages) {
      for (const key in parsedBody.packages) {
        const p = parsedBody.packages[key];
        packages.push({
          id: Number(key) + 1,
          name: p.name,
          price: Number(p.price) || 0,
          description: p.description || null,
          session_duration: Number(p.duration || p.session_duration) || 60,
          break_duration: Number(p['break'] || p.break_duration) || 0,
          duration: Number(p.duration || p.session_duration) || 60,
          break: Number(p['break'] || p.break_duration) || 0
        });
      }
    }

    const facilities = [];
    if (parsedBody.facilities) {
      const arr = Array.isArray(parsedBody.facilities) ? parsedBody.facilities : [parsedBody.facilities];
      arr.forEach(f => {
        if (f && typeof f === 'string' && f.trim() !== "") facilities.push(f.trim());
      });
    }

    const rawImages = galleryFiles.map(f => f.filename);
    const nextStudioId = await getNextSequence("Studio");

    const computedRange = calculatePriceRange(packages);
    const finalPriceRange = computedRange || priceRange || price_range || null;

    const studio = await Studio.create({
      id: nextStudioId,
      mitraId: mitraId,
      mitra_id: mitraId,
      name: studioName,
      logo: logoFile,
      location: address || parsedBody.location || null,
      category: studio_type || parsedBody.category || null,
      city: city || null,
      gmapsLink: gmapsLink || gmaps_link || null,
      gmaps_link: gmapsLink || gmaps_link || null,
      priceRange: finalPriceRange,
      price_range: finalPriceRange,
      description: description || null,
      status: "active",
      image: image,
      paymentBankName: paymentBankName || payment_bank_name || null,
      payment_bank_name: paymentBankName || payment_bank_name || null,
      paymentAccountNumber: paymentAccountNumber || payment_account_number || null,
      payment_account_number: paymentAccountNumber || payment_account_number || null,
      paymentAccountHolder: paymentAccountHolder || payment_account_holder || null,
      payment_account_holder: paymentAccountHolder || payment_account_holder || null,
      qrisImage: qrisFile,
      qris_image: qrisFile,
      facilities,
      images: rawImages,
      schedules,
      packages
    });

    if (rawImages.length > 0) {
      for (const imgName of rawImages) {
        const nextImgId = await getNextSequence("StudioImage");
        await StudioImage.create({
          id: nextImgId,
          studio_id: studio.id,
          studioId: studio.id,
          image: imgName
        });
      }
    }

    res.json({ success: true, studio_id: studio.id, studioId: studio.id, _id: studio._id });
  } catch (err) {
    console.error("❌ INSERT STUDIO ERROR:", err);
    res.status(500).json({ message: "Gagal menyimpan studio" });
  }
});

// CHECK HAS STUDIO (MATCHES BY numeric users.id === studios.mitraId)
app.get("/mitra/:id/has-studio", async (req, res) => {
  try {
    const filter = getMitraStudioFilter(req.params.id);
    const studio = await Studio.findOne(filter);
    res.json({ hasStudio: !!studio });
  } catch (err) {
    console.error("❌ HAS STUDIO ERROR:", err);
    res.status(500).json({ message: "Error cek studio" });
  }
});

// GET MY STUDIO DETAIL FOR MITRA
app.get("/mitra/:mitraId/studio-detail", async (req, res) => {
  try {
    const filter = getMitraStudioFilter(req.params.mitraId);
    const studio = await Studio.findOne(filter).lean();
    if (!studio) {
      return res.json({ exists: false });
    }

    const studioIdMatch = [studio._id, studio.id].filter(Boolean);
    const galleryDocs = await StudioImage.find({ $or: [{ studio_id: { $in: studioIdMatch } }, { studioId: { $in: studioIdMatch } }] }).lean();
    const facilityDocs = await StudioFacility.find({ $or: [{ studio_id: { $in: studioIdMatch } }, { studioId: { $in: studioIdMatch } }] }).lean();
    const reviews = await Review.find({ studio_id: { $in: studioIdMatch } }).lean();
    const count = reviews.length;
    const avg = count > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / count) : 0;

    const formatted = formatStudio(studio, galleryDocs, facilityDocs);

    res.json({
      exists: true,
      data: {
        ...formatted,
        rating: count > 0 ? avg.toFixed(1) : "0.0",
        review_count: count
      }
    });
  } catch (err) {
    console.error("❌ GET MY STUDIO ERROR:", err);
    res.status(500).json({ message: "Gagal mengambil data studio" });
  }
});

// GET STUDIO DETAIL BY STUDIO ID
app.get("/studios/:id/detail", async (req, res) => {
  try {
    const targetId = req.params.id;
    let studio;
    if (!isNaN(Number(targetId))) {
      studio = await Studio.findOne({ id: Number(targetId) }).lean();
    }
    if (!studio && mongoose.Types.ObjectId.isValid(targetId)) {
      studio = await Studio.findById(targetId).lean();
    }
    if (!studio) {
      studio = await Studio.findOne({ $or: [{ id: targetId }, { _id: targetId }] }).lean();
    }

    if (!studio) {
      return res.status(404).json({ message: "Studio tidak ditemukan" });
    }

    const studioIdMatch = [];
    if (studio._id) studioIdMatch.push(studio._id, studio._id.toString());
    if (studio.id !== undefined && studio.id !== null) {
      studioIdMatch.push(studio.id, String(studio.id));
      if (!isNaN(Number(studio.id))) studioIdMatch.push(Number(studio.id));
    }

    const galleryDocs = await StudioImage.find({ $or: [{ studio_id: { $in: studioIdMatch } }, { studioId: { $in: studioIdMatch } }] }).lean();
    const facilityDocs = await StudioFacility.find({ $or: [{ studio_id: { $in: studioIdMatch } }, { studioId: { $in: studioIdMatch } }] }).lean();

    const rawReviews = await Review.find({
      $or: [
        { studio_id: { $in: studioIdMatch } },
        { studioId: { $in: studioIdMatch } }
      ]
    }).sort({ createdAt: -1 }).lean();

    const reviewerUserIds = Array.from(new Set(rawReviews.map(r => r.user_id !== undefined ? r.user_id : r.userId).filter(Boolean)));
    const userObjIds = reviewerUserIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const userNumIds = reviewerUserIds.filter(id => !isNaN(Number(id))).map(Number);
    const userStrIds = reviewerUserIds.map(String);

    const userConds = [];
    if (userObjIds.length > 0) userConds.push({ _id: { $in: userObjIds } });
    if (userNumIds.length > 0) userConds.push({ id: { $in: userNumIds } });
    if (userStrIds.length > 0) userConds.push({ id: { $in: userStrIds } });

    const reviewerUsers = userConds.length > 0 ? await User.find({ $or: userConds }).lean() : [];
    const userMap = {};
    reviewerUsers.forEach(u => {
      if (u.id !== undefined) {
        userMap[String(u.id)] = u.name;
        userMap[Number(u.id)] = u.name;
      }
      if (u._id) userMap[u._id.toString()] = u.name;
    });

    const summary = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalRatingSum = 0;

    const formattedReviews = rawReviews.map(r => {
      const rating = Number(r.rating || 5);
      summary[rating] = (summary[rating] || 0) + 1;
      totalRatingSum += rating;

      const uKey = r.user_id !== undefined ? String(r.user_id) : (r.userId !== undefined ? String(r.userId) : "");
      const reviewerName = userMap[uKey] || "Pengguna";

      return {
        id: (r.id || r._id).toString(),
        reviewer: reviewerName,
        initial: reviewerName.charAt(0).toUpperCase(),
        rating: rating,
        comment: r.comment || "",
        date: r.createdAt || new Date()
      };
    });

    const totalReviews = rawReviews.length;
    const avgRating = totalReviews > 0 ? (totalRatingSum / totalReviews) : null;
    const formattedStudio = formatStudio(studio, galleryDocs, facilityDocs);

    res.json({
      studio: {
        ...formattedStudio,
        rating: avgRating,
        totalReviews: totalReviews
      },
      images: formattedStudio.images,
      facilities: formattedStudio.facilities,
      packages: formattedStudio.packages || [],
      schedules: formattedStudio.schedules || [],
      reviews: {
        summary: summary,
        list: formattedReviews
      }
    });

  } catch (err) {
    console.error("❌ DETAIL STUDIO ERROR:", err);
    res.status(500).json({ message: "Gagal mengambil detail studio" });
  }
});

// UPDATE STUDIO LOGO
app.post("/studios/:id/logo", upload.single("logo"), async (req, res) => {
  try {
    const studioId = req.params.id;
    const newLogo = req.file ? req.file.filename : null;
    if (!newLogo) return res.status(400).json({ message: "Tidak ada file logo" });

    let filter = {};
    if (!isNaN(Number(studioId))) filter = { id: Number(studioId) };
    else if (mongoose.Types.ObjectId.isValid(studioId)) filter = { _id: studioId };

    const studio = await Studio.findOne(filter);
    if (studio && studio.logo) {
      const oldPath = path.join(__dirname, "images/studios", studio.logo);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await Studio.findOneAndUpdate(filter, { logo: newLogo });
    res.json({ success: true, logo: newLogo, message: "Logo berhasil diupdate" });
  } catch (err) {
    console.error("❌ UPDATE LOGO ERROR:", err);
    res.status(500).json({ message: "Gagal update logo" });
  }
});

// UPDATE QRIS IMAGE
app.post("/studios/:id/qris", upload.single("qris_image"), async (req, res) => {
  try {
    const studioId = req.params.id;
    const newQris = req.file ? req.file.filename : null;
    if (!newQris) return res.status(400).json({ message: "Tidak ada file QRIS" });

    let filter = {};
    if (!isNaN(Number(studioId))) filter = { id: Number(studioId) };
    else if (mongoose.Types.ObjectId.isValid(studioId)) filter = { _id: studioId };

    const studio = await Studio.findOne(filter);
    if (studio && (studio.qrisImage || studio.qris_image)) {
      const oldPath = path.join(__dirname, "images/studios", studio.qrisImage || studio.qris_image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await Studio.findOneAndUpdate(filter, { qrisImage: newQris, qris_image: newQris });
    res.json({ success: true, qris_image: newQris, qrisImage: newQris, message: "QRIS berhasil diupdate" });
  } catch (err) {
    console.error("❌ UPDATE QRIS ERROR:", err);
    res.status(500).json({ message: "Gagal update QRIS" });
  }
});

// UPLOAD GALLERY IMAGES
app.post("/studios/:id/images", upload.array("new_images", 10), async (req, res) => {
  try {
    const studioId = req.params.id;
    let filter = {};
    if (!isNaN(Number(studioId))) filter = { id: Number(studioId) };
    else if (mongoose.Types.ObjectId.isValid(studioId)) filter = { _id: studioId };

    const studio = await Studio.findOne(filter);
    if (!studio) return res.status(404).json({ message: "Studio tidak ditemukan" });

    const currentCount = (studio.images || []).length;
    const newCount = currentCount + (req.files ? req.files.length : 0);

    if (newCount > 10) {
      if (req.files) {
        req.files.forEach(f => {
          const filePath = path.join(__dirname, "images/studios", f.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
      }
      return res.status(400).json({ message: `Gagal. Maksimal 10 foto.` });
    }

    const newFilenames = req.files.map(f => f.filename);
    studio.images.push(...newFilenames);
    await studio.save();

    res.json({ success: true, message: "Foto berhasil ditambahkan" });
  } catch (err) {
    console.error("❌ UPLOAD ERROR:", err);
    res.status(500).json({ message: "Gagal upload foto" });
  }
});

// DELETE GALLERY IMAGE BY FILENAME
app.delete("/studios/:studioId/images/:filename", async (req, res) => {
  try {
    const { studioId, filename } = req.params;
    let filter = {};
    if (!isNaN(Number(studioId))) filter = { id: Number(studioId) };
    else if (mongoose.Types.ObjectId.isValid(studioId)) filter = { _id: studioId };

    const studio = await Studio.findOne(filter);
    if (!studio) return res.status(404).json({ message: "Studio tidak ditemukan" });

    studio.images = (studio.images || []).filter(img => img !== filename);
    await studio.save();

    const filePath = path.join(__dirname, "images/studios", filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ success: true, message: "Foto berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ message: "Gagal menghapus foto" });
  }
});

// UPDATE STUDIO DATA
app.put("/studios/:studioId", async (req, res) => {
  try {
    const targetId = req.params.studioId;
    const {
      name, description, price_range, priceRange, facilities, schedules, gmaps_link, gmapsLink,
      payment_bank_name, paymentBankName, payment_account_number, paymentAccountNumber,
      payment_account_holder, paymentAccountHolder, packages
    } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    if (packages && Array.isArray(packages)) {
      updateData.packages = packages;
      const computedRange = calculatePriceRange(packages);
      if (computedRange) {
        updateData.priceRange = computedRange;
        updateData.price_range = computedRange;
      }
    }

    if (!updateData.priceRange) {
      const pRange = priceRange || price_range;
      if (pRange) { updateData.priceRange = pRange; updateData.price_range = pRange; }
    }

    const gmaps = gmapsLink || gmaps_link;
    if (gmaps) { updateData.gmapsLink = gmaps; updateData.gmaps_link = gmaps; }

    const bName = paymentBankName || payment_bank_name;
    if (bName) { updateData.paymentBankName = bName; updateData.payment_bank_name = bName; }

    const bNum = paymentAccountNumber || payment_account_number;
    if (bNum) { updateData.paymentAccountNumber = bNum; updateData.payment_account_number = bNum; }

    const bHolder = paymentAccountHolder || payment_account_holder;
    if (bHolder) { updateData.paymentAccountHolder = bHolder; updateData.payment_account_holder = bHolder; }

    if (facilities) updateData.facilities = facilities;
    if (schedules && Array.isArray(schedules)) {
      updateData.schedules = schedules.map(s => {
        const isClosed = s.is_closed === true || s.is_closed === "true" || s.isClosed === true || s.isClosed === "true" || s.open === "Libur" || s.open_time === "Libur";
        return {
          day: s.day,
          is_closed: isClosed,
          isClosed: isClosed,
          open_time: isClosed ? "Libur" : (s.open || s.open_time || null),
          close_time: isClosed ? "Libur" : (s.close || s.close_time || null),
          openTime: isClosed ? "Libur" : (s.open || s.open_time || null),
          closeTime: isClosed ? "Libur" : (s.close || s.close_time || null)
        };
      });
    }

    let filter = {};
    if (!isNaN(Number(targetId))) {
      filter = { id: Number(targetId) };
    } else if (mongoose.Types.ObjectId.isValid(targetId)) {
      filter = { _id: targetId };
    } else {
      filter = { id: targetId };
    }

    await Studio.findOneAndUpdate(filter, updateData);

    res.json({ success: true, message: "Studio dan Detail Pembayaran berhasil diupdate" });
  } catch (err) {
    console.error("❌ UPDATE STUDIO ERROR:", err);
    res.status(500).json({ message: "Gagal update: " + err.message });
  }
});

/* ================= DASHBOARD, BOOKINGS & PAYMENTS ================= */

// DASHBOARD MITRA
app.get("/mitra/dashboard/:id", async (req, res) => {
  const mitraId = req.params.id;
  try {
    let user;
    if (!isNaN(Number(mitraId))) {
      user = await User.findOne({ id: Number(mitraId) });
    }
    if (!user && mongoose.Types.ObjectId.isValid(mitraId)) {
      user = await User.findById(mitraId);
    }
    const mitraName = user ? user.name : "Mitra";

    const todayStr = new Date().toISOString().split('T')[0];

    const bookingFilter = await getMitraBookingFilter(mitraId);
    const rawBookings = await Booking.find(bookingFilter).lean();
    const bookings = rawBookings.map(formatBooking);

    const rawCancellations = await Cancellation.find().lean();
    const cancellations = rawCancellations.map(formatCancellation);

    const cancelBookingMap = {};
    cancellations.forEach(c => {
      if (c.booking_id) cancelBookingMap[String(c.booking_id)] = c;
      if (c.bookingId) cancelBookingMap[String(c.bookingId)] = c;
    });

    let todayCount = 0;
    let pendingCount = 0;
    let revenueTotal = 0;

    bookings.forEach(b => {
      const bDateStr = String(b.booking_date || "").split('T')[0];
      if (bDateStr === todayStr && b.status !== 'cancelled' && b.status !== 'rejected') {
        todayCount++;
      }
      if (b.status === 'pending') {
        pendingCount++;
      }

      const bId = String(b._id);
      const bNumId = b.id ? String(b.id) : null;

      const isRevenueStatus = ['confirmed', 'completed', 'paid'].includes(b.status);
      const cancelObj = cancelBookingMap[bId] || (bNumId ? cancelBookingMap[bNumId] : null);
      const isCancelledNoRefund = (b.status === 'cancelled' && cancelObj &&
        (cancelObj.status === 'rejected_by_policy' || cancelObj.refund_amount === 0));

      if (isRevenueStatus || isCancelledNoRefund) {
        revenueTotal += (Number(b.total_price) || 0);
      }
    });

    const cancelRequestsCount = cancellations.filter(c => {
      if (!c.booking_id && !c.bookingId) return false;
      const cBId = String(c.booking_id || c.bookingId);
      const b = bookings.find(bk => String(bk._id) === cBId || (bk.id && String(bk.id) === cBId));
      return b && c.status === 'pending';
    }).length;

    const stats = {
      today: todayCount,
      pending: pendingCount,
      cancellation: cancelRequestsCount,
      revenue: revenueTotal
    };

    const studioFilter = getMitraStudioFilter(mitraId);
    const studios = await Studio.find(studioFilter).lean();
    const studioMap = {};
    studios.forEach(s => {
      studioMap[String(s._id)] = s.name;
      if (s.id) studioMap[String(s.id)] = s.name;
    });

    const cancelList = [];
    cancellations.forEach(c => {
      if (!c.booking_id && !c.bookingId) return;
      const cBId = String(c.booking_id || c.bookingId);
      const b = bookings.find(bk => String(bk._id) === cBId || (bk.id && String(bk.id) === cBId));
      if (b && ['pending', 'rejected_by_policy'].includes(c.status)) {
        const stName = b.studio_id ? (studioMap[String(b.studio_id)] || "Studio") : "Studio";
        cancelList.push({
          id: String(c.id || c._id),
          location: stName,
          date: String(b.booking_date || "").split('T')[0],
          refund: c.refund_amount || 0,
          package: b.package_name || "Paket Reservasi",
          status: c.status
        });
      }
    });

    const upcomingList = bookings
      .filter(b => String(b.booking_date || "").split('T')[0] >= todayStr && ['confirmed', 'pending'].includes(b.status))
      .sort((a, b) => String(a.booking_date || "").localeCompare(String(b.booking_date || "")))
      .slice(0, 5)
      .map(b => {
        const stName = b.studio_id ? (studioMap[String(b.studio_id)] || "Studio") : "Studio";
        return {
          location: stName,
          date: String(b.booking_date || "").split('T')[0],
          time: b.booking_time,
          status: b.status,
          statusLabel: b.status === 'confirmed' ? 'Siap' : 'Menunggu'
        };
      });

    const historyList = [];
    bookings
      .filter(b => b.status === 'cancelled' || b.status === 'rejected')
      .slice(0, 3)
      .forEach(b => {
        const c = cancelBookingMap[String(b._id)] || (b.id ? cancelBookingMap[String(b.id)] : null);
        const stName = b.studio_id ? (studioMap[String(b.studio_id)] || "Studio") : "Studio";
        historyList.push({
          location: stName,
          reason: c ? c.reason : "Dibatalkan oleh sistem/admin"
        });
      });

    res.json({
      mitraName,
      stats,
      cancellationRequests: cancelList.slice(0, 5),
      upcomingSchedule: upcomingList,
      historyCancellations: historyList
    });
  } catch (err) {
    console.error("❌ Error Dashboard:", err);
    res.status(500).json({ message: "Error dashboard" });
  }
});

// CREATE BOOKING
app.post("/bookings", async (req, res) => {
  try {
    const { studio_id, studioId, customer_id, customerId, mitra_id, mitraId, booking_date, bookingDate, booking_time, bookingTime, total_price, totalPrice, package_name, packageName, pax } = req.body;

    const sId = studioId !== undefined ? studioId : studio_id;
    const cId = customerId !== undefined ? customerId : customer_id;
    const mId = mitraId !== undefined ? mitraId : mitra_id;
    const bDate = bookingDate || booking_date;
    const bTime = bookingTime || booking_time;
    const tPrice = totalPrice !== undefined ? totalPrice : (total_price || 0);
    const pName = packageName || package_name || null;

    const nextBookingId = await getNextSequence("Booking");

    const booking = await Booking.create({
      id: nextBookingId,
      studio_id: !isNaN(Number(sId)) ? Number(sId) : sId,
      studioId: !isNaN(Number(sId)) ? Number(sId) : sId,
      customer_id: !isNaN(Number(cId)) ? Number(cId) : cId,
      customerId: !isNaN(Number(cId)) ? Number(cId) : cId,
      mitra_id: !isNaN(Number(mId)) ? Number(mId) : mId,
      mitraId: !isNaN(Number(mId)) ? Number(mId) : mId,
      booking_date: bDate,
      bookingDate: bDate,
      booking_time: bTime,
      bookingTime: bTime,
      total_price: Number(tPrice),
      totalPrice: Number(tPrice),
      package_name: pName,
      packageName: pName,
      pax: pax || 1,
      status: "pending"
    });

    res.json({ success: true, booking_id: booking.id || booking._id, bookingId: booking.id || booking._id, booking: formatBooking(booking) });
  } catch (err) {
    console.error("❌ BOOKING ERROR:", err);
    res.status(500).json({ message: "Gagal membuat reservasi" });
  }
});

// GET BOOKINGS LIST (MITRA)
app.get("/mitra/bookings/:mitraId", async (req, res) => {
  try {
    const filter = await getMitraBookingFilter(req.params.mitraId);
    const rawBookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    const bookings = rawBookings.map(formatBooking);

    const studioIds = bookings.map(b => b.studio_id).filter(Boolean);
    const customerIds = bookings.map(b => b.customer_id).filter(Boolean);

    const studioObjIds = studioIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const studioNumIds = studioIds.filter(id => !isNaN(Number(id))).map(Number);
    const studioConds = [];
    if (studioObjIds.length > 0) studioConds.push({ _id: { $in: studioObjIds } });
    if (studioNumIds.length > 0) studioConds.push({ id: { $in: studioNumIds } });

    const studios = studioConds.length > 0 ? await Studio.find({ $or: studioConds }).lean() : [];
    const formattedStudios = studios.map(formatStudio);

    const custObjIds = customerIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const custNumIds = customerIds.filter(id => !isNaN(Number(id))).map(Number);
    const custConds = [];
    if (custObjIds.length > 0) custConds.push({ _id: { $in: custObjIds } });
    if (custNumIds.length > 0) custConds.push({ id: { $in: custNumIds } });

    const customers = custConds.length > 0 ? await User.find({ $or: custConds }).lean() : [];
    const formattedCustomers = customers.map(formatUser);

    const rawPayments = await Payment.find().lean();
    const payments = rawPayments.map(formatPayment);
    const paymentMap = {};
    payments.forEach(p => {
      if (p.booking_id) paymentMap[String(p.booking_id)] = p.proof_image;
      if (p.bookingId) paymentMap[String(p.bookingId)] = p.proof_image;
    });

    const result = bookings.map(b => {
      const bId = String(b._id);
      const numBId = b.id ? String(b.id) : null;
      const proof = paymentMap[bId] || (numBId ? paymentMap[numBId] : null) || null;
      const studio = formattedStudios.find(s => String(s.id) === String(b.studio_id) || String(s._id) === String(b.studio_id));
      const customer = formattedCustomers.find(c => String(c.id) === String(b.customer_id) || String(c._id) === String(b.customer_id));

      return {
        ...b,
        id: b.id || bId,
        studio_name: studio ? studio.name : "Studio",
        studioName: studio ? studio.name : "Studio",
        customer_name: customer ? customer.name : "Pelanggan",
        customerName: customer ? customer.name : "Pelanggan",
        customer_image: customer ? customer.image : null,
        customerImage: customer ? customer.image : null,
        customer_phone: customer ? customer.phone : "",
        customerPhone: customer ? customer.phone : "",
        proof_image: proof,
        proofImage: proof,
        studio,
        customer
      };
    });

    res.json(result);
  } catch (err) {
    console.error("❌ GET MITRA BOOKINGS ERROR:", err);
    res.status(500).json({ message: "Gagal ambil data reservasi" });
  }
});

// HELPER: CALCULATE DYNAMIC PRICE RANGE FROM PACKAGES
function calculatePriceRange(packages) {
  if (!packages || !Array.isArray(packages) || packages.length === 0) return null;
  const prices = packages
    .map(p => Number(p.price || p.price_range || 0))
    .filter(p => !isNaN(p) && p > 0);

  if (prices.length === 0) return null;

  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const fmtRp = num => "Rp " + num.toLocaleString("id-ID");

  if (minP === maxP) {
    return fmtRp(minP);
  } else {
    return `${fmtRp(minP)} - ${fmtRp(maxP)}`;
  }
}

// UPDATE BOOKING STATUS
app.patch("/bookings/:id/status", async (req, res) => {
  try {
    const { status, gdrive_link, gdriveLink } = req.body;
    const bookingId = req.params.id;

    let filter = {};
    if (!isNaN(Number(bookingId))) filter = { id: Number(bookingId) };
    else if (mongoose.Types.ObjectId.isValid(bookingId)) filter = { _id: bookingId };

    const updatePayload = { status };
    const link = gdrive_link || gdriveLink;
    if (link !== undefined) {
      updatePayload.gdrive_link = link;
      updatePayload.gdriveLink = link;
    }

    const rawBooking = await Booking.findOneAndUpdate(filter, updatePayload, { new: true }).lean();
    const booking = formatBooking(rawBooking);

    let paymentStatus = null;
    if (status === 'confirmed') paymentStatus = 'paid';
    else if (status === 'rejected') paymentStatus = 'rejected';

    if (paymentStatus && booking) {
      const bConds = [];
      if (booking.id) bConds.push({ booking_id: booking.id }, { bookingId: booking.id });
      if (booking._id) bConds.push({ booking_id: booking._id }, { bookingId: booking._id });

      if (bConds.length > 0) {
        await Payment.updateMany({ $or: bConds }, { status: paymentStatus });
      }
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error("❌ UPDATE STATUS ERROR:", err);
    res.status(500).json({ message: "Gagal update status" });
  }
});

// GET SINGLE BOOKING
app.get("/bookings/:id", async (req, res) => {
  try {
    const bookingId = req.params.id;
    let filter = {};
    if (!isNaN(Number(bookingId))) filter = { id: Number(bookingId) };
    else if (mongoose.Types.ObjectId.isValid(bookingId)) filter = { _id: bookingId };

    const rawBooking = await Booking.findOne(filter).lean();

    if (!rawBooking) return res.status(404).json({ message: "Booking tidak ditemukan" });

    const booking = formatBooking(rawBooking);

    let rawStudio = null;
    if (booking.studio_id) {
      if (!isNaN(Number(booking.studio_id))) rawStudio = await Studio.findOne({ id: Number(booking.studio_id) }).lean();
      if (!rawStudio && mongoose.Types.ObjectId.isValid(booking.studio_id)) rawStudio = await Studio.findById(booking.studio_id).lean();
    }
    const studio = formatStudio(rawStudio) || {};

    const rawPayment = await Payment.findOne({ $or: [{ booking_id: booking._id }, { bookingId: booking._id }, { booking_id: booking.id }, { bookingId: booking.id }] }).lean();
    const payment = formatPayment(rawPayment);

    const rawCancellation = await Cancellation.findOne({ $or: [{ booking_id: booking._id }, { bookingId: booking._id }, { booking_id: booking.id }, { bookingId: booking.id }] }).lean();
    const cancellation = formatCancellation(rawCancellation);

    res.json({
      ...booking,
      id: booking.id || booking._id.toString(),
      studio_name: studio.name || "Studio",
      studioName: studio.name || "Studio",
      studio_location: studio.location || studio.city || "",
      studioLocation: studio.location || studio.city || "",
      studio_image: studio.logo || studio.image || "",
      studioImage: studio.logo || studio.image || "",
      mitra_id: studio.mitraId || booking.mitra_id || booking.mitraId,
      mitraId: studio.mitraId || booking.mitra_id || booking.mitraId,
      payment_bank_name: studio.paymentBankName || null,
      paymentBankName: studio.paymentBankName || null,
      payment_account_number: studio.paymentAccountNumber || null,
      paymentAccountNumber: studio.paymentAccountNumber || null,
      qris_image: studio.qrisImage || null,
      qrisImage: studio.qrisImage || null,
      paid_amount: payment ? payment.amount : null,
      paidAmount: payment ? payment.amount : null,
      payment_method: payment ? payment.payment_method : null,
      paymentMethod: payment ? payment.payment_method : null,
      payment_status: payment ? payment.status : null,
      paymentStatus: payment ? payment.status : null,
      cancel_status: cancellation ? cancellation.status : null,
      cancelStatus: cancellation ? cancellation.status : null,
      refund_amount: cancellation ? cancellation.refund_amount : null,
      refundAmount: cancellation ? cancellation.refund_amount : null,
      cancel_reason: cancellation ? cancellation.reason : null,
      cancelReason: cancellation ? cancellation.reason : null,
      studio,
      payment,
      cancellation
    });
  } catch (err) {
    console.error("❌ GET BOOKING ERROR:", err);
    res.status(500).json({ message: "Gagal ambil detail booking" });
  }
});

// PAYMENT
app.post("/payments", uploadPayments.single("proof_image"), async (req, res) => {
  try {
    const { booking_id, bookingId, customer_id, customerId, mitra_id, mitraId, payment_method, paymentMethod, payment_channel, paymentChannel, amount } = req.body;
    const proofFile = req.file ? req.file.filename : null;

    const bId = bookingId !== undefined ? bookingId : booking_id;
    const cId = customerId !== undefined ? customerId : customer_id;
    const mId = mitraId !== undefined ? mitraId : mitra_id;
    const pMethod = paymentMethod || payment_method || "bank_transfer";
    const pChannel = paymentChannel || payment_channel || "BCA";
    const pAmount = amount || 0;

    const nextPaymentId = await getNextSequence("Payment");

    const payment = await Payment.create({
      id: nextPaymentId,
      booking_id: !isNaN(Number(bId)) ? Number(bId) : bId,
      bookingId: !isNaN(Number(bId)) ? Number(bId) : bId,
      customer_id: !isNaN(Number(cId)) ? Number(cId) : cId,
      customerId: !isNaN(Number(cId)) ? Number(cId) : cId,
      mitra_id: !isNaN(Number(mId)) ? Number(mId) : mId,
      mitraId: !isNaN(Number(mId)) ? Number(mId) : mId,
      payment_method: pMethod,
      paymentMethod: pMethod,
      payment_channel: pChannel,
      paymentChannel: pChannel,
      amount: Number(pAmount),
      status: "paid",
      proof_image: proofFile,
      proofImage: proofFile,
      paid_at: new Date(),
      paidAt: new Date()
    });

    // Keep booking status as 'pending' so Mitra must review and accept/ACC the reservation
    if (bId) {
      const bConds = [];
      if (!isNaN(Number(bId))) bConds.push({ id: Number(bId) });
      if (mongoose.Types.ObjectId.isValid(bId)) bConds.push({ _id: bId });
      if (bConds.length > 0) {
        await Booking.updateMany({ $or: bConds }, { $set: { status: "pending" } });
      }
    }

    res.json({ success: true, message: "Bukti pembayaran berhasil diunggah", payment: formatPayment(payment) });
  } catch (err) {
    console.error("❌ PAYMENT ERROR:", err);
    res.status(500).json({ message: "Gagal memproses pembayaran" });
  }
});

// GET CUSTOMER BOOKING HISTORY
app.get("/customers/:customerId/bookings", async (req, res) => {
  try {
    const custId = req.params.customerId;
    const numId = Number(custId);
    const strId = String(custId);
    const conditions = [];

    if (!isNaN(numId)) {
      conditions.push({ customer_id: numId });
      conditions.push({ customerId: numId });
    }
    conditions.push({ customer_id: strId });
    conditions.push({ customerId: strId });
    if (mongoose.Types.ObjectId.isValid(strId)) {
      conditions.push({ customer_id: new mongoose.Types.ObjectId(strId) });
      conditions.push({ customerId: new mongoose.Types.ObjectId(strId) });
    }

    const rawBookings = await Booking.find({ $or: conditions })
      .sort({ createdAt: -1 })
      .lean();
    const bookings = rawBookings.map(formatBooking);

    const studioIds = bookings.map(b => b.studio_id).filter(Boolean);
    const studioObjIds = studioIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const studioNumIds = studioIds.filter(id => !isNaN(Number(id))).map(Number);
    const studioConds = [];
    if (studioObjIds.length > 0) studioConds.push({ _id: { $in: studioObjIds } });
    if (studioNumIds.length > 0) studioConds.push({ id: { $in: studioNumIds } });

    const studios = studioConds.length > 0 ? await Studio.find({ $or: studioConds }).lean() : [];
    const formattedStudios = studios.map(formatStudio);

    const bookingIds = bookings.map(b => b.id || b._id);
    const rawCancellations = await Cancellation.find({ $or: [{ booking_id: { $in: bookingIds } }, { bookingId: { $in: bookingIds } }] }).lean();
    const cancellations = rawCancellations.map(formatCancellation);
    const cancelMap = {};
    cancellations.forEach(c => {
      if (c.booking_id) cancelMap[String(c.booking_id)] = c.status;
      if (c.bookingId) cancelMap[String(c.bookingId)] = c.status;
    });

    const result = bookings.map(b => {
      const st = formattedStudios.find(s => String(s.id) === String(b.studio_id) || String(s._id) === String(b.studio_id)) || {};
      const cStatus = cancelMap[String(b._id)] || (b.id ? cancelMap[String(b.id)] : null) || null;

      return {
        ...b,
        id: b.id || b._id.toString(),
        studio_name: st.name || "Studio",
        studioName: st.name || "Studio",
        studio_location: st.location || st.city || "",
        studioLocation: st.location || st.city || "",
        studio_image: st.gallery_image || st.image || null,
        studioImage: st.gallery_image || st.image || null,
        cancel_status: cStatus,
        cancelStatus: cStatus,
        studio: st
      };
    });

    res.json(result);
  } catch (err) {
    console.error("❌ GET CUSTOMER BOOKINGS ERROR:", err);
    res.status(500).json({ message: "Gagal ambil riwayat reservasi" });
  }
});

// REQUEST CANCELLATION
app.post("/bookings/:id/cancel-request", async (req, res) => {
  const bookingId = req.params.id;
  const { reason, bank_name, account_number, account_name } = req.body;

  try {
    let filter = {};
    if (!isNaN(Number(bookingId))) filter = { id: Number(bookingId) };
    else if (mongoose.Types.ObjectId.isValid(bookingId)) filter = { _id: bookingId };

    const booking = await Booking.findOne(filter);
    if (!booking) return res.status(404).json({ message: "Booking tidak ditemukan" });
    if (booking.status === 'cancelled') return res.status(400).json({ message: "Booking sudah dibatalkan sebelumnya" });

    let bDateObj;
    const bDateStr = booking.booking_date || booking.bookingDate || "";
    const bTimeStr = booking.booking_time || booking.bookingTime || "";
    if (bDateStr && bTimeStr) {
      bDateObj = new Date(`${bDateStr}T${bTimeStr.substring(0, 5)}:00`);
    } else if (bDateStr) {
      bDateObj = new Date(`${bDateStr}T00:00:00`);
    } else {
      bDateObj = new Date();
    }

    const now = new Date();
    const diffTime = bDateObj.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    let cancelStatus = 'pending';
    let refundAmount = Number(booking.total_price || booking.totalPrice || 0);

    // H-2 Policy: Pembatalan SEBELUM H-2 (diffDays >= 2) -> Refund 100%
    // Pembatalan MULAI H-2 s/d Hari H (diffDays < 2) -> Uang Hangus / Stay di Mitra (Refund 0)
    if (diffDays < 2) {
      cancelStatus = 'rejected_by_policy';
      refundAmount = 0;
    }

    const nextId = await getNextSequence("Cancellation");
    const bName = bank_name || req.body.bankName || "";
    const aNum = account_number || req.body.accountNumber || "";
    const aName = account_name || req.body.accountName || "";

    await Cancellation.create({
      id: nextId,
      booking_id: booking.id || booking._id,
      bookingId: booking.id || booking._id,
      reason,
      bank_name: bName,
      bankName: bName,
      account_number: aNum,
      accountNumber: aNum,
      account_name: aName,
      accountName: aName,
      status: cancelStatus,
      refund_amount: refundAmount,
      refundAmount: refundAmount
    });

    booking.status = 'cancelled';
    await booking.save();

    res.json({
      success: true,
      canRefund: diffDays >= 2,
      message: diffDays >= 2 ? "Permintaan pembatalan diajukan" : "Pesanan dibatalkan (Uang hangus sesuai kebijakan)"
    });
  } catch (err) {
    console.error("❌ CANCEL REQUEST ERROR:", err);
    res.status(500).json({ message: "Gagal memproses pembatalan" });
  }
});

// GET MITRA DASHBOARD SUMMARY
app.get("/mitra/dashboard/:mitraId", async (req, res) => {
  try {
    const mitraId = req.params.mitraId;
    let filter = {};
    if (!isNaN(Number(mitraId))) filter = { id: Number(mitraId) };
    else if (mongoose.Types.ObjectId.isValid(mitraId)) filter = { _id: mitraId };

    const mitraUser = await User.findOne(filter).lean();
    const mitraName = mitraUser ? mitraUser.name : "Mitra";

    // 1. Get all bookings belonging to this mitra
    const bookingFilter = await getMitraBookingFilter(mitraId);
    const rawBookings = await Booking.find(bookingFilter).sort({ createdAt: -1 }).lean();
    const bookings = rawBookings.map(formatBooking);

    const bookingIds = bookings.map(b => b._id).concat(bookings.map(b => b.id).filter(Boolean));

    // 2. Fetch studios and cancellations for this mitra
    const studioIds = bookings.map(b => b.studio_id).filter(Boolean);
    const studioObjIds = studioIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const studioNumIds = studioIds.filter(id => !isNaN(Number(id))).map(Number);
    const studioConds = [];
    if (studioObjIds.length > 0) studioConds.push({ _id: { $in: studioObjIds } });
    if (studioNumIds.length > 0) studioConds.push({ id: { $in: studioNumIds } });
    const studios = studioConds.length > 0 ? await Studio.find({ $or: studioConds }).lean() : [];
    const formattedStudios = studios.map(formatStudio);

    const rawCancellations = await Cancellation.find({ $or: [{ booking_id: { $in: bookingIds } }, { bookingId: { $in: bookingIds } }] })
      .sort({ createdAt: -1 })
      .lean();
    const cancellations = rawCancellations.map(formatCancellation);

    // Calculate stats
    const todayStr = new Date().toISOString().split('T')[0];
    const todayBookingsCount = bookings.filter(b => b.booking_date === todayStr || (b.created_at && String(b.created_at).startsWith(todayStr))).length;
    const pendingCount = bookings.filter(b => b.status === 'pending').length;
    const pendingCancellationsCount = cancellations.filter(c => c.status === 'pending').length;

    // Total revenue from confirmed/completed/paid bookings
    const validBookings = bookings.filter(b => ['confirmed', 'completed', 'paid'].includes(b.status));
    const totalRevenue = validBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

    // Format cancellation requests list (pending / recent)
    const cancellationRequests = cancellations.slice(0, 5).map(c => {
      const b = bookings.find(bk => String(bk.id) === String(c.booking_id) || String(bk._id) === String(c.booking_id)) || {};
      const st = formattedStudios.find(s => String(s.id) === String(b.studio_id) || String(s._id) === String(b.studio_id)) || {};
      return {
        id: String(c.id || c._id),
        location: st.name || "Studio",
        package: b.package_name || "Paket Foto",
        date: b.booking_date || (c.createdAt ? new Date(c.createdAt).toLocaleDateString('id-ID') : ""),
        refund: Number(c.refund_amount || 0),
        status: c.status
      };
    });

    // Format upcoming schedule (today and future confirmed/pending bookings)
    const upcomingSchedule = bookings
      .filter(b => b.status !== 'cancelled')
      .slice(0, 5)
      .map(b => {
        const st = formattedStudios.find(s => String(s.id) === String(b.studio_id) || String(s._id) === String(b.studio_id)) || {};
        return {
          location: st.name || "Studio",
          date: b.booking_date || "-",
          time: b.booking_time ? `${b.booking_time} WIB` : "WIB",
          status: b.status,
          statusLabel: b.status === 'confirmed' || b.status === 'completed' ? "Telah Di-ACC" : "Menunggu ACC"
        };
      });

    // Format history of cancellations
    const historyCancellations = cancellations
      .filter(c => c.status === 'refunded' || c.status === 'rejected_by_policy')
      .slice(0, 5)
      .map(c => {
        const b = bookings.find(bk => String(bk.id) === String(c.booking_id) || String(bk._id) === String(c.booking_id)) || {};
        const st = formattedStudios.find(s => String(s.id) === String(b.studio_id) || String(s._id) === String(b.studio_id)) || {};
        return {
          location: st.name || "Studio",
          reason: c.reason || "Dibatalkan"
        };
      });

    res.json({
      mitraName,
      stats: {
        today: todayBookingsCount,
        pending: pendingCount,
        cancellation: pendingCancellationsCount,
        revenue: totalRevenue
      },
      cancellationRequests,
      upcomingSchedule,
      historyCancellations
    });
  } catch (err) {
    console.error("❌ MITRA DASHBOARD ERROR:", err);
    res.status(500).json({ message: "Gagal mengambil data dashboard" });
  }
});

// GET CANCELLATIONS (MITRA)
app.get("/mitra/cancellations/:mitraId", async (req, res) => {
  try {
    const bookingFilter = await getMitraBookingFilter(req.params.mitraId);
    const rawBookings = await Booking.find(bookingFilter).lean();
    const bookings = rawBookings.map(formatBooking);

    const bookingIds = bookings.map(b => b._id).concat(bookings.map(b => b.id).filter(Boolean));
    const rawCancellations = await Cancellation.find({ $or: [{ booking_id: { $in: bookingIds } }, { bookingId: { $in: bookingIds } }] })
      .sort({ createdAt: -1 })
      .lean();
    const cancellations = rawCancellations.map(formatCancellation);

    const studioIds = bookings.map(b => b.studio_id).filter(Boolean);
    const customerIds = bookings.map(b => b.customer_id).filter(Boolean);

    const studioObjIds = studioIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const studioNumIds = studioIds.filter(id => !isNaN(Number(id))).map(Number);
    const studioConds = [];
    if (studioObjIds.length > 0) studioConds.push({ _id: { $in: studioObjIds } });
    if (studioNumIds.length > 0) studioConds.push({ id: { $in: studioNumIds } });
    const studios = studioConds.length > 0 ? await Studio.find({ $or: studioConds }).lean() : [];
    const formattedStudios = studios.map(formatStudio);

    const custObjIds = customerIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const custNumIds = customerIds.filter(id => !isNaN(Number(id))).map(Number);
    const custConds = [];
    if (custObjIds.length > 0) custConds.push({ _id: { $in: custObjIds } });
    if (custNumIds.length > 0) custConds.push({ id: { $in: custNumIds } });
    const customers = custConds.length > 0 ? await User.find({ $or: custConds }).lean() : [];
    const formattedCustomers = customers.map(formatUser);

    const result = cancellations.map(c => {
      const cBId = c.booking_id ? String(c.booking_id) : "";
      const b = bookings.find(bk => String(bk.id) === cBId || String(bk._id) === cBId) || {};
      const studio = b.studio_id ? formattedStudios.find(s => String(s.id) === String(b.studio_id) || String(s._id) === String(b.studio_id)) : null;
      const customer = b.customer_id ? formattedCustomers.find(usr => String(usr.id) === String(b.customer_id) || String(usr._id) === String(b.customer_id)) : null;

      return {
        ...c,
        id: String(c.id || c._id),
        booking_id: cBId,
        bookingId: cBId,
        reason: c.reason || 'Dibatalkan oleh Mitra/Sistem',
        bank_name: c.bank_name || c.bankName || "",
        bankName: c.bankName || c.bank_name || "",
        account_number: c.account_number || c.accountNumber || "",
        accountNumber: c.accountNumber || c.account_number || "",
        account_name: c.account_name || c.accountName || "",
        accountName: c.accountName || c.account_name || "",
        status: c.status || 'rejected_by_policy',
        refund_amount: c.refund_amount || 0,
        refundAmount: c.refund_amount || 0,
        created_at: c.createdAt,
        createdAt: c.createdAt,
        booking_date: b.booking_date,
        bookingDate: b.booking_date,
        total_price: b.total_price,
        totalPrice: b.total_price,
        studio_name: studio ? studio.name : "Studio",
        studioName: studio ? studio.name : "Studio",
        customer_name: customer ? customer.name : "Pelanggan",
        customerName: customer ? customer.name : "Pelanggan",
        package_name: b.package_name,
        packageName: b.package_name,
        booking: b
      };
    });

    res.json(result);
  } catch (err) {
    console.error("❌ GET CANCELLATIONS ERROR:", err);
    res.status(500).json({ message: "Error ambil data pembatalan" });
  }
});

// GET TRANSACTION HISTORY (MITRA)
app.get("/mitra/transactions/:mitraId", async (req, res) => {
  try {
    const bookingFilter = await getMitraBookingFilter(req.params.mitraId);
    const rawBookings = await Booking.find({
      ...bookingFilter,
      status: { $in: ['confirmed', 'completed', 'paid', 'cancelled'] }
    })
      .sort({ createdAt: -1 })
      .lean();
    const bookings = rawBookings.map(formatBooking);

    const studioIds = bookings.map(b => b.studio_id).filter(Boolean);
    const studioObjIds = studioIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const studioNumIds = studioIds.filter(id => !isNaN(Number(id))).map(Number);
    const studioConds = [];
    if (studioObjIds.length > 0) studioConds.push({ _id: { $in: studioObjIds } });
    if (studioNumIds.length > 0) studioConds.push({ id: { $in: studioNumIds } });
    const studios = studioConds.length > 0 ? await Studio.find({ $or: studioConds }).lean() : [];
    const formattedStudios = studios.map(formatStudio);

    const rawCancellations = await Cancellation.find().lean();
    const cancellations = rawCancellations.map(formatCancellation);
    const cancelMap = {};
    cancellations.forEach(c => {
      if (c.booking_id) cancelMap[String(c.booking_id)] = c.status;
      if (c.bookingId) cancelMap[String(c.bookingId)] = c.status;
    });

    const transactions = bookings.map(t => {
      let finalStatus = 'success';
      const cStatus = cancelMap[String(t._id)] || (t.id ? cancelMap[String(t.id)] : null);
      if (t.status === 'cancelled') {
        if (cStatus === 'refunded') finalStatus = 'refund';
        else if (cStatus === 'rejected_by_policy') finalStatus = 'success';
        else finalStatus = 'refund';
      }
      const st = formattedStudios.find(s => String(s.id) === String(t.studio_id) || String(s._id) === String(t.studio_id));
      return {
        transaction_id: t.id || t._id.toString(),
        transactionId: t.id || t._id.toString(),
        studio_name: st ? st.name : "Studio",
        studioName: st ? st.name : "Studio",
        created_at: t.createdAt,
        createdAt: t.createdAt,
        amount: t.total_price,
        status: finalStatus,
        booking: t
      };
    });

    res.json(transactions);
  } catch (err) {
    console.error("❌ GET TRANSACTIONS ERROR:", err);
    res.status(500).json({ message: "Gagal mengambil riwayat transaksi" });
  }
});

// UPDATE CANCELLATION STATUS
app.patch("/cancellations/:id/status", uploadPayments.single("proof_refund"), async (req, res) => {
  try {
    const { status, refund_amount, refundAmount, proof_refund, proofRefund } = req.body;
    let proofFile = req.file ? req.file.filename : (proof_refund || proofRefund || null);

    const conds = [];
    const id = req.params.id;
    if (!isNaN(Number(id))) conds.push({ id: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) conds.push({ _id: id });

    const updateData = { status };
    if (refundAmount !== undefined || refund_amount !== undefined) {
      const rAmt = refundAmount !== undefined ? refundAmount : refund_amount;
      updateData.refund_amount = Number(rAmt);
      updateData.refundAmount = Number(rAmt);
    }
    if (proofFile) {
      updateData.proof_refund = proofFile;
      updateData.proofRefund = proofFile;
    }

    const rawCancellation = await Cancellation.findOneAndUpdate(
      { $or: conds },
      { $set: updateData },
      { new: true }
    ).lean();

    const cancellation = formatCancellation(rawCancellation);

    if (cancellation && status === "approved") {
      const bId = cancellation.booking_id || cancellation.bookingId;
      if (bId) {
        const bConds = [];
        if (!isNaN(Number(bId))) bConds.push({ id: Number(bId) });
        if (mongoose.Types.ObjectId.isValid(bId)) bConds.push({ _id: bId });
        if (bConds.length > 0) {
          await Booking.updateMany({ $or: bConds }, { $set: { status: "cancelled" } });
        }
      }
    }

    res.json({ success: true, cancellation });
  } catch (err) {
    console.error("❌ UPDATE CANCELLATION ERROR:", err);
    res.status(500).json({ message: "Gagal update status refund" });
  }
});

// SUBMIT REVIEW
app.post("/reviews", async (req, res) => {
  try {
    const { booking_id, bookingId, studio_id, studioId, user_id, userId, rating, comment } = req.body;

    const bId = bookingId !== undefined ? bookingId : booking_id;
    const sId = studioId !== undefined ? studioId : studio_id;
    const uId = userId !== undefined ? userId : user_id;

    if (!bId || !sId || !uId || !rating) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const bConds = [];
    if (!isNaN(Number(bId))) bConds.push({ id: Number(bId) });
    if (mongoose.Types.ObjectId.isValid(bId)) bConds.push({ _id: bId });

    const booking = await Booking.findOne({ $or: bConds });
    if (!booking) {
      return res.status(403).json({ message: "Booking tidak valid atau bukan milik Anda" });
    }

    const existing = await Review.findOne({ $or: [{ booking_id: bId }, { bookingId: bId }] });
    if (existing) {
      return res.status(400).json({ message: "Anda sudah memberikan ulasan untuk pesanan ini" });
    }

    const nextReviewId = await getNextSequence("Review");

    const review = await Review.create({
      id: nextReviewId,
      booking_id: bId,
      bookingId: bId,
      studio_id: sId,
      studioId: sId,
      user_id: uId,
      userId: uId,
      rating: Number(rating),
      comment: comment || ""
    });

    res.json({ success: true, message: "Ulasan berhasil dikirim", review: formatReview(review) });
  } catch (err) {
    console.error("❌ REVIEW ERROR:", err);
    res.status(500).json({ message: "Gagal mengirim ulasan" });
  }
});

/* ================= SOCKET.IO & CHAT ================= */

io.on("connection", (socket) => {
  console.log("User masuk socket:", socket.id);
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
  });
  socket.on("send_message", (data) => {
    const { room, sender_id, receiver_id, message, timestamp, sender_image } = data;
    io.to(room).emit("receive_message", {
      sender_id,
      receiver_id,
      message,
      timestamp: timestamp || new Date().toISOString(),
      created_at: new Date().toISOString(),
      sender_image
    });
  });
});

// CHAT HISTORY
app.get("/chats/history/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    let user;
    if (!isNaN(Number(userId))) user = await User.findOne({ id: Number(userId) });
    if (!user && mongoose.Types.ObjectId.isValid(userId)) user = await User.findById(userId);
    if (!user) return res.json([]);
    const myRole = user.role;

    const userMatch = [user._id, user._id.toString(), user.id, String(user.id)].filter(Boolean);
    if (!isNaN(Number(user.id))) userMatch.push(Number(user.id));

    // Also include Studio IDs if user is a Mitra
    if (myRole === "mitra") {
      const mConds = [];
      if (user.id !== undefined && !isNaN(Number(user.id))) {
        mConds.push({ mitraId: Number(user.id) });
        mConds.push({ mitra_id: Number(user.id) });
        mConds.push({ mitra_id: String(user.id) });
      }
      if (user._id) {
        mConds.push({ mitra_id: user._id });
        mConds.push({ mitra_id: user._id.toString() });
      }
      if (mConds.length > 0) {
        const myStudios = await Studio.find({ $or: mConds }).lean();
        myStudios.forEach(s => {
          if (s.id !== undefined) { userMatch.push(s.id); userMatch.push(String(s.id)); }
          if (s._id) { userMatch.push(s._id); userMatch.push(s._id.toString()); }
        });
      }
    }

    const chats = await Chat.find({
      $or: [
        { sender_id: { $in: userMatch } },
        { receiver_id: { $in: userMatch } },
        { senderId: { $in: userMatch } },
        { receiverId: { $in: userMatch } }
      ]
    }).sort({ createdAt: -1 }).lean();

    const partnerIds = new Set();
    const myIdsStr = userMatch.map(String);

    chats.forEach(c => {
      const sStr = String(c.sender_id || c.senderId || '');
      const rStr = String(c.receiver_id || c.receiverId || '');
      const pId = myIdsStr.includes(sStr) ? rStr : sStr;
      if (pId) partnerIds.add(pId);
    });

    const partnerArray = Array.from(partnerIds);
    const partnerObjIds = partnerArray.filter(id => mongoose.Types.ObjectId.isValid(id));
    const partnerNumIds = partnerArray.filter(id => !isNaN(Number(id))).map(Number);

    const partnerConds = [];
    if (partnerNumIds.length > 0) {
      partnerConds.push({ id: { $in: partnerNumIds } });
    }
    if (partnerObjIds.length > 0) {
      partnerConds.push({ _id: { $in: partnerObjIds } });
    }
    if (partnerArray.length > 0) {
      partnerConds.push({ id: { $in: partnerArray } });
    }

    const partners = partnerConds.length > 0
      ? await User.find({ $or: partnerConds }).lean()
      : [];

    const stConds = [];

    if (partnerNumIds.length > 0) {
      stConds.push({
        mitraId: { $in: partnerNumIds }
      });

      stConds.push({
        mitra_id: { $in: partnerNumIds }
      });
    }

    if (partnerObjIds.length > 0) {
      stConds.push({
        mitra_id: { $in: partnerObjIds }
      });
    }

    const studios = stConds.length > 0
      ? await Studio.find({ $or: stConds }).lean()
      : [];


    const studioLogoMap = {};
    studios.forEach(s => {
      const f = formatStudio(s);
      if (s.mitraId) studioLogoMap[String(s.mitraId)] = f.logo;
      if (s.mitra_id) studioLogoMap[String(s.mitra_id)] = f.logo;
    });

    const history = [];
    for (const p of partners) {
      const pFormatted = formatUser(p);
      const pIdStr = String(pFormatted.id);
      const pObjIdStr = String(p._id);

      const lastMsg = chats.find(c => {
        const sStr = String(c.sender_id || c.senderId || '');
        const rStr = String(c.receiver_id || c.receiverId || '');
        const pMatch = [pIdStr, pObjIdStr];

        return (pMatch.includes(sStr) && myIdsStr.includes(rStr)) || (myIdsStr.includes(sStr) && pMatch.includes(rStr));
      });

      history.push({
        partner_id: pFormatted.id,
        partner_name: p.name,
        partner_role: p.role,
        partner_logo: studioLogoMap[pIdStr] || studioLogoMap[pObjIdStr] || null,
        partner_image: p.image || null,
        last_message: lastMsg ? lastMsg.message : "",
        last_time: lastMsg ? (lastMsg.createdAt || lastMsg.created_at) : null
      });
    }

    history.sort((a, b) => new Date(b.last_time || 0) - new Date(a.last_time || 0));
    res.json(history);
  } catch (err) {
    console.error("❌ History Error:", err);
    res.status(500).json({ message: "Gagal ambil history chat" });
  }
});

// GET CHATS
app.get("/chats", async (req, res) => {
  const { user1, user2 } = req.query;
  try {
    const getIds = async (val) => {
      if (!val) return [];
      const ids = [val, String(val)];
      if (!isNaN(Number(val))) ids.push(Number(val));
      let u;
      if (!isNaN(Number(val))) u = await User.findOne({ id: Number(val) });
      if (!u && mongoose.Types.ObjectId.isValid(val)) u = await User.findById(val);
      if (u) {
        if (u.id !== undefined) ids.push(u.id, String(u.id), Number(u.id));
        if (u._id) ids.push(u._id, u._id.toString());
      }
      return Array.from(new Set(ids.filter(Boolean)));
    };

    const u1Ids = await getIds(user1);
    const u2Ids = await getIds(user2);

    const chats = await Chat.find({
      $or: [
        { sender_id: { $in: u1Ids }, receiver_id: { $in: u2Ids } },
        { sender_id: { $in: u2Ids }, receiver_id: { $in: u1Ids } }
      ]
    }).sort({ createdAt: 1 }).lean();

    const senders = new Set(chats.map(c => String(c.sender_id)));
    const users = await User.find({ $or: [{ _id: { $in: Array.from(senders).filter(id => mongoose.Types.ObjectId.isValid(id)) } }, { id: { $in: Array.from(senders).filter(id => !isNaN(Number(id))).map(Number) } }] }).lean();
    const studios = await Studio.find({ $or: [{ mitraId: { $in: Array.from(senders).map(Number).filter(Boolean) } }, { mitra_id: { $in: Array.from(senders) } }] }).lean();

    const userMap = {};
    users.forEach(u => { userMap[String(u.id)] = u; userMap[u._id.toString()] = u; });
    const studioMap = {};
    studios.forEach(s => {
      const f = formatStudio(s);
      if (s.mitraId) studioMap[String(s.mitraId)] = f;
      if (s.mitra_id) studioMap[String(s.mitra_id)] = f;
    });

    const formattedChats = chats.map(c => {
      const sId = String(c.sender_id);
      const st = studioMap[sId];
      const usr = userMap[sId];

      let sender_image = "users/default.png";
      if (st && st.logo) {
        sender_image = "studios/" + st.logo;
      } else if (usr && usr.image) {
        sender_image = "users/" + usr.image;
      }

      return {
        id: c._id.toString(),
        sender_id: c.sender_id,
        receiver_id: c.receiver_id,
        message: c.message,
        created_at: c.createdAt,
        sender_image
      };
    });

    res.json(formattedChats);
  } catch (err) {
    res.status(500).json({ message: "Gagal ambil chat" });
  }
});

// SAVE CHAT
app.post("/chats", async (req, res) => {
  const { sender_id, receiver_id, message } = req.body;
  try {
    const chat = await Chat.create({
      sender_id,
      receiver_id,
      message,
      is_read: false
    });

    const sStr = String(sender_id);
    const rStr = String(receiver_id);
    const ids = [sStr, rStr].sort();
    const room = `room_${ids[0]}_${ids[1]}`;

    io.to(room).emit("receive_message", {
      sender_id,
      receiver_id,
      message,
      timestamp: chat.createdAt || new Date().toISOString(),
      created_at: chat.createdAt || new Date().toISOString()
    });

    io.emit("new_message", {
      sender_id,
      receiver_id,
      message,
      created_at: new Date().toISOString()
    });

    res.json({ success: true, id: chat._id });
  } catch (err) {
    console.error("❌ Save chat error:", err);
    res.status(500).json({ message: "Gagal simpan chat" });
  }
});

// UNREAD COUNT
app.get("/chats/unread/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    let user;
    if (!isNaN(Number(userId))) user = await User.findOne({ id: Number(userId) });
    if (!user && mongoose.Types.ObjectId.isValid(userId)) user = await User.findById(userId);
    if (!user) return res.json({ total: 0 });

    const uMatch = [user._id, user._id.toString(), user.id, String(user.id)].filter(Boolean);
    if (!isNaN(Number(user.id))) uMatch.push(Number(user.id));

    if (user.role === "mitra") {
      const mConds = [];
      if (user.id !== undefined && !isNaN(Number(user.id))) {
        mConds.push({ mitraId: Number(user.id) });
        mConds.push({ mitra_id: Number(user.id) });
        mConds.push({ mitra_id: String(user.id) });
      }
      if (user._id) {
        mConds.push({ mitra_id: user._id });
        mConds.push({ mitra_id: user._id.toString() });
      }
      if (mConds.length > 0) {
        const myStudios = await Studio.find({ $or: mConds }).lean();
        myStudios.forEach(s => {
          if (s.id !== undefined) { uMatch.push(s.id); uMatch.push(String(s.id)); }
          if (s._id) { uMatch.push(s._id); uMatch.push(s._id.toString()); }
        });
      }
    }

    const total = await Chat.countDocuments({
      $or: [
        { receiver_id: { $in: uMatch } },
        { receiverId: { $in: uMatch } }
      ],
      $and: [
        { is_read: { $ne: true } },
        { isRead: { $ne: true } },
        { isRead: { $ne: 1 } }
      ]
    });

    res.json({ total });
  } catch (err) {
    console.error("❌ UNREAD ERROR:", err);
    res.json({ total: 0 });
  }
});

// MARK READ
app.post("/chats/read", async (req, res) => {
  try {
    const { user_id, partner_id } = req.body;
    const getIds = async (val) => {
      if (!val) return [];
      const ids = [val, String(val)];
      if (!isNaN(Number(val))) ids.push(Number(val));
      let u;
      if (!isNaN(Number(val))) u = await User.findOne({ id: Number(val) });
      if (!u && mongoose.Types.ObjectId.isValid(val)) u = await User.findById(val);
      if (u) {
        if (u.id !== undefined) ids.push(u.id, String(u.id), Number(u.id));
        if (u._id) ids.push(u._id, u._id.toString());
        if (u.role === "mitra") {
          const mConds = [];
          if (u.id !== undefined && !isNaN(Number(u.id))) {
            mConds.push({ mitraId: Number(u.id) });
            mConds.push({ mitra_id: Number(u.id) });
            mConds.push({ mitra_id: String(u.id) });
          }
          if (u._id) {
            mConds.push({ mitra_id: u._id });
            mConds.push({ mitra_id: u._id.toString() });
          }
          if (mConds.length > 0) {
            const myStudios = await Studio.find({ $or: mConds }).lean();
            myStudios.forEach(s => {
              if (s.id !== undefined) { ids.push(s.id); ids.push(String(s.id)); }
              if (s._id) { ids.push(s._id); ids.push(s._id.toString()); }
            });
          }
        }
      }
      return Array.from(new Set(ids.filter(Boolean)));
    };

    const uMatch = await getIds(user_id);
    const pMatch = await getIds(partner_id);

    await Chat.updateMany(
      {
        $or: [
          { sender_id: { $in: pMatch }, receiver_id: { $in: uMatch } },
          { senderId: { $in: pMatch }, receiverId: { $in: uMatch } }
        ]
      },
      { $set: { is_read: true, isRead: true } }
    );

    io.emit("unread_cleared", { user_id, partner_id });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ READ CHAT ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ================= MONGO BENCHMARK / HELPER ENDPOINTS ================= */

app.get("/mongo/count-bookings", async (req, res) => {
  try {
    const total = await Booking.countDocuments();
    res.json({ total });
  } catch (err) {
    res.status(500).json(err);
  }
});

app.get("/mongo/count-payments", async (req, res) => {
  try {
    const total = await Payment.countDocuments();
    res.json({ total });
  } catch (err) {
    res.status(500).json(err);
  }
});

app.get("/mongo/sum-payments", async (req, res) => {
  try {
    const result = await Payment.aggregate([
      { $group: { _id: null, total_amount: { $sum: "$amount" } } }
    ]);
    res.json(result[0] || { total_amount: 0 });
  } catch (err) {
    res.status(500).json(err);
  }
});

app.get("/mongo/avg-payments", async (req, res) => {
  try {
    const result = await Payment.aggregate([
      { $group: { _id: null, avg_amount: { $avg: "$amount" } } }
    ]);
    res.json(result[0] || { avg_amount: 0 });
  } catch (err) {
    res.status(500).json(err);
  }
});

app.get("/mongo/and-payments", async (req, res) => {
  try {
    const data = await Payment.find({ status: "paid", amount: { $gt: 10000 } });
    res.json(data);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.get("/mongo/or-payments", async (req, res) => {
  try {
    const data = await Payment.find({
      $or: [{ status: "paid" }, { amount: { $gt: 50000 } }]
    });
    res.json(data);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.post("/mongo/user", async (req, res) => {
  try {
    const nextId = await getNextSequence("User");
    const user = await User.create({ ...req.body, id: req.body.id || nextId });
    res.json({ success: true, data: formatUser(user) });
  } catch (err) {
    res.status(500).json(err);
  }
});

app.get("/mongo/user", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users.map(u => formatUser(u)));
  } catch (err) {
    res.status(500).json(err);
  }
});

app.put("/mongo/user/test", async (req, res) => {
  try {
    const result = await User.updateMany(
      { email: { $regex: "^jmeter.*@test\\.com$" } },
      { $set: { phone: "089999999999" } }
    );
    res.json({ success: true, updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* ================= AI SEARCH & RECOMMENDATION ENGINE ================= */

/* ================= AI SEARCH & RECOMMENDATION ENGINE ================= */

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const cleaned = timeStr.trim().split('T')[0];
  if (cleaned.toLowerCase() === "libur" || cleaned.toLowerCase() === "tutup") return null;
  const parts = cleaned.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function checkStudioTimeAvailability(studio, day, time, period) {
  if (!day) return { available: true, reason: null, schedInfo: null };

  const dayLower = day.toLowerCase();
  const schedules = studio.schedules || [];
  const sched = schedules.find(s => String(s.day || '').toLowerCase() === dayLower);

  if (!sched || sched.is_closed || sched.isClosed || sched.open_time === "Libur" || !sched.open_time || !sched.close_time) {
    return {
      available: false,
      reason: `✕ Libur pada hari ${day.toUpperCase()}`,
      schedInfo: `Libur pada ${day.toUpperCase()}`
    };
  }

  const openMin = parseTimeToMinutes(sched.open_time);
  const closeMin = parseTimeToMinutes(sched.close_time);

  if (openMin === null || closeMin === null) {
    return {
      available: false,
      reason: `✕ Tutup pada hari ${day.toUpperCase()}`,
      schedInfo: `Libur pada ${day.toUpperCase()}`
    };
  }

  const schedStr = `${sched.open_time.substring(0, 5)}–${sched.close_time.substring(0, 5)}`;

  // Specific Time Check (e.g. 20:00 = 1200 mins)
  if (time) {
    const targetMin = parseTimeToMinutes(time);
    if (targetMin !== null) {
      if (targetMin >= openMin && targetMin <= closeMin) {
        return {
          available: true,
          reason: `✓ Operasional jam ${time} (${day.toUpperCase()} ${schedStr})`,
          schedInfo: `${day.toUpperCase()} ${schedStr}`
        };
      } else {
        return {
          available: false,
          reason: `✕ Tutup jam ${time} pada ${day.toUpperCase()} (Buka: ${schedStr})`,
          schedInfo: `${day.toUpperCase()} ${schedStr}`
        };
      }
    }
  }

  // Time Period Check
  // Pagi:  06:00–11:59  = 360–719
  // Siang: 11:00–14:59  = 660–899  (diperluas: jam 11 siang itu valid)
  // Sore:  15:00–17:59  = 900–1079
  // Malam: 18:00–23:59  = 1080–1439
  if (period) {
    let pStart = 0, pEnd = 1440;
    if (period === "pagi") { pStart = 360; pEnd = 719; }
    else if (period === "siang") { pStart = 660; pEnd = 899; }
    else if (period === "sore") { pStart = 900; pEnd = 1079; }
    else if (period === "malam") { pStart = 1080; pEnd = 1439; }

    const overlap = Math.max(0, Math.min(closeMin, pEnd) - Math.max(openMin, pStart));
    if (overlap > 0) {
      return {
        available: true,
        reason: `✓ Operasional ${period.toUpperCase()} (${day.toUpperCase()} ${schedStr})`,
        schedInfo: `${day.toUpperCase()} ${schedStr}`
      };
    } else {
      return {
        available: false,
        reason: `✕ Tidak buka di periode ${period.toUpperCase()} pada ${day.toUpperCase()} (Buka: ${schedStr})`,
        schedInfo: `${day.toUpperCase()} ${schedStr}`
      };
    }
  }

  return {
    available: true,
    reason: `✓ Buka pada hari ${day.toUpperCase()} (${schedStr})`,
    schedInfo: `${day.toUpperCase()} ${schedStr}`
  };
}

// -----------------------------------------------------------------------
// HELPER: Hour normalization for Bahasa Indonesia time periods
// -----------------------------------------------------------------------
function toPaddedHour(h) {
  const hh = Math.min(23, Math.max(0, h));
  return `${hh < 10 ? '0' : ''}${hh}:00`;
}
function normalizePagiHour(h) {
  if (h === 12) return 0;
  if (h >= 1 && h <= 11) return h;
  return h;
}
function normalizeSiangHour(h) {
  if (h === 12) return 12;
  if (h >= 1 && h <= 11) return h + 12;
  return h;
}
function normalizeSoreHour(h) {
  if (h === 12) return 12;
  if (h >= 1 && h <= 11) return h + 12;
  return h;
}
function normalizeMalamHour(h) {
  if (h === 12) return 0;
  if (h >= 1 && h <= 4) return h;
  if (h >= 5 && h <= 11) return h + 12;
  return h;
}

// -----------------------------------------------------------------------
// Detect whether a phrase is surrounded by soft-preference language
// Returns 'required' | 'preferred'
// -----------------------------------------------------------------------
function detectRequirementType(fullText, termStart) {
  const prefix = fullText.substring(Math.max(0, termStart - 60), termStart).toLowerCase();
  const softMarkers = [
    "kalau bisa", "kalau ada", "sebisa mungkin", "lebih bagus kalau",
    "prefer ", "lebih suka", "sekalian", "opsional", "kalo bisa",
    "klo bisa", "andai ada", "boleh ada", "jika ada", "jika bisa"
  ];
  const hardMarkers = [
    "harus ada", "wajib ada", "pokoknya harus", "wajib punya",
    "harus punya", "tidak mau tanpa", "nggak mau tanpa"
  ];
  for (const h of hardMarkers) { if (prefix.includes(h)) return "required"; }
  for (const s of softMarkers) { if (prefix.includes(s)) return "preferred"; }
  return "required";
}

// -----------------------------------------------------------------------
// Detect budget type from surrounding text context
// Returns: { type: 'hard' | 'soft', value: number }
// -----------------------------------------------------------------------
function detectBudgetContext(fullText, budgetValue) {
  const t = fullText.toLowerCase();
  const hardPhrases = [
    "maksimal", "maksimum", "max ", "tidak boleh lebih", "jangan lebih",
    "di bawah", "dibawah", "nggak mau lebih", "tidak mau lebih",
    "paling mahal", "under ", "budget max", "max budget", "batas"
  ];
  const softPhrases = [
    "sekitar", "sekitaran", "kira-kira", "kurang lebih", "kisaran",
    "kurang lebihnya", "lebih kurang"
  ];
  if (/\d+\s*ribuan/.test(t) || /\d+\s*jutaan/.test(t)) return { type: "soft", value: budgetValue };
  for (const p of hardPhrases) { if (t.includes(p)) return { type: "hard", value: budgetValue }; }
  for (const p of softPhrases) { if (t.includes(p)) return { type: "soft", value: budgetValue }; }
  return { type: "soft", value: budgetValue };
}

function parseNaturalLanguageIntent(promptStr) {
  if (!promptStr || typeof promptStr !== "string") {
    return { prompt: "", isAmbiguous: false };
  }

  const text = promptStr.toLowerCase().trim();

  const intent = {
    prompt: promptStr,
    purpose: null,
    people: null,
    location: null,
    date: null,
    day: null,
    time: null,
    period: null,
    budget_max: null,
    budget_target: null,
    budget_type: null,
    facilities_required: [],
    facilities_preferred: [],
    category: null,
    duration: null,
    duration_type: null,
    location_type: null,
    capacity_type: null,
    category_type: null,
    isAmbiguous: false,
    ambiguityMessage: null
  };

  // 1. Ambiguity check: "jam 8" without period context
  const hasTimePeriodWord = /(pagi|siang|sore|malam|\bam\b|\bpm\b)/i.test(text);
  const ambigMatch = text.match(/(?:jam|pukul|sekitar\s+jam)\s+([1-9]|1[0-2])(?!\s*(?:pagi|siang|sore|malam|\bam\b|\bpm\b|[:\.\d]))/i);

  if (ambigMatch && !hasTimePeriodWord) {
    const num = parseInt(ambigMatch[1], 10);
    if (num >= 1 && num <= 12) {
      intent.isAmbiguous = true;
      const morningStr = toPaddedHour(num);
      const nightH = num < 12 ? num + 12 : num;
      const nightStr = toPaddedHour(nightH);
      if (num >= 11 && num <= 12) {
        const siangStr = num === 12 ? "12:00" : "11:00";
        intent.ambiguityMessage = `Maksudnya jam ${num} siang (${siangStr}) atau jam ${num} malam (${nightStr})?`;
      } else if (num >= 1 && num <= 4) {
        const siangStr = toPaddedHour(num + 12);
        intent.ambiguityMessage = `Maksudnya jam ${num} siang (${siangStr}) atau jam ${num} malam (${nightStr})?`;
      } else {
        intent.ambiguityMessage = `Maksudnya jam ${num} pagi (${morningStr}) atau jam ${num} malam (${nightStr})?`;
      }
    }
  }

  // 2. Exact format: "08:00", "08.00", "20:00"
  if (!intent.isAmbiguous) {
    const hhmmMatch = text.match(/(\d{1,2})[:\.](\d{2})/);
    if (hhmmMatch) {
      let hh = parseInt(hhmmMatch[1], 10);
      const mm = parseInt(hhmmMatch[2], 10);
      if (text.includes("malam")) hh = normalizeMalamHour(hh);
      else if (text.includes("sore")) hh = normalizeSoreHour(hh);
      else if (text.includes("siang")) hh = normalizeSiangHour(hh);
      else if (text.includes("pagi")) hh = normalizePagiHour(hh);
      const hhStr = hh < 10 ? `0${hh}` : `${hh}`;
      const mmStr = mm < 10 ? `0${mm}` : `${mm}`;
      intent.time = `${hhStr}:${mmStr}`;
    }
  }

  // 3. Word + hour patterns ("jam 8 malam", "malam jam 8", "jam 11 siang", etc.)
  if (!intent.time && !intent.isAmbiguous) {
    const timeWordPatterns = [
      { regex: /(?:jam|pukul|sekitar)?\s*(\d{1,2})\s*(?:\bam\b)/i, handler: (h) => toPaddedHour(h === 12 ? 0 : h) },
      { regex: /(?:jam|pukul|sekitar)?\s*(\d{1,2})\s*(?:\bpm\b)/i, handler: (h) => toPaddedHour(h < 12 ? h + 12 : h) },
      { regex: /(?:jam|pukul|sekitar)?\s*(\d{1,2})\s*pagi/i, handler: (h) => toPaddedHour(normalizePagiHour(h)) },
      { regex: /pagi\s*(?:jam|pukul|sekitar)?\s*(\d{1,2})/i, handler: (h) => toPaddedHour(normalizePagiHour(h)) },
      { regex: /(?:jam|pukul|sekitar)?\s*(\d{1,2})\s*siang/i, handler: (h) => toPaddedHour(normalizeSiangHour(h)) },
      { regex: /siang\s*(?:jam|pukul|sekitar)?\s*(\d{1,2})/i, handler: (h) => toPaddedHour(normalizeSiangHour(h)) },
      { regex: /(?:jam|pukul|sekitar)?\s*(\d{1,2})\s*sore/i, handler: (h) => toPaddedHour(normalizeSoreHour(h)) },
      { regex: /sore\s*(?:jam|pukul|sekitar)?\s*(\d{1,2})/i, handler: (h) => toPaddedHour(normalizeSoreHour(h)) },
      { regex: /(?:jam|pukul|sekitar)?\s*(\d{1,2})\s*malam/i, handler: (h) => toPaddedHour(normalizeMalamHour(h)) },
      { regex: /malam\s*(?:jam|pukul|sekitar)?\s*(\d{1,2})/i, handler: (h) => toPaddedHour(normalizeMalamHour(h)) }
    ];
    for (const p of timeWordPatterns) {
      const m = text.match(p.regex);
      if (m) {
        const hourNum = parseInt(m[1], 10);
        if (hourNum >= 1 && hourNum <= 23) { intent.time = p.handler(hourNum); break; }
      }
    }
  }

  // 4. Period (only if no specific time and not ambiguous)
  if (!intent.time && !intent.isAmbiguous) {
    if (text.includes("pagi")) intent.period = "pagi";
    else if (text.includes("siang")) intent.period = "siang";
    else if (text.includes("sore")) intent.period = "sore";
    else if (text.includes("malam")) intent.period = "malam";
  }

  // 5. Day / date (including relative: besok, lusa, hari ini)
  const daysMap = {
    senin: "senin", selasa: "selasa", rabu: "rabu", kamis: "kamis",
    jumat: "jumat", sabtu: "sabtu", minggu: "minggu", weekend: "sabtu"
  };
  for (const d in daysMap) {
    if (text.includes(d)) { intent.day = daysMap[d]; break; }
  }
  if (!intent.day) {
    const todayIdx = new Date().getDay();
    const dayNames = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
    if (text.includes("lusa")) intent.day = dayNames[(todayIdx + 2) % 7];
    else if (text.includes("besok")) intent.day = dayNames[(todayIdx + 1) % 7];
    else if (text.includes("hari ini")) intent.day = dayNames[todayIdx];
  }

  // 6. Location
  const cities = [
    "bekasi", "jakarta", "tangerang", "depok", "cikarang",
    "kelapa gading", "tebet", "cipondoh", "bandung", "bogor"
  ];
  for (const c of cities) {
    if (text.includes(c)) { intent.location = c; break; }
  }

  // Detect location requirement type (required by default, preferred if soft markers present)
  if (intent.location) {
    const locIdx = text.indexOf(intent.location);
    intent.location_type = (locIdx !== -1) ? detectRequirementType(text, locIdx) : 'required';
  }

  // 7. Budget (classify as hard or soft)
  let budgetMatch = text.match(
    /(?:budget|maksimal|max\s|dibawah|di\s*bawah|under|harga|biaya|sekitar|kisaran|kira-kira|rp\.?)\s*(\d+(?:[\.,]\d+)?)\s*(ribu|rb|k|juta|jt)?/i
  );
  if (!budgetMatch) budgetMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*(ribu|rb|k|juta|jt)/i);
  if (budgetMatch) {
    let num = parseFloat(budgetMatch[1].replace(/[\.,]/g, ""));
    const unit = (budgetMatch[2] || "").toLowerCase();
    if (unit === "ribu" || unit === "rb" || unit === "k") num *= 1000;
    else if (unit === "juta" || unit === "jt") num *= 1000000;
    if (num > 0) {
      const { type, value } = detectBudgetContext(text, num);
      intent.budget_type = type;
      if (type === "hard") {
        intent.budget_max = value;
      } else {
        intent.budget_target = value;
        intent.budget_max = value * 1.5; // loose upper bound for soft
      }
    }
  }

  // 8. Capacity / People
  const peopleMatch = text.match(/(\d+)\s*(?:orang|pax|org|person)/i) || text.match(/ber\s*(\d+)/i);
  if (peopleMatch) intent.people = parseInt(peopleMatch[1], 10);
  else if (text.includes("sendiri") || text.includes("solo")) intent.people = 1;
  else if (text.includes("berdua") || text.includes("couple")) intent.people = 2;
  else if (text.includes("bertiga")) intent.people = 3;
  else if (text.includes("berempat")) intent.people = 4;
  else if (text.includes("berlima")) intent.people = 5;

  // Detect capacity requirement type
  if (intent.people) {
    const capPatterns = [/(\d+)\s*(?:orang|pax|org|person)/i, /ber\s*(\d+)/i];
    let capIdx = -1;
    for (const pat of capPatterns) {
      const m = text.match(pat);
      if (m) { capIdx = text.indexOf(m[0]); break; }
    }
    if (capIdx === -1) capIdx = text.length; // word-based (sendiri, berdua, etc.)
    intent.capacity_type = detectRequirementType(text, capIdx);
  }

  // 8.5. Duration parsing
  // A. Minimum: "minimal 2 jam", "setidaknya 2 jam", "paling tidak 2 jam"
  const minDurMatch = text.match(/(?:minimal|setidaknya|paling\s*tidak|minimum|min)\s*(\d+)\s*(?:jam|hour|hours)/i);
  if (minDurMatch) {
    intent.duration = parseInt(minDurMatch[1], 10) * 60;
    intent.duration_type = 'minimum';
  }
  // B. Exact: "durasi 2 jam", "sesi 2 jam", "paket 2 jam", "selama 2 jam"
  if (!intent.duration) {
    const exactDurMatch = text.match(/(?:durasi|sesi|paket|selama)\s*(\d+)\s*(?:jam|hour|hours)/i);
    if (exactDurMatch) {
      intent.duration = parseInt(exactDurMatch[1], 10) * 60;
      intent.duration_type = 'exact';
    }
  }
  // C. General: "butuh 2 jam", "mau 2 jam", "2 jam foto" → treat as minimum
  if (!intent.duration) {
    const genDurMatch = text.match(/(?:butuh|mau|perlu|need)\s*(\d+)\s*(?:jam|hour|hours)/i)
      || text.match(/(\d+)\s*(?:jam|hour|hours)\s*(?:sesi|session|foto|pemotretan)/i);
    if (genDurMatch) {
      intent.duration = parseInt(genDurMatch[1], 10) * 60;
      intent.duration_type = 'minimum';
    }
  }

  // 9. Facilities — with requirement type (required / preferred)
  const facilityKeywords = [
    { name: "Lighting", terms: ["lighting", "lampu", "light"] },
    { name: "Free Wifi", terms: ["wifi", "internet"] },
    { name: "AC", terms: ["ac", "pendingin", "air conditioner"] },
    { name: "Props & Aksesoris", terms: ["props", "properti", "aksesoris", "kostum"] },
    { name: "Area Cermin", terms: ["cermin", "touch-up", "makeup", "kaca"] },
    { name: "Indoor Studio", terms: ["indoor", "ruangan"] },
    { name: "Background Putih", terms: ["background putih", "latar putih", "white background", "backdrop putih"] },
    { name: "Background Hitam", terms: ["background hitam", "latar hitam", "black background", "backdrop hitam"] }
  ];
  for (const f of facilityKeywords) {
    for (const term of f.terms) {
      const idx = text.indexOf(term);
      if (idx !== -1) {
        const reqType = detectRequirementType(text, idx);
        if (reqType === "required") intent.facilities_required.push(f);
        else intent.facilities_preferred.push(f);
        break;
      }
    }
  }

  // 10. Category / Purpose
  if (text.includes("photobox") || text.includes("photo box") || text.includes("booth")) {
    intent.category = "photobox";
  } else if (text.includes("photostudio") || text.includes("photo studio") || text.includes("studio foto") || text.includes("self photo")) {
    intent.category = "photostudio";
  }
  if (text.includes("produk") || text.includes("product") || text.includes("skincare") || text.includes("kosmetik")) intent.purpose = "foto produk";
  else if (text.includes("keluarga") || text.includes("family")) intent.purpose = "foto keluarga";
  else if (text.includes("wisuda") || text.includes("graduation")) intent.purpose = "foto wisuda";
  else if (text.includes("pasfoto") || text.includes("pas foto")) intent.purpose = "pas foto";

  // Detect category requirement type (required by default when explicitly mentioned)
  if (intent.category) {
    const catTerms = ["photobox", "photo box", "booth", "photostudio", "photo studio", "studio foto", "self photo"];
    let catIdx = -1;
    for (const term of catTerms) {
      const idx = text.indexOf(term);
      if (idx !== -1) { catIdx = idx; break; }
    }
    intent.category_type = (catIdx !== -1) ? detectRequirementType(text, catIdx) : 'required';
  }

  return intent;
}

// Helper: get min price from studio
function getStudioMinPrice(studio) {
  if (studio.packages && studio.packages.length > 0) {
    const prices = studio.packages.map(p => Number(p.price)).filter(p => !isNaN(p) && p > 0);
    if (prices.length > 0) return Math.min(...prices);
  }
  if (studio.price) return Number(studio.price);
  return null;
}

// Helper: check if studio has a facility
function studioHasFacility(studio, facObj) {
  const facsText = (studio.facilities || [])
    .map(f => String(typeof f === "string" ? f : (f.facility || f.name || "")).toLowerCase())
    .join(" ");
  return facObj.terms.some(t => facsText.includes(t.toLowerCase()));
}

// Helper: safely extract package duration (NEVER defaults to 60)
function getPackageDuration(pkg) {
  const sd = pkg.session_duration;
  if (sd !== null && sd !== undefined && !isNaN(Number(sd)) && Number(sd) > 0) return Number(sd);
  const d = pkg.duration;
  if (d !== null && d !== undefined && !isNaN(Number(d)) && Number(d) > 0) return Number(d);
  return null; // UNKNOWN — never fallback to 60
}

// Helper: filter packages by hard constraints (budget max, duration)
function getEligiblePackages(studio, intent) {
  const packages = studio.packages || [];
  if (packages.length === 0) return [];

  return packages.filter(pkg => {
    const pkgPrice = Number(pkg.price);

    // Hard budget max filter — ONLY for hard budget type
    if (intent.budget_type === 'hard' && intent.budget_max) {
      if (!isNaN(pkgPrice) && pkgPrice > 0 && pkgPrice > intent.budget_max) {
        return false;
      }
    }
    // Soft budget does NOT eliminate packages

    // Duration filter — when user requested specific duration
    if (intent.duration) {
      const pkgDur = getPackageDuration(pkg);
      if (pkgDur !== null) {
        if (intent.duration_type === 'exact') {
          if (pkgDur !== intent.duration) return false;
        } else {
          // 'minimum' or default: package duration must be >= requested
          if (pkgDur < intent.duration) return false;
        }
      }
      // pkgDur === null (UNKNOWN) → do NOT eliminate, but cannot confirm duration match
    }

    return true;
  });
}

// Core search pipeline
function processAISearch(studios, intent) {

  if (intent.isAmbiguous) {
    return {
      isAmbiguous: true,
      ambiguityMessage: intent.ambiguityMessage,
      summaryMessage: null,
      noResultsMessage: null,
      studios: [],
      alternatives: []
    };
  }

  // Build transparency summary
  const summaryParts = [];
  if (intent.day) summaryParts.push(`📅 ${intent.day.charAt(0).toUpperCase() + intent.day.slice(1)}`);
  if (intent.time) summaryParts.push(`🕗 ${intent.time}`);
  else if (intent.period) summaryParts.push(`🕗 Periode ${intent.period.toUpperCase()}`);
  if (intent.location) {
    const locLabel = intent.location_type === 'preferred' ? `~${intent.location.toUpperCase()}` : intent.location.toUpperCase();
    summaryParts.push(`📍 ${locLabel}`);
  }
  if (intent.budget_type === "hard" && intent.budget_max)
    summaryParts.push(`💰 Maks ${formatRupiahNum(intent.budget_max)}`);
  else if (intent.budget_type === "soft" && intent.budget_target)
    summaryParts.push(`💰 ~${formatRupiahNum(intent.budget_target)}`);
  if (intent.people) summaryParts.push(`👥 ${intent.people} Orang`);
  if (intent.duration) {
    const durHrs = intent.duration / 60;
    const durLabel = intent.duration_type === 'exact' ? `${durHrs} Jam` : `Min. ${durHrs} Jam`;
    summaryParts.push(`⏱️ ${durLabel}`);
  }
  const allFacs = [
    ...intent.facilities_required.map(f => `✅ ${f.name}`),
    ...intent.facilities_preferred.map(f => `💡 ${f.name}`)
  ];
  if (allFacs.length > 0) summaryParts.push(allFacs.join(", "));
  if (intent.purpose) summaryParts.push(`🎯 ${intent.purpose}`);
  if (intent.category) summaryParts.push(`📷 ${intent.category}`);

  const summaryMessage = summaryParts.length > 0
    ? `I understood your request as: ${summaryParts.join(" | ")}`
    : `Mencari studio berdasarkan: "${intent.prompt}"`;

  const candidates = [];
  const alternatives = [];

  for (const studio of studios) {

    // ============================================================
    // HARD CONSTRAINT 1: Day & Time/Period vs Operating Hours
    // ============================================================
    const availCheck = checkStudioTimeAvailability(studio, intent.day, intent.time, intent.period);
    if (!availCheck.available) {
      alternatives.push({ ...studio, matchScore: 0, matchReasons: [availCheck.reason], failedConstraint: availCheck.reason });
      continue;
    }

    // ============================================================
    // HARD CONSTRAINT 2: Location (when required)
    // ============================================================
    if (intent.location && intent.location_type === 'required') {
      const studioCity = (studio.city || '').trim().toLowerCase();
      const studioLoc = (studio.location || '').trim().toLowerCase();
      const reqLoc = intent.location.trim().toLowerCase();

      // Primary: exact city match (consistent with Manual Search RegExp("^city$","i"))
      const cityMatch = studioCity && studioCity === reqLoc;
      // Fallback: address contains city name ONLY when city field is empty/missing
      const addressFallbackMatch = !studioCity && studioLoc.includes(reqLoc);
      const locationMatch = cityMatch || addressFallbackMatch;

      if (!locationMatch) {
        alternatives.push({
          ...studio, matchScore: 0,
          matchReasons: [`✕ Lokasi: ${studio.city || studio.location || 'Tidak diketahui'} (dibutuhkan: ${intent.location})`],
          failedConstraint: 'Lokasi tidak sesuai'
        });
        continue;
      }
    }

    // ============================================================
    // HARD CONSTRAINT 3: Required Facilities (all must be present)
    // ============================================================
    let failedFac = null;
    for (const facObj of intent.facilities_required) {
      if (!studioHasFacility(studio, facObj)) { failedFac = facObj.name; break; }
    }
    if (failedFac) {
      const failReasons = [];
      if (intent.day && availCheck.reason) failReasons.push(availCheck.reason);
      failReasons.push(`✕ Tidak memiliki ${failedFac} (wajib)`);
      alternatives.push({
        ...studio, matchScore: 0,
        matchReasons: failReasons,
        failedConstraint: `Tidak memiliki ${failedFac} (wajib)`
      });
      continue;
    }

    // ============================================================
    // HARD CONSTRAINT 4: Studio Category (when required)
    // ============================================================
    if (intent.category && intent.category_type === 'required') {
      const studioCat = (studio.category || '').trim().toLowerCase();
      if (studioCat !== intent.category.toLowerCase()) {
        alternatives.push({
          ...studio, matchScore: 0,
          matchReasons: [`✕ Tipe: ${studio.category || 'Tidak diketahui'} (dibutuhkan: ${intent.category})`],
          failedConstraint: 'Tipe studio tidak sesuai'
        });
        continue;
      }
    }

    // ============================================================
    // HARD CONSTRAINT 5: Capacity Check
    // ============================================================
    let validCap = null;
    if (intent.people) {
      const cap = studio.capacity;
      validCap = (cap !== null && cap !== undefined && !isNaN(Number(cap)) && Number(cap) > 0)
        ? Number(cap)
        : null;

      if (validCap !== null && validCap < intent.people) {
        alternatives.push({
          ...studio, matchScore: 0,
          matchReasons: [`✕ Kapasitas: ${validCap} orang (dibutuhkan: ${intent.people} orang)`],
          failedConstraint: 'Kapasitas tidak mencukupi'
        });
        continue;
      }
    }

    // ============================================================
    // HARD CONSTRAINT 6: Package Eligibility (Budget + Duration)
    // Price and duration remain PACKAGE-LEVEL — never flattened
    // ============================================================
    const hasPkgs = studio.packages && studio.packages.length > 0;
    let eligiblePkgs = [];

    if (hasPkgs) {
      eligiblePkgs = getEligiblePackages(studio, intent);

      if (eligiblePkgs.length === 0) {
        const failReasons = [];
        if (intent.day && availCheck.reason) failReasons.push(availCheck.reason);
        if (intent.budget_type === 'hard' && intent.budget_max) {
          failReasons.push(`✕ Semua paket melebihi budget maks ${formatRupiahNum(intent.budget_max)}`);
        }
        if (intent.duration) {
          const durLabel = intent.duration_type === 'exact'
            ? `= ${intent.duration} menit`
            : `≥ ${intent.duration} menit`;
          failReasons.push(`✕ Tidak ada paket dengan durasi ${durLabel}`);
        }
        if (failReasons.length === 0) failReasons.push('✕ Tidak ada paket yang memenuhi kriteria');
        alternatives.push({
          ...studio, matchScore: 0,
          matchReasons: failReasons,
          failedConstraint: failReasons.filter(r => r.startsWith('✕')).join('; ')
        });
        continue;
      }
    } else {
      // No packages array — check studio-level price for hard budget only
      if (intent.budget_type === 'hard' && intent.budget_max) {
        const studioPrice = Number(studio.price);
        if (!isNaN(studioPrice) && studioPrice > 0 && studioPrice > intent.budget_max) {
          alternatives.push({
            ...studio, matchScore: 0,
            matchReasons: [`✕ Harga ${formatRupiahNum(studioPrice)} melebihi budget maks ${formatRupiahNum(intent.budget_max)}`],
            failedConstraint: 'Melebihi budget'
          });
          continue;
        }
      }
    }

    // ============================================================
    // ALL HARD CONSTRAINTS PASSED — SOFT PREFERENCE SCORING
    // Score represents: "How well this result satisfies criteria
    // explicitly expressed by the user." Only user-mentioned
    // soft preferences contribute to totalWeight/earnedWeight.
    // Unspecified criteria NEVER affect the score.
    // ============================================================

    let totalWeight = 0;
    let earnedWeight = 0;
    const reasons = [];

    // --- Confirmation reasons for passed hard constraints ---
    if (intent.day && availCheck.reason) reasons.push(availCheck.reason);

    if (intent.location && intent.location_type === 'required') {
      reasons.push(`✓ Lokasi: ${studio.city || studio.location}`);
    }

    for (const facObj of intent.facilities_required) {
      reasons.push(`✓ ${facObj.name} tersedia (wajib)`);
    }

    if (intent.category && intent.category_type === 'required') {
      reasons.push(`✓ Tipe: ${studio.category}`);
    }

    if (intent.people) {
      if (validCap !== null) {
        reasons.push(`✓ Kapasitas ${validCap} orang`);
      } else {
        reasons.push(`~ Kapasitas belum tercantum`);
      }
    }

    // --- Best eligible package selection ---
    let bestPkg = null;
    if (hasPkgs && eligiblePkgs.length > 0) {
      if (intent.budget_target) {
        bestPkg = eligiblePkgs.reduce((a, b) =>
          Math.abs(a.price - intent.budget_target) <= Math.abs(b.price - intent.budget_target) ? a : b);
      } else {
        bestPkg = eligiblePkgs.reduce((a, b) => a.price <= b.price ? a : b);
      }
    }

    // Hard budget confirmation (already passed — show which package)
    if (intent.budget_type === 'hard' && intent.budget_max) {
      if (bestPkg) {
        reasons.push(`✓ 📦 ${bestPkg.name} — ${formatRupiahNum(bestPkg.price)} (sesuai budget maks)`);
      } else if (!hasPkgs) {
        const sp = Number(studio.price);
        if (!isNaN(sp) && sp > 0) {
          reasons.push(`✓ Harga ${formatRupiahNum(sp)} (sesuai budget maks)`);
        } else {
          reasons.push(`~ Harga belum tercantum`);
        }
      }
    }

    // Duration confirmation (info only — hard filter already applied in getEligiblePackages)
    if (intent.duration) {
      if (hasPkgs && eligiblePkgs.length > 0) {
        const durationPkg = eligiblePkgs.find(p => {
          const d = getPackageDuration(p);
          if (d === null) return false;
          if (intent.duration_type === 'exact') return d === intent.duration;
          return d >= intent.duration;
        });
        if (durationPkg) {
          const dur = getPackageDuration(durationPkg);
          reasons.push(`✓ Durasi ${dur} menit (${durationPkg.name})`);
        } else {
          reasons.push(`~ Durasi paket tidak dapat dikonfirmasi`);
        }
      } else if (!hasPkgs) {
        reasons.push(`~ Durasi tidak dapat dikonfirmasi (tidak ada data paket)`);
      }
    }

    // --- Soft preference scoring: ONLY user-mentioned criteria ---

    // SOFT: Preferred location (only when location_type is 'preferred', not hard-filtered)
    if (intent.location && intent.location_type === 'preferred') {
      totalWeight += 25;
      const studioCity = (studio.city || '').trim().toLowerCase();
      const studioLoc = (studio.location || '').trim().toLowerCase();
      const reqLoc = intent.location.trim().toLowerCase();
      const cityMatch = studioCity && studioCity === reqLoc;
      const addressFallbackMatch = !studioCity && studioLoc.includes(reqLoc);
      if (cityMatch || addressFallbackMatch) {
        earnedWeight += 25;
        reasons.push(`✓ Lokasi di ${studio.city || studio.location}`);
      } else {
        reasons.push(`~ Lokasi: ${studio.city || studio.location || 'Tidak diketahui'}`);
      }
    }

    // SOFT: Soft budget (target/approximate — never hard-filters)
    if (intent.budget_type === 'soft' && intent.budget_target) {
      totalWeight += 25;
      if (bestPkg) {
        const diff = bestPkg.price - intent.budget_target;
        if (diff <= 0) {
          earnedWeight += 25;
          reasons.push(`✓ 📦 ${bestPkg.name} — ${formatRupiahNum(bestPkg.price)} (sesuai target)`);
        } else if (diff <= intent.budget_target * 0.15) {
          earnedWeight += 18;
          reasons.push(`~ 📦 ${bestPkg.name} — ${formatRupiahNum(bestPkg.price)} (sedikit di atas target)`);
        } else if (diff <= intent.budget_target * 0.30) {
          earnedWeight += 10;
          reasons.push(`~ 📦 ${bestPkg.name} — ${formatRupiahNum(bestPkg.price)} (di atas target)`);
        } else {
          earnedWeight += 3;
          reasons.push(`✕ 📦 ${bestPkg.name} — ${formatRupiahNum(bestPkg.price)} (jauh di atas ~${formatRupiahNum(intent.budget_target)})`);
        }
      } else if (!hasPkgs) {
        const sp = Number(studio.price);
        if (!isNaN(sp) && sp > 0) {
          const diff = sp - intent.budget_target;
          if (diff <= 0) {
            earnedWeight += 25;
            reasons.push(`✓ Harga ${formatRupiahNum(sp)} (sesuai target)`);
          } else if (diff <= intent.budget_target * 0.15) {
            earnedWeight += 18;
            reasons.push(`~ Harga ${formatRupiahNum(sp)} (sedikit di atas target)`);
          } else if (diff <= intent.budget_target * 0.30) {
            earnedWeight += 10;
            reasons.push(`~ Harga ${formatRupiahNum(sp)} (di atas target)`);
          } else {
            earnedWeight += 3;
            reasons.push(`✕ Harga ${formatRupiahNum(sp)} (jauh di atas ~${formatRupiahNum(intent.budget_target)})`);
          }
        } else {
          earnedWeight += 12;
          reasons.push(`~ Harga belum tercantum`);
        }
      }
    }

    // SOFT: Preferred facilities (only user-mentioned preferred facilities)
    if (intent.facilities_preferred.length > 0) {
      totalWeight += 20;
      let matchedPref = 0;
      for (const facObj of intent.facilities_preferred) {
        if (studioHasFacility(studio, facObj)) {
          matchedPref++;
          reasons.push(`✓ ${facObj.name} tersedia`);
        } else {
          reasons.push(`~ ${facObj.name} tidak tersedia`);
        }
      }
      earnedWeight += Math.round((matchedPref / intent.facilities_preferred.length) * 20);
    }

    // SOFT: Preferred category (only when category_type is 'preferred')
    if (intent.category && intent.category_type === 'preferred') {
      totalWeight += 10;
      const cat = (studio.category || '').toLowerCase();
      const sName = (studio.name || '').toLowerCase();
      const desc = (studio.description || '').toLowerCase();
      const catTarget = intent.category.toLowerCase();
      if (cat.includes(catTarget) || sName.includes(catTarget) || desc.includes(catTarget)) {
        earnedWeight += 10;
        reasons.push(`✓ Sesuai jenis (${studio.category || intent.category})`);
      } else {
        reasons.push(`~ Tipe studio: ${studio.category || 'General'}`);
      }
    }

    // SOFT: Purpose (always soft — matched against name/description text, not strict DB field)
    if (intent.purpose) {
      totalWeight += 10;
      const cat = (studio.category || '').toLowerCase();
      const sName = (studio.name || '').toLowerCase();
      const desc = (studio.description || '').toLowerCase();
      const purTarget = intent.purpose.toLowerCase();
      if (cat.includes(purTarget) || sName.includes(purTarget) || desc.includes(purTarget)) {
        earnedWeight += 10;
        reasons.push(`✓ Sesuai tujuan (${intent.purpose})`);
      } else {
        reasons.push(`~ Tipe studio: ${studio.category || 'General'}`);
      }
    }

    // --- Calculate final score ---
    // No artificial floor. If all hard constraints passed and no soft preferences exist,
    // score = 100% meaning "Semua kriteria yang kamu minta terpenuhi."
    let finalScore = 100;
    if (totalWeight > 0) {
      finalScore = Math.min(100, Math.round((earnedWeight / totalWeight) * 100));
    }

    candidates.push({ ...studio, matchScore: finalScore, matchReasons: reasons });
  }

  candidates.sort((a, b) => b.matchScore - a.matchScore);

  // Build no-results message when zero candidates
  let noResultsMessage = null;
  if (candidates.length === 0) {
    const parts = [];
    if (intent.day) parts.push(`hari ${intent.day.charAt(0).toUpperCase() + intent.day.slice(1)}`);
    if (intent.time) parts.push(`pukul ${intent.time}`);
    else if (intent.period) parts.push(`periode ${intent.period}`);
    if (intent.location) parts.push(`di ${intent.location.toUpperCase()}`);
    if (intent.budget_type === 'hard' && intent.budget_max) parts.push(`budget maks ${formatRupiahNum(intent.budget_max)}`);
    if (intent.facilities_required.length > 0) parts.push(`dengan ${intent.facilities_required.map(f => f.name).join(', ')}`);
    if (intent.people) parts.push(`kapasitas ${intent.people} orang`);
    if (intent.category) parts.push(`tipe ${intent.category}`);
    if (intent.duration) {
      const durHrs = intent.duration / 60;
      const durLabel = intent.duration_type === 'exact' ? `durasi ${durHrs} jam` : `durasi minimal ${durHrs} jam`;
      parts.push(durLabel);
    }
    if (parts.length > 0) {
      noResultsMessage = `Tidak menemukan studio yang memenuhi semua kebutuhanmu: ${parts.join(', ')}.`;
    } else {
      noResultsMessage = `Tidak menemukan studio yang sesuai dengan pencarian "${intent.prompt}".`;
    }
  }

  return {
    isAmbiguous: false,
    ambiguityMessage: null,
    summaryMessage,
    noResultsMessage,
    studios: candidates,
    alternatives: alternatives.slice(0, 6)
  };
}

app.post("/api/ai-search", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt pencarian tidak boleh kosong." });
    }

    const intent = parseNaturalLanguageIntent(prompt);

    const studios = await Studio.find({ status: "active" }).lean();
    const studioIds = studios.map(s => s.id || s._id).filter(Boolean);
    const galleryDocs = await StudioImage.find({
      $or: [{ studio_id: { $in: studioIds } }, { studioId: { $in: studioIds } }]
    }).lean();
    const facilityDocs = await StudioFacility.find({
      $or: [{ studio_id: { $in: studioIds } }, { studioId: { $in: studioIds } }]
    }).lean();

    const galleryMap = {};
    galleryDocs.forEach(g => {
      const sIdKey = String(g.studioId !== undefined ? g.studioId : g.studio_id);
      if (!galleryMap[sIdKey]) galleryMap[sIdKey] = [];
      galleryMap[sIdKey].push(g);
    });

    const facilityMap = {};
    facilityDocs.forEach(f => {
      const sIdKey = String(f.studioId !== undefined ? f.studioId : f.studio_id);
      if (!facilityMap[sIdKey]) facilityMap[sIdKey] = [];
      facilityMap[sIdKey].push(f);
    });

    const formattedStudios = studios.map(s => {
      const gDocs = galleryMap[String(s.id)] || galleryMap[String(s._id)] || null;
      const fDocs = facilityMap[String(s.id)] || facilityMap[String(s._id)] || null;
      return formatStudio(s, gDocs, fDocs);
    });

    const searchResult = processAISearch(formattedStudios, intent);

    res.json({
      success: true,
      prompt,
      intent,
      isAmbiguous: searchResult.isAmbiguous,
      ambiguityMessage: searchResult.ambiguityMessage,
      summaryMessage: searchResult.summaryMessage,
      noResultsMessage: searchResult.noResultsMessage,
      totalResults: searchResult.studios.length,
      studios: searchResult.studios,
      alternatives: searchResult.alternatives
    });
  } catch (err) {
    console.error("AI Search Error:", err);
    res.status(500).json({ error: "Gagal memproses AI Search." });
  }
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT} (MongoDB mode)`)
);