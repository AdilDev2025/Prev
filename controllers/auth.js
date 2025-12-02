const jwt = require('jsonwebtoken')
const {users} = require('../models/prisma/schema.prisma')
const bcrypt = require("bcrypt")
const dotenv= require("dotenv")
dotenv.config


const register = async (req, res) => {

    const {email, password} = req.body

    if(email && password){
       const passwordHash = await bcrypt.hash(password, 10)
        users.create(
            {
                data:{
                    email,
                    passwordHash
                }
            }
        )

    }
}

