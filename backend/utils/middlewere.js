import jwt from "jsonwebtoken";
import Admin from "../models/admin.models.js";
import Manager from "../models/manager.models.js";

export const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // console.log("[AUTH] Incoming Authorization header:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("[AUTH] Decoded JWT user:", decoded);
    let user;
    if (decoded.userType === "admin") {
      user = await Admin.findById(decoded.id);
    } else if (decoded.userType === "manager") {
      user = await Manager.findById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: user._id,
      role: user.role || "manager", // default for manager
      userType: decoded.userType,
      siteId: user.siteId || null, // Include siteId for site managers
    };

    // Read-only admins can only do GET
    if (req.user.role === "readonly" && req.method !== "GET") {
      return res.status(403).json({ message: "Read-only admin cannot modify data" });
    }


   
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(401).json({ message: "Invalid token" });
  }
};
