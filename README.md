# Rabbit MQ Topic ACL Administration

## Index

* [Overview](#overview)
* [Usage](#usage)
  * [Deployment](#deployment)
  * [Excecution](#execution)
  * [Commands](#commands)
  * [Examples of use](#examples)

## <a name="overview"/> Overview
This tool has been developed to ease the administration of ACL-based Topic Authorization with the
[MQ Topic ACL Plugin](https://github.com/dmoranj/rabbit-topic-acl) for [RabbitMQ](https://www.rabbitmq.com/) and to
provide some testing tools for the development of that project. Most of the administrative tasks are performed using
the AMQP Administration API defined in the former.

## <a name="usage"/> Usage
### <a name="deployment"/> Deployment
This tool consists of a single Node.js project, and can be deployed by cloning its GitHub repository. To do so, execute
the following command:

```
git clone https://github.com/dmoranj/rabbit-acl-tool
```

Once copied in the target folder, the dependencies must be downloaded. You can do it executing the following command in
the root of the project:

```
npm install
```

### <a name="execution"/> Execution

The tool consists of a single script, that can be found in the `bin/` folder: `acltool.js`. This script is self-executable
for bash shells. Execution of the script follows the pattern:

```
acltool [options] [command] [parameters]
```
The following table shoes the list of allowed options:

| Option                      | Parameters                          | Description                                              |
| --------------------------- |:----------------------------------- |:-------------------------------------------------------- |
|    -h, --help               |                                     | Output usage information and ignore the rest of options  |
|    -V, --version            |                                     | Output the version number                                |
|    -U, --username           | <uname>                             | Connect to RabbitMQ with an alternate user name. I no user is specified, the connection will be anonymous |
|    -P, --password           | <pass>                              | Password for connecting to RabbitMQ                      |
|    -H, --host               | <rabbithost>                        | Alternate host for the RabbitMQ server. Defaults to `localhost`|

Both credential options (username and password) must be given for the user to be changed in the operations. If just one
of them is given, the connection will remain anonymous.

Next section describes the commands in detail with all its parameters.

The only requirement for the tool execution is: Node.js v4.7.0+.

### <a name="execution"/> Execution

#### add <permission> <topic> [user]

Adds a new permission for the selected user or a global permission if no user is given. Permissions must be one of the
following: read, write or readwrite. The `<topic>` parameter indicates a topic pattern, as described in the
[MQ Topic ACL Plugin](https://github.com/dmoranj/rabbit-topic-acl) documentation.

#### refresh
Send a message to the RabbitMQ ACL service to refresh the ACL file for all the listeners and listen in the notifications
queue to receive the refreshed ACL. If the notification is not received before the timeout is reached, the command will
end.

#### save <filename>
Saves the current ACL Database to the given file. This command is mainly intended for the creation of backups and administrative
copies for debugging. The `<filename>` parameter refers to a absolute path in the server hosting the target RabbitMQ. The
RabbitMQ user must have write permission over the selected directory.

#### clear
Clear all the ACL Permissions from the database. Take into account that the Mnesia database is persistent, so this will
also remove the stored permissions (they won't be reloaded after a restart).

#### publish <exchange> <topic> <message>
This command publish the selected message to the given AMQP exchange using the given topic as the routing key. All the
operations are performed over the default VHost. If any credentials are given, they are used to publish the message. The
publish will be anonymous otherwise.

#### listen <exchange> <topic>
Wait for and display messages from the given exchange and topic. The application will listen forever, until a Control-C
break sequence is issued. It will display the text of all the received messages.

## License

This tool is licensed under Affero General Public License (GPL) version 3. You can find a copy of the license in the
repository root.