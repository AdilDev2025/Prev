const jwt = require('jsonwebtoken')
const bcrypt = require("bcrypt")
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET

const register = async (req, res) => {
    try {
        const { email, password, name } = req.body // Added name since it's required in schema


        if (!email || !password || !name) {
            return res.status(400).json({
                message: "Name, email and password are required"
            })
        }

        // Check if user already exists - using prisma.users
        const existingUser = await prisma.users.findUnique({
            where: { email }
        })

        if (existingUser) {
            return res.status(400).json({ message: "User already exists" })
        }

        const passwordHash = await bcrypt.hash(password, 10)

        // Create user using prisma.users
        const user = await prisma.users.create({
            data: {
                name,
                email,
                password: passwordHash,
                role: "user"
            }
        })

        res.status(201).json({
            message: "User registered successfully",
            userId: user.id
        })

    } catch (error) {
        console.error("Registration error:", error)
        res.status(500).json({ message: "Internal server error" })
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" })
        }

        // Find user using prisma.users
        const user = await prisma.users.findUnique({
            where: { email }
        })

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" })
        }

        // Compare with user.password (not passwordHash)
        const validPass = await bcrypt.compare(password, user.password)

        if (!validPass) {
            return res.status(401).json({ message: "Invalid credentials" })
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        )

        res.status(200).json({
            message: "Login successful",
            token,
            userId: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        })

    } catch (error) {
        console.error("Login error:", error)
        res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = { register, login }