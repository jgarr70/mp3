const User = require('../models/user');

console.log("Loading user.js");

module.exports = function (router) {

    router.get('/users', async function (req, res) {
        try {
            let users = {};
            let selectFields = null;
            
            const selectParams = req.query.select;

            if(selectParams) {
                selectFields = JSON.parse(selectParams);
                console.log("Select fields:", selectFields);
                users = await User.find({}).select(selectFields);
            } else {
                users = await User.find();
            }

            res.json({
                message: "OK",
                data: users
            });

        } catch (error) {
            console.error("Error fetching users:", error);
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

            res.status(200).json({
                message: "User found",
                data: user
            });
            

        } catch (error) {
            if (error.name === 'CastError') {
                return res.status(400).json({
                    message: "Invalid user ID"
                });
            }
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