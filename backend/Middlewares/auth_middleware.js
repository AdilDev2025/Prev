const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
        
        if (!JWT_SECRET) {
            return res.status(500).json({ message: "JWT secret not configured" });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();

    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(403).json({ message: "Token expired" });
        }
        return res.status(403).json({ message: "Invalid token" });
    }
}

module.exports = { authMiddleware };