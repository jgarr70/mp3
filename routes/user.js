const User = require('../models/user');

console.log("Loading user.js");

module.exports = function (router) {

    router.get('/users', async function (req, res) {
        try {
            const users = await User.find();

            res.json({
                message: "OK",
                data: users
            });

        } catch (error) {
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    });

    router.get('/users/:id', async function (req, res) {
        try {
            const user = await User.findById(req.params.id);

            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            res.json({
                message: "OK",
                data: user
            });

        } catch (error) {
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    });

    router.post('/users', async function (req, res) {
        console.log("POST /users route reached!");
        try {
            const { name, email } = req.body;

            // Check if the user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    message: "User already exists"
                });
            }

            if (!name || !email) {
                return res.status(400).json({
                    message: "Name and email are required"
                });
            }

            const newUser = new User({ name, email });
            await newUser.save();

            res.status(201).json({
                message: "User created successfully",
                data: newUser
            });

        } catch (error) {
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    });

    

    return router;
};