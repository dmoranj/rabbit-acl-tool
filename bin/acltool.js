#!/usr/bin/env node

/*
 * Copyright 2016 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of iotagent-ul
 *
 * iotagent-ul is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * iotagent-ul is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with iotagent-ul.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[iot_support@tid.es]
 */
'use strict';

var async = require('async'),
    fs = require('fs'),
    program = require('commander'),
    apply = async.apply,
    amqp = require('amqplib/callback_api'),
    credentials= {
        login: '',
        password: ''
    },
    host = 'localhost',
    adminExchange = '_topicacladmin';

function errorHandler(error) {
    console.log('Error performing operation: %s', error);
}

function getConnection(callback) {
    var urlPrefix = '',
        url;

    if (credentials.login && credentials.password) {
        urlPrefix = credentials.login + ':' + credentials.password + '@';
    }

    url = 'amqp://' + urlPrefix + host;

    console.log("Connecting to [%s]", url);

    amqp.connect(url, callback);
}

function createChannel(conn, callback) {
    conn.on('error', errorHandler);
    conn.createChannel(callback);
}

function sendCommand(ex) {
    return function(key, msg, ch, callback) {
        var args = process.argv.slice(2);

        ch.assertExchange(ex, 'topic', {});
        ch.publish(ex, key, new Buffer(msg));

        callback();
    };
}

function endOperation(exit) {
    return function(error) {
        if (error) {
            console.log('Operation could not be completed');
        }

        if (exit) {
            setTimeout(function() {
                process.exit(0);
            }, 500);
        }
    };
}

function addPermission(user, permission, topic) {
    var payload = user + ' ' + permission + ' ' + topic  + ';';
    async.waterfall([
        getConnection,
        createChannel,
        apply(sendCommand(adminExchange), 'add', payload)
    ], endOperation(true));
}

function readFrom(ex) {
    return function(topic, ch, callback) {
        ch.assertExchange(ex, 'topic', {durable: true});

        ch.assertQueue('', {exclusive: false}, function(err, q) {
            console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
            ch.bindQueue(q.queue, ex, topic);

            ch.consume(q.queue, function(msg) {
                console.log(" [x] %s", msg.content.toString());
            }, {noAck: true});

            callback();
        });
    };
}

function refreshPermissions() {
    function doOperations(ch, callback) {
        async.series([
            apply(readFrom(adminExchange), 'refresh', ch),
            apply(sendCommand(adminExchange), 'refresh', '', ch)
        ], callback);
    }

    async.waterfall([
        getConnection,
        createChannel,
        doOperations
    ], endOperation(true));
}

function listenForMessages(exchange, topic) {
    async.waterfall([
        getConnection,
        createChannel,
        apply(readFrom(exchange), topic)
    ], endOperation(false));
}

function publishMessage(exchange, topic, msg) {
    async.waterfall([
        getConnection,
        createChannel,
        apply(sendCommand(exchange), topic, msg)
    ], endOperation(true));
}

function clearTables() {
    async.waterfall([
        getConnection,
        createChannel,
        apply(sendCommand(adminExchange), 'clear', '')
    ], endOperation(true));
}

function savePermissions() {
    async.waterfall([
        getConnection,
        createChannel,
        apply(sendCommand(adminExchange), 'save', '')
    ], endOperation(true));
}

function setGlobalOptions(command) {
    if (command.username && command.password) {
        credentials.login = command.username;
        credentials.password = command.password;
    }

    if (command.host) {
        host = command.host;
    }
}

try {
    program
        .version('0.0.1')
        .option('-U, --username <uname>', 'Connect with an alternate user name')
        .option('-P, --password <pass>', 'Password for the selected user')
        .option('-H, --host <rabbithost>', 'Host of the RabbitMQ server')
    ;

    program
        .command('add <permission> <topic> [user]')
        .description('Adds a new permission for the selected user or a global permission if no user is given.')
        .action(function (topic, permission, user, command, options) {
            setGlobalOptions(program);
            console.log('Adding new permission [%s %s %s]', permission, topic, user);
            addPermission(user || '', permission, topic);
        });

    program
        .command('refresh')
        .description('Send a message to the RabbitMQ ACL service to refresh the ACL file for all the listeners.')
        .action(function (command, options) {
            setGlobalOptions(program);
            console.log('Refreshing permissions');
            refreshPermissions();
        });

    program
        .command('save')
        .description('Saves the ACL Database to the configured file.')
        .action(function (command, options) {
            setGlobalOptions(program);
            console.log('Saving permissions list');
            savePermissions();
        });

    program
        .command('clear')
        .description('Clear all the ACL Permissions from memory.')
        .action(function (command, options) {
            setGlobalOptions(program);
            console.log('Clearing permissions list');
            clearTables();
        });

    program
        .command('publish <exchange> <topic> <message>')
        .description('Publish the selected message to the given topic.')
        .action(function (exchange, topic, message, command, options) {
            setGlobalOptions(program);
            publishMessage(exchange, topic, message);
            console.log('Publishing message in Exchange [%s] with key [%s]', exchange, topic);
        });

    program
        .command('listen <exchange> <topic>')
        .description('Wait for and display messages from the given exchange and topic.')
        .action(function (exchange, topic, command, options) {
            setGlobalOptions(program);
            listenForMessages(exchange, topic);
            console.log('Listening in the queue for messages in Exchange [%s] with key [%s]', exchange, topic);
        });


    program.parse(process.argv);
} catch(error) {
    console.error('Error: %s', error);
}
