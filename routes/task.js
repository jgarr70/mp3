const Task = require('../models/task');

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
            const task = await Task.findById(req.params.id);

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
            const { name, deadline } = req.body;

            if (!name || !deadline) {
                return res.status(400).json({
                    message: "Name and deadline are required"
                });
            }

            const newTask = new Task({ name, deadline });
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

    return router;
};