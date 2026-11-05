const User = require('../models/user');
const Task = require('../models/task');
const mongoose = require('mongoose');

console.log("Loading user.js");

module.exports = function (router) {

    router.get('/users', async function (req, res) {
        try {

            let whereParams = {};
            let sortParams = {};
            let limitParams = null;
            let skipParams = null;
            let selectFields = null;


            if(req.query.where){
                whereParams = JSON.parse(req.query.where);
                console.log("Where params:", whereParams);
                if(typeof whereParams !== 'object' || Array.isArray(whereParams)) {
                    return res.status(400).json({
                        message: "Where must be a valid JSON object",
                        data: null
                    });
                }
            }

            if(req.query.sort){
                sortParams = JSON.parse(req.query.sort);
                console.log("Sort params:", sortParams);
                if(typeof sortParams !== 'object' || Array.isArray(sortParams)) {
                    return res.status(400).json({
                        message: "Sort must be a valid JSON object",
                        data: null
                    });
                }
            }

            if(req.query.limit){
                limitParams = parseInt(req.query.limit);
                console.log("Limit params:", limitParams);
                if(Number(limitParams) == NaN || limitParams < 0){
                    return res.status(400).json({
                        message: "Limit must be a positive integer",
                        data: null
                    });
                }
            }

            if(req.query.skip){
                skipParams = parseInt(req.query.skip);
                console.log("Skip params:", skipParams);
                if(Number(skipParams) == NaN || skipParams < 0){
                    return res.status(400).json({
                        message: "Skip must be a positive integer",
                        data: null
                    });
                }
            }

            
            if(req.query.select){
                selectFields = JSON.parse(req.query.select);
                console.log("Select fields:", selectFields);
                if(typeof selectFields !== 'object' || Array.isArray(selectFields)) {
                    return res.status(400).json({
                        message: "Select must be a valid JSON object",
                        data: null
                    });
                }
            }

            const users = await User.find(whereParams).sort(sortParams).skip(skipParams).limit(limitParams).select(selectFields);

            if (req.query.count === "true") {
                const totalUsers = await User.countDocuments(whereParams);

                return res.json({
                    message: "OK",
                    data: totalUsers
                });
            }
            
            res.json({
                message: "OK",
                data: users
            });

        } catch (error) {
            console.error("Error fetching users:", error);
            res.status(500).json({
                message: "Internal Server Error",
                data: null
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
                    message: "User not found",
                    data: null
                });
            }

            res.status(200).json({
                message: "User found",
                data: user
            });
            

        } catch (error) {
            console.error("Error fetching user:", error);
            if (error.name === 'CastError') {
                return res.status(404).json({
                    message: "User not found",
                    data: null
                });
            }
            res.status(400).json({
                message: "Bad Request",
                data: null
            });
        }
    });

    router.post('/users', async function (req, res) {
        console.log("POST /users route reached!");
        try {
            const { name, email, pendingTasks } = req.body;

            // Check if the user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    message: "User already exists",
                    data: null
                });
            }

            if (!name || !email) {
                return res.status(400).json({
                    message: "Name and email are required",
                    data: null
                });
            }

            for (const taskId of pendingTasks || []) {
                if(!mongoose.isValidObjectId(taskId)){
                    return res.status(400).json({
                        message: `Invalid task ID`,
                        data: null
                    }); 
                }

                const task = await Task.findById(taskId);

                if (!task) {
                    return res.status(404).json({
                        message: `Task ${taskId} not found`,
                        data: null
                    });
                }
                if (task.completed) {
                    return res.status(400).json({
                        message: "Completed tasks cannot be pending",
                        data: null
                    });
                }

            }

            const newUser = new User({ name, email, pendingTasks: pendingTasks || [] });
            await newUser.save();

            for (const taskId of newUser.pendingTasks) {
                const task = await Task.findById(taskId);
                if (task) {
                    if (task.assignedUser && task.assignedUser.toString() !== newUser._id.toString()) {
                        await User.updateOne(
                            { _id: task.assignedUser },
                            { $pull: { pendingTasks: taskId } }
                        );
                    }
                    task.assignedUser = newUser._id;
                    task.assignedUserName = newUser.name;
                    await task.save();

                }
            }

            res.status(201).json({
                message: "User created successfully",
                data: newUser
            });

        } catch (error) {
            res.status(500).json({
                message: "Internal Server Error",
                data: null
            });
        }
    });

    router.put('/users/:id', async function (req, res) {
        try{
            let query = User.findById(req.params.id);
            const user = await query;

            if (!user){
                return res.status(404).json({
                    message: "User not found",
                    data: null
                });
            }

            const { name, email, pendingTasks } = req.body;

            let prevName = user.name;
            let prevEmail = user.email;
            let prevPendingTasks = user.pendingTasks;

            if (!name || !email) {
                return res.status(400).json({
                    message: "Name and email are required",
                    data: null
                });
            }
            const existingUser = await User.findOne({
                email: email,
                _id: { $ne: user._id }
            });

            if (existingUser) {
                return res.status(400).json({
                    message: "Email already exists",
                    data: null
                });
            }

            user.name = name !== undefined ? name : prevName;
            user.email = email !== undefined ? email : prevEmail;

            const oldTasks = prevPendingTasks.map(id => id.toString());
            const newTasks = pendingTasks !== undefined ? [...new Set(pendingTasks.map(id => id.toString()))] : [];
            const userId = user._id.toString();
            const taskIdsToCheck = [...new Set([...oldTasks, ...newTasks])];

            for (const taskId of newTasks) {
                if (!mongoose.Types.ObjectId.isValid(taskId)) {
                    return res.status(400).json({
                        message: "Invalid task ID",
                        data: null
                    });
                }
            }

            const tasks = await Task.find({
                _id: { $in: taskIdsToCheck }
            });

            const taskMap = new Map(tasks.map(task => [task._id.toString(), task]));
            for (const taskId of newTasks) {
                if (!taskMap.has(taskId)) {
                    return res.status(404).json({
                        message: `Task ${taskId} not found`,
                        data: null
                    });
                }
            }
            for (const taskId of newTasks) {
                const task = taskMap.get(taskId);

                if (!task) {
                    return res.status(404).json({
                        message: `Task ${taskId} not found`,
                        data: null
                    });
                }

                if (task.completed) {
                    return res.status(400).json({
                        message: "Completed tasks cannot be pending",
                        data: null
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
            user.pendingTasks = newTasks;

            const updatedUser = await user.save();

            res.status(200).json({
                message: "User updated successfully",
                data: updatedUser
            });
        } catch (error) {
            console.error("Error updating user:", error);
            if (error.name === 'CastError') {
                return res.status(404).json({
                    message: "User not found",
                    data: null
                });
            }
            res.status(500).json({
                message: "Internal Server Error",
                data: null
            });
        }
    });

    router.delete('/users/:id', async function (req, res) {
        try {
            const user = await User.findById(req.params.id);

            if (!user) {
                return res.status(404).json({
                    message: "User not found",
                    data: null
                });
            }

            const userId = user._id.toString();

            const tasks = await Task.find({
                assignedUser: userId
            });

            for (const task of tasks) {
                task.assignedUser = "";
                task.assignedUserName = "unassigned";
                await task.save();
            }

            await User.deleteOne({ _id: req.params.id });

            return res.status(204).end();
        } catch (error) {
            console.error("Error deleting user:", error);
            if (error.name === 'CastError') {
                return res.status(404).json({
                    message: "User not found",
                    data: null
                });
            }
            res.status(500).json({
                message: "Internal Server Error",
                data: null
            });
        }
    });

    

    return router;
};