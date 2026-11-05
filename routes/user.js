const User = require('../models/user');

console.log("Loading user.js");

module.exports = function (router) {

    router.get('/users', async function (req, res) {
        try {
            let query = User.find({});
            let selectFields = null;
            
            const selectParams = req.query.select;

            if(selectParams) {
                selectFields = JSON.parse(selectParams);
                console.log("Select fields:", selectFields);
                query = query.select(selectFields);
            }
            
            const users = await query;
            
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
            let query = User.findById(req.params.id);
            let selectFields = null;
            
            const selectParams = req.query.select;

            if(selectParams) {
                selectFields = JSON.parse(selectParams);
                console.log("Select fields:", selectFields);
                query = query.select(selectFields);
            }
            
            const user = await query;


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
            console.error("Error fetching user:", error);
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

    router.put('/users/:id', async function (req, res) {
        try{
            let query = User.findById(req.params.id);
            const user = await query;

            if (!user){
                return res.status(404).json({
                    message: "User not found"
                });
            }

            const { name, email, pendingTasks } = req.body;

            let prevName = user.name;
            let prevEmail = user.email;
            let prevPendingTasks = user.pendingTasks;

            if (!name || !email) {
                return res.status(400).json({
                    message: "Name and email are required"
                });
            }

            user.name = name !== undefined ? name : prevName;
            user.email = email !== undefined ? email : prevEmail;
            user.pendingTasks = pendingTasks !== undefined ? pendingTasks : [];

            const oldTasks = user.pendingTasks.map(id => id.toString());
            const newTasks = pendingTasks !== undefined ? [...new Set(pendingTasks.map(id => id.toString()))] : [];
            const userId = user._id.toString();
            const taskIdsToCheck = [...new Set([...oldTasks, ...newTasks])];

            const tasks = await Task.find({
                _id: { $in: taskIdsToCheck }
            });

            const taskMap = new Map(tasks.map(task => [task._id.toString(), task]));
            for (const taskId of newTasks) {
                if (!taskMap.has(taskId)) {
                    return res.status(400).json({
                        message: `Task ${taskId} not found`
                    });
                }
            }

            for (const taskId of oldTasks) {
                if (!newTasks.includes(taskId)) {
                    const task = taskMap.get(taskId);

                    if (task && task.assignedUser === userId) {
                        task.assignedUser = "";
                        task.assignedUserName = "unassigned";
                        await task.save();
                    }
                }
            }

            for (const taskId of newTasks) {
                const task = taskMap.get(taskId);

                if (!task) continue;

                if (
                    task.assignedUser &&
                    task.assignedUser !== userId
                ) {
                    await User.updateOne(
                        { _id: task.assignedUser },
                        { $pull: { pendingTasks: taskId } }
                    );
                }

                // Assign task to this user.
                task.assignedUser = userId;
                task.assignedUserName = name;

                await task.save();
            }

            await Task.updateMany(
                { assignedUser: userId },
                { $set: { assignedUserName: name } }
            );

            user.name = name;
            user.email = email;
            
            user.pendingTasks = newTasks.filter(taskId => {
                const task = taskMap.get(taskId);
                return task && !task.completed;
            });

            const updatedUser = await user.save();

            res.status(200).json({
                message: "User updated successfully",
                data: updatedUser
            });
        } catch (error) {
            console.error("Error updating user:", error);
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    });

    

    return router;
};