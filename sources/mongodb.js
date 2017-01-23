var async = require('async');
var MongoClient = require('mongodb').MongoClient;

module.exports = function (params) {

    var config = params.config;
    var debug = params.debug;
    var timeout = params.timeout;
    var start = new Date();

    function check(callback) {
        var report = [];
        if (debug) {
            console.log('\n');
            console.log('Checking MongoDB');
            console.log('\n');
        }
        async.each(config.instances,
            function (instance, callback) {
                var instance_report = {
                    name: instance.name,
                    entities: []
                };
                async.waterfall([
                        function (callback) {
                            var timeout_err = false;
                            var timeout_ctr = setTimeout(function () {
                                timeout_err = true;
                                callback({message: "Timeout"});
                            }, timeout);
                            connect(instance, function (err, db) {
                                if (!timeout_err) {
                                    clearTimeout(timeout_ctr);
                                    instance_report.entities.push({
                                        entity: "* connection",
                                        count: new Date() - start
                                    });
                                    callback(err, db);
                                }
                            })
                        },
                        function (db, callback) {
                            var timeout_err = false;
                            var timeout_ctr = setTimeout(function () {
                                timeout_err = true;
                                callback({message: "Timeout"});
                            }, timeout);
                            entities(db, function (err, collections) {
                                if (!timeout_err) {
                                    clearTimeout(timeout_ctr);
                                    instance_report.entities.push({
                                        entity: "* entities",
                                        count: new Date() - start
                                    });
                                    callback(err, db, collections)
                                }
                            });
                        },
                        function (db, collections, callback) {
                            async.each(collections,
                                function (collection, callback) {
                                    count(db, collection.name, function (err, count) {
                                        instance_report.entities.push({
                                            entity: "- " + collection.name,
                                            count: count
                                        });
                                        callback(err, count);
                                    })
                                }, function (err) {
                                    instance_report.entities.splice(2, 0, {
                                        entity: "* total",
                                        count: new Date() - start
                                    });
                                    db.close(function () {
                                        callback(err);
                                    });
                                })
                        }
                    ],
                    function (err) {
                        report.push(instance_report);
                        callback(null);
                    })
            },
            function (err) {
                callback(err, report);
            });

    }

    function connect(instance, callback) {
        MongoClient.connect(instance.uri, function (err, db) {
            callback(err, db);
        })
    }

    function entities(db, callback) {
        db.listCollections().toArray(function (err, result) {
            return callback(err, result)
        })
    }

    function count(db, collection, callback) {
        db.collection(collection).count({}, function (err, result) {
            return callback(err, result)
        });
    }

    return {
        check: check
    }

};