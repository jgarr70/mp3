const Task = require('../models/task');
const User = require('../models/user');

console.log("Loading task.js");

module.exports = function (router) {

    router.get('/tasks', async function (req, res) {
        try {
            const tasks = await Task.find();

            res.json({
                message: "OK",
                data: tasks
            });

        } catch (error) {
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    });

    router.get('/tasks/:id', async function (req, res) {
        try {
            let query = Task.findById(req.params.id);
            let selectFields = null;
            
            const selectParams = req.query.select;

            if(selectParams) {
                selectFields = JSON.parse(selectParams);
                console.log("Select fields:", selectFields);
                query = query.select(selectFields);
            }
            
            const task = await query;
            
            if (!task) {
                return res.status(404).json({
                    message: "Task not found"
                });
            }

            res.json({
                message: "OK",
                data: task
            });

        } catch (error) {
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    });

    router.post('/tasks', async function (req, res) {
        console.log("POST /tasks route reached!");
        try {
            const { name, deadline, description, completed, assignedUser, assignedUserName, dataCreated} = req.body;

            if (!name || !deadline) {
                return res.status(400).json({
                    message: "Name and deadline are required"
                });
            }

            const newTask = new Task({ name, deadline, description, completed, assignedUser, assignedUserName, dataCreated });
            await newTask.save();

            res.status(201).json({
                message: "Task created successfully",
                data: newTask
            });




        } catch (error) {
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    });


    router.put('/tasks/:id', async function (req, res) {
        console.log("PUT /tasks/:id route reached!");
        try {
            let query = Task.findById(req.params.id);
            const task = await query;

            if (!task){
                return res.status(404).json({
                    message: "Task not found"
                });
            }
            // console.log("Req: ", req.body);name: {
            const { assignedUser, assignedUserName, name, description, deadline, completed} = req.body;

            let user_query = User.findById(assignedUser);
            const user = await user_query;

            task.assignedUser = assignedUser;
            task.assignedUserName = assignedUserName;

            if (!user){
                return res.status(404).json({
                    message: "User not found"
                });
            }

            if(user.name !== assignedUserName){
                return res.status(400).json({
                    message: "Assigned user name does not match the user ID"
                });
            }

            task.name = name;
            task.description = description;
            task.deadline = deadline;
            task.completed = completed;

            if (task.completed == true) {
                user.pendingTasks.push(task._id.toString());
            } 
            // else{
            //     remove user task from pendingtasks
            // }

            const updatedTask = await task.save();
            const updatedUser = await user.save();

            res.status(200).json({
                message: "Task updated successfully",
                data: updatedTask
            });



        } catch (error) {
            console.error("Error fetching users:", error);
            res.status(500).json({
                message: "Internal Server Error"
            });
        }

    });

    return router;
};