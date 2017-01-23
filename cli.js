#!/usr/bin/env node

var program = require('commander');
var prettyjson = require('prettyjson');
var Table = require('easy-table');

program
    .version('0.0.1')
    .usage('check <source> [options]')
    .option('-c, --config <path-to-config>', 'Path to the config file', "")
    .option('-t, --timeout <n>', 'Timeout [10000]', 10000)
    .option('-d, --debug', 'Debug', false)
;

var valid = false;

program
    .command('check <source>')
    .action(function (source, options) {
        valid = true;
        var config = require(program.config || './config/' + source + '.json');
        var module = require('./sources/' + source)({config: config, debug: program.debug, timeout: program.timeout});
        module.check(function (err, result) {
            if (program.debug) {
                console.log("+ Results");
                console.log("\n");
                var t = new Table;
                result.forEach(function (instance) {
                    t.cell('', instance.name);
                    instance.entities.forEach(function (entity) {
                        t.cell(entity.entity, entity.count);
                    });
                    t.newRow()
                });
                console.log(t.printTransposed());
                console.log("+ Errors");
                console.log("\n");
                console.log(prettyjson.render(
                    result
                        .filter(function (instance) {
                            return instance.errors.length;
                        })
                        .map(function (instance) {
                            return {instance: instance.name, errors: instance.errors};
                        })
                ));
                console.log("\n");
            } else {
                console.log(err ? "ERROR" : "OK");
            }
            process.exit();
        });
    });

program
    .parse(process.argv);

if (!program.args.length || !valid) program.help();

