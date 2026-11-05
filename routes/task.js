const Task = require('../models/task');
const User = require('../models/user');

console.log("Loading task.js");

module.exports = function (router) {

    router.get('/tasks', async function (req, res) {
        try {
            let whereParams = {};
            let sortParams = {};
            let limitParams = null;
            let skipParams = null;


            if(req.query.where){
                whereParams = JSON.parse(req.query.where);
                console.log("Where params:", whereParams);
            }

            if(req.query.sort){
                sortParams = JSON.parse(req.query.sort);
                console.log("Sort params:", sortParams);
            }

            if(req.query.limit){
                limitParams = parseInt(req.query.limit);
                console.log("Limit params:", limitParams);
            }

            if(req.query.skip){
                skipParams = parseInt(req.query.skip);
                console.log("Skip params:", skipParams);
            }

            const tasks = await Task.find(whereParams).sort(sortParams).skip(skipParams).limit(limitParams);

            const totalTasks = await Task.countDocuments(whereParams);
            console.log("Total tasks matching where params:", totalTasks);

            res.json({
                message: "OK",
                data: tasks
            });

        } catch (error) {
            console.error("Error fetching tasks:", error);
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
            
            let{name, deadline, description, completed, assignedUser, assignedUserName} = req.body;

            if(!name || !deadline){
                return res.status(400).json({
                    message: "Name and deadline are required"
                });
            }

            const newAssignedUser = assignedUser !== undefined ? assignedUser : "";
            let newAssignedUserName = assignedUserName !== undefined ? assignedUserName : "unassigned";

            let newUser = null;

            if(newAssignedUser == ""){
                newAssignedUserName = "unassigned";
            } else{
                newUser = await User.findById(newAssignedUser);
                if(!newUser){
                    return res.status(400).json({
                        message: "Assigned user not found"
                    });
                }
                if(assignedUserName !== undefined && newUser.name !== assignedUserName){
                    return res.status(400).json({
                        message: "Assigned user's name does not match"
                    });
                }
                newAssignedUserName = newUser.name;
            }

            const prevAssignedUser = task.assignedUser;
            const newCompleted = completed !== undefined ? completed : false;
            
            const taskId = task._id.toString();

            if (prevAssignedUser && prevAssignedUser !== newAssignedUser) {
                await User.updateOne(
                    { _id: prevAssignedUser },
                    { $pull: { pendingTasks: taskId } }
                );
            }
            task.name = name;
            task.deadline = deadline;
            task.description = description !== undefined ? description : "";
            task.completed = newCompleted;
            task.assignedUser = newAssignedUser;
            task.assignedUserName = newAssignedUserName;

            await task.save();

            if(newAssignedUser){
                if(newCompleted){
                    await User.updateOne(
                        { _id: newAssignedUser },
                        { $pull: { pendingTasks: taskId } }
                    );
                } else {
                    await User.updateOne(
                        { _id: newAssignedUser },
                        { $addToSet: { pendingTasks: taskId } }
                    );
                }
            }

            res.status(200).json({
                message: "Task updated successfully",
                data: task
            });


        } catch (error) {
            console.error("Error fetching users:", error);
            res.status(500).json({
                message: "Internal Server Error"
            });
        }

    });

    router.delete('/tasks/:id', async function (req, res) {
        console.log("DELETE /tasks/:id route reached!");
        try {
            const task = await Task.findById(req.params.id);

            if (!task) {
                return res.status(404).json({
                    message: "Task not found"
                });
            }

            if (task.assignedUser) {
                await User.updateOne(
                    { _id: task.assignedUser },
                    { $pull: { pendingTasks: task._id.toString() } }
                );
            }

            await Task.deleteOne({ _id: req.params.id });

            res.status(204).json({
                message: "Task deleted successfully"
            });

        } catch (error) {
            console.error("Error deleting task:", error);
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    });

    return router;
};