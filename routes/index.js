/*
 * Connect all of your endpoints together here.
 */
module.exports = function (app, router) {

    console.log("Loading API routes");

    require('./home.js')(router);
    require('./user.js')(router);
    require('./task.js')(router);

    app.use('/api', router);

};