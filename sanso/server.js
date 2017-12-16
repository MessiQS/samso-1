var app = require('express')(),
    server = require('http').Server(app),
    io = require('socket.io')(server),
    moment = require('moment'),
    //加密
    CryptoJS = require("crypto-js"),
    //定时任务
    schedule = require("node-schedule"),
    Redis = require('ioredis'),
    log4js = require('log4js'),
    //file-system
    fs = require('fs'),
    querystring = require("querystring"),
    //comfig
    config = iniToObj("../../../../bin/config.ini"),
    publishRedis = new Redis({
        host: config.redis.REDIS_HOST,
        port: config.redis.REDIS_PORT,
        reconnectOnError: function() {
            console.log('error');
        }
    }),
    subscribeRedis = new Redis({
        host: config.redis.REDIS_HOST,
        port: config.redis.REDIS_PORT,
        reconnectOnError: function() {
            console.log('error');
        }
    }),
    clients = [],
    sendMessageInfo = {},
    socketIds = [],
    port = config.im.IM_PORT,
    //创建连接池
    mysql = require('mysql'),
    pool = mysql.createPool({
        host: config.mysql.DB_HOST,
        user: config.mysql.DB_USERNAME,
        password: config.mysql.DB_PASSWORD,
        database: config.mysql.DB_DATABASE,
        port: config.mysql.DB_PORT,
        connectionLimit: 5000
    }),
    encryptKey = config.im.IM_ENCRYPT_KEY || "xlhF31NeOlibJcoOW9tvZg7TkHcAZI3a";
moment.locale('zh-cn');
//日志
log4js.configure(__dirname + '/log_config.json');
var log_success = log4js.getLogger('success'),
    log_chat = log4js.getLogger('chat'),
    log_group = log4js.getLogger('group'),
    log_error = log4js.getLogger('error');
var isdebugger = true;

function addLog(data, type) {
    if (!isdebugger) {
        return;
    }
    switch (type) {
        case 'success':
            log_success.trace(data);
            break;
        case 'chat':
            log_chat.trace(data);
            break;
        case 'group':
            log_group.trace(data);
            break;
        case 'error':
            log_error.trace(data);
            break;
        default:
            log_error.trace(data);
            break;
    }
}
server.listen(port, function() {
    console.log('im server started,listening on Port %s', port);
});
//订阅导出消息通道
subscribeRedis.subscribe('eoffice.export-channel');
//订阅系统消息通道
subscribeRedis.subscribe('eoffice.system-message-channel');
subscribeRedis.on("error", function(error) {
    console.log("subscribeRedis error : ");
    console.log(error);
});
//接受系统消息后通知客户端
subscribeRedis.on('message', function(channel, message) {
    var parsedMessage = JSON.parse(message);
    switch (channel) {
        //导出通道
        case 'eoffice.export-channel':
            var toUserId = parsedMessage.userId,
                downloadKey = parsedMessage.downloadKey;
            if (toUserId) {
                //在线
                if (clients[toUserId]) {
                    clients[toUserId].emit('eoffice.export-channel', downloadKey, function(result) {
                        console.log(result)
                    });
                }
                //不在线
                else {}
            }
            break;
            //系统消息通道
        case 'eoffice.system-message-channel':
            var recipients = parsedMessage.recipients;
            if (recipients) {
                //收件人 多个人是数组模式
                var toUsers = recipients;
                userCount = toUsers.length;
                for (var i = 0; i < userCount; i++) {
                    //在线
                    if (clients[toUsers[i]]) {
                        console.log(toUsers[i]);
                        clients[toUsers[i]].emit('eoffice.system-message-channel', message, function(result) {
                            console.log(result)
                        });
                    }
                    //不在线
                    else {}
                }
            } else {
                console.log(message);
                console.log("未指定接收人");
            }
            break;
    }
});
var createTableString = {
    'creator': 'char(50) not null',
    'msg': 'mediumtext not null',
    'time': 'bigint(20) not null',
    'userTime': 'datetime',
    'msg_type': 'char(50) not null',
    'type': 'char(50) not null',
    'info': 'mediumtext not null',
    'fromDetail': 'mediumtext not null',
    'group_id': 'char(50) not null',
    'send_time': 'bigint(20) not null',
    'msg_id': 'char(50) not null',
    'download': 'char(255)',
    'file_type': 'char(50)'
};
io.on('connection', function(socket) {
    //解决刷新页面时,更新socket
    var queryInfo = socket.handshake.query,
        loginUserId = queryInfo.loginUserId,
        loginDeptId = queryInfo.loginDeptId,
        loginRoleId = queryInfo.loginRoleId,
        isExist = false;
    var functionArray = new sqlFormat(),
        selectFromSql = functionArray.selectFromSql,
        deleteFromSql = functionArray.deleteFromSql,
        dropTable = functionArray.dropTable,
        updateToSql = functionArray.updateToSql,
        createTable = functionArray.createTable,
        insertToSql = functionArray.insertToSql
        getRedis = functionArray.getRedis;
    if (loginUserId && loginUserId !== "undefined") {
        if (clients[loginUserId]) {
            console.log("userExist");
            isExist = true;
            io.emit('userExist', loginUserId + 'is online already');
        };
        //更新服务器的信息
        clients[loginUserId] = socket;
        socketIds[socket.id] = loginUserId;
        //更新在线人员
        io.emit('onlineUsers', Object.keys(clients));
        // console.log(Object.keys(clients));
        //加入群组
        joinGroup({
            userId: loginUserId,
            deptId: loginDeptId,
            roleId: loginRoleId
        }, socket);
        //加入到redis
        joinRedis(loginUserId);
    };
    socket.on('login', function(data, fn) {
        // //加入群组
        joinGroup({
            userId: loginUserId,
            deptId: loginDeptId,
            roleId: loginRoleId
        }, socket);
        if (typeof fn === "function") {
            fn('success');
        }
    });
    addLog(loginUserId + ' have login', 'success');
    //心跳检测
    socket.on('heartbeat test', function(data, fn) {
        fn('success');
    })
    //新建聊天组
    socket.on('create group', function(data, fn) {
        fn('success');
        //创建聊天组
        var selectSQL = 'INSERT INTO chat_group SET ?';
        insertToSql('chat_group',data).then( () => {
            joinGroup({
                userId: loginUserId,
                deptId: loginDeptId,
                roleId: loginRoleId
            }, socket);
            var members = data.members.split(','),
                time = new Date().getTime();
            members.forEach((value) => {
                //存储进入群组时间
                whenJoinGroup(data.id, value, time);
                if (value != loginUserId && clients[value]) {
                    var clentInfo = clients[value].handshake.query,
                        clentUserId = clentInfo.loginUserId,
                        clentDeptId = clentInfo.loginDeptId,
                        clentRoleId = clentInfo.loginRoleId;
                    joinGroup({
                        userId: clentUserId,
                        deptId: clentDeptId,
                        roleId: clentRoleId
                    }, clients[value]);
                }
            })
            addLog(loginUserId + ' new a group id = ' + data.id, 'success');
        })
    })
    //获取离线消息
    socket.on('outline recordLength', function() {
        getGroupRecord(loginUserId, socket);
        getPersonalReacord(loginUserId, socket);
    })
    //移动端获取最后一条消息
    socket.on('get lastrecord', function(data, fn) {
        if (!data || !Array.isArray(data)) {
            return;
        };
        var lastData = {};
        publishRedis.hgetall("eoffice_last_record", (error, result) => {
            if (error) {
                console.log(error);
                return;
            };
            data.forEach((value) => {
                if (value && value.id) {
                    if (result[value.id]) {
                        lastData[value.id] = result[value.id];
                    }
                }
            });
            fn(lastData);
        });
    })
    //删除聊天组
    socket.on('delete group', (data, fn) => {
        fn('success');
        //删除聊天组
        deleteRedisGroupRecord(data.id);
        var selectSQL = {
            'id': '="' + data.id + '"'
        };
        deleteFromSql('chat_group', selectSQL).then(rows => {
            var dropName = 'chat_group_record_' + data.id.replace(/\-/g, '_');
            dropTable(dropName).then( () => {
                var members = data.members.split(',');
                joinGroup({
                    userId: loginUserId,
                    deptId: loginDeptId,
                    roleId: loginRoleId
                }, socket);
                members.forEach((value) => {
                    if (clients[value]) {
                        clients[value].emit('edit groupDelete', data, function(result) {
                            if (value !== loginUserId) {
                                clients[value].leave("personal_group_" + data.id);
                            }
                        });
                    }
                });
                addLog(loginUserId + ' delete a group id = ' + data.id, 'success');
            })
        })
    })
    //编辑聊天组
    socket.on('edit group', function(data, fn) {
        fn('success');
        var time = new Date().getTime(),
            selectSQL = {
                'members': data.members,
                'name': data.name,
            },
            condition = {
                'id': '="' + data.id + '"'
            };
        updateToSql('chat_group', selectSQL, condition).then(() => {
            var nowMembers = data.members.split(',');
            nowMembers.forEach(function(value) {
                if (data.addArray.indexOf(value) < 0) {
                    if (clients[value] && loginUserId !== value) {
                        clients[value].emit('edit groupCB', data);
                    }
                }
            })
            socket.emit('edit groupCB', data);
            //删除成员
            if (toString.call(data.deleteArray) === '[object Array]' && data.deleteArray.length > 0) {
                data.deleteArray.forEach(function(value) {
                    if (clients[value]) {
                        clients[value].emit('edit groupDelete', data, function(result) {
                            clients[value].leave("personal_group_" + data.id);
                        });
                    }
                })
            }
            //添加成员
            if (toString.call(data.addArray) === '[object Array]' && data.addArray.length > 0) {
                data.addArray.forEach(function(value) {
                    whenJoinGroup(data.id, value, time);
                    if (clients[value]) {
                        clients[value].emit('edit groupAdd', data, function(result) {
                            var clentInfo = clients[value].handshake.query,
                                clentUserId = clentInfo.loginUserId,
                                clentDeptId = clentInfo.loginDeptId,
                                clentRoleId = clentInfo.loginRoleId;
                            joinGroup({
                                userId: clentUserId,
                                deptId: clentDeptId,
                                roleId: clentRoleId
                            }, clients[value]);
                        });
                    }
                })
            }
            //logs
            addLog(loginUserId + ' eidt a group id = ' + data.id, 'success');
        })
    })
    //发送消息
    socket.on('send message', function(data, fn) {
        var fromUser = data.creator,
            type = data.type,
            isOnline = false;
        if (sendMessageInfo[fromUser] && Array.isArray(sendMessageInfo[fromUser]) && sendMessageInfo[fromUser].indexOf(data.msg_id) >= 0) {
            return;
        };
        data.msg = CryptoJS.AES.decrypt(data.msg, encryptKey).toString(CryptoJS.enc.Utf8);
        if (!sendMessageInfo[fromUser]) {
            sendMessageInfo[fromUser] = [];
        };
        sendMessageInfo[fromUser].push(data.msg_id);
        setTimeout(() => {
            if (sendMessageInfo[fromUser] && Array.isArray(sendMessageInfo[fromUser]) && sendMessageInfo[fromUser].indexOf(data.msg_id) >= 0) {
                sendMessageInfo[fromUser].splice(sendMessageInfo[fromUser].indexOf(data.msg_id), 1);
            };
        }, 15000);
        //消息发送时间
        data.time = new Date().getTime(); //moment().format("YYYY-MM-DD HH:mm:ss");
        //个人消息
        if (type == 'user') {
            var sqlMessage = {
                creator: fromUser,
                msg: CryptoJS.AES.encrypt(data.msg, encryptKey).toString(),
                time: data.time,
                msg_type: data.msg_type,
                type: type,
                send_time: data.send_time,
                download: data.download || '',
                msg_id: data.msg_id,
                file_type: data.file_type || '',
                haveread: 0
            };
            getNameById(fromUser).then((loginUser) => {
                //订阅消息通道
                publishRedis.publish('eoffice-chat-channel', JSON.stringify({
                    message: data.msg,
                    to: data.to,
                    from: loginUser['user_name']
                }))
            })
            //客户端在线
            if (clients[data.to]) {
                isOnline = true;
                clients[data.to].emit('private message', sqlMessage, function(info) {
                    //消息已经成功发送到客户端
                    if (info && clients[fromUser]) {
                        //成功回执
                        clients[fromUser].emit("acknowledge", true);
                    }
                    sqlMessage.msg = data.msg;
                    if (info === 'havRead') {
                        addLog(loginUserId + ' send a message type = user,msg_id = ' + data.msg_id　 + '　to ' + 　data.to + '已读', 'chat');
                        redisRememberRecord(sqlMessage, data.to, true);
                    } else {
                        addLog(loginUserId + ' send a message type = user,msg_id = ' + data.msg_id　 + '　to ' + 　data.to + '已读', 'chat');
                        redisRememberRecord(sqlMessage, data.to);
                    }
                });
                //通知客户端消息已经成功到达服务端
                fn(data);
            } else { //客户端离线
                sqlMessage.msg = data.msg;
                redisRememberRecord(sqlMessage, data.to);
                addLog(loginUserId + ' send a message type = user,msg_id = ' + data.msg_id　 + '　to ' + 　data.to + '离线消息');
                //通知客户端消息已经成功到达服务端
                fn(data);
            };
        }
        //群组消息
        else if (type == 'personal_group' || type == 'public_group') {
            var groupId = 'personal_group_' + data.group_id;
            var groupInfo = {
                creator: fromUser,
                msg: CryptoJS.AES.encrypt(data.msg, encryptKey).toString(),
                time: data.time,
                userTime: moment().format("YYYY-MM-DD HH:mm:ss"),
                msg_type: data.msg_type,
                type: type,
                info: data.info,
                fromDetail: data.fromDetail,
                group_id: data.group_id,
                send_time: data.send_time,
                msg_id: data.msg_id,
                download: data.download,
                file_type: data.file_type || '',
            };
            getNameById(fromUser).then((loginUser) => {
                publishRedis.publish('eoffice-chat-channel', JSON.stringify({
                    message: data.msg,
                    to: data.info.group_member.join(','),
                    from: loginUser['user_name']
                }))
            })
            io.to(groupId).emit("group message", groupInfo);
            groupInfo.msg = data.msg;
            //保存消息到数据服务器
            groupInfo.info = JSON.stringify(data.info);
            groupInfo.fromDetail = JSON.stringify(data.fromDetail);
            //存储到redis
            redisRememberRecord(groupInfo);
            addLog(loginUserId + ' send a message type = group, groupid = ' + data.group_id + ', msg_id = ' + data.msg_id, 'group');
            fn(data);
        }
    });
    //@或者提到
    socket.on('metion', function(data) {
        var fromUser = data.from,
            dataState = data.state;
        if (!fromUser || 　!dataState) {
            return
        };
        data.time = new Date().getTime();
        if (dataState.name) {
            data.metionType = dataState.name.split('.')[0];
        }
        //提到了你
        if (data.metionUserId && data.metionUserId.length && data.metionUserId.length > 0) {
            var messageInfo = {
                    creator: fromUser,
                    msg: data.content,
                    time: data.time,
                    msg_type: 'metion',
                    type: 'user',
                    download: dataState,
                    file_type: data.metionType || 'cooperation',
                    send_time: data.sendTime || new Date().getTime(),
                    msg_id: data.msgId || new Date().getTime(),
                    haveread: 0
                },
                haveSendArray = [];
            data.metionUserId.forEach((value, index) => {
                if (haveSendArray.indexOf(value) < 0) { //@2次的情况下只发送一次
                    haveSendArray.push(value);
                    if (clients[value]) {
                        isOnline = true;
                        var trueMessage = {};
                        for (let key in messageInfo) {
                            if (key === "msg") {
                                trueMessage[key] = CryptoJS.AES.encrypt(messageInfo[key], encryptKey).toString();
                            } else {
                                trueMessage[key] = messageInfo[key];
                            }
                        }
                        clients[value].emit('private message', trueMessage, (info) => {
                            //消息已经成功发送到客户端
                            if (info && clients[fromUser]) {
                                //成功回执
                                clients[fromUser].emit("acknowledge", true);
                            };
                            if (info === 'havRead') {
                                addLog(loginUserId + ' send a message type = user,msg_id = ' + data.msg_id + '　to ' + 　data.to + '已读', 'chat');
                                redisRememberRecord(messageInfo, value, true);
                            } else {
                                addLog(loginUserId + ' send a message type = user,msg_id = ' + data.msg_id + '　to ' + 　data.to + '在线未读', 'chat');
                                redisRememberRecord(messageInfo, value);
                            }
                        });
                    } else {
                        //不在线
                        redisRememberRecord(messageInfo, value);
                    }
                    clients[fromUser].emit("metion callback", {
                        beSender: value,
                        info: messageInfo
                    });
                    addLog(loginUserId + ' send a metion message,msg_id = ' + data.msg_id + 'to ' + value, 'success');
                }
            })
        }
    })
    //更新已读信息的msg_id
    socket.on('update havRead', function(data) {
        setChatRecordMark(data);
    });
    //获取聊天记录
    socket.on('get record', function(data, fn) {
        if (data.type === 'user') {
            getPersonalRecord(data, fn);
        } else if (data.type === 'personal_group') {
            getOneGrouPrecord(data, fn, loginUserId);
        }
    })
    //获取历史条数
    socket.on('get historyLength', function(data, fn) {
        if (data.type === "user") {
            getPersonLength(data, fn);
        } else {
            getGroupLength(data, fn, loginUserId);
        }
    })
    //获取附近几条信息
    socket.on('get recentRecord', function(data, fn) {
        if (data.type === "user") {
            getPersonRecent(data, fn);
        } else {
            getGroupRecent(data, fn, loginUserId);
        }
    })
    //获取聊天中所有的图片
    socket.on('get imageRecord', function(data, fn) {
        if (data.type === "user") {
            getPersonFile(data, fn, data.fileType);
        } else {
            getGroupFile(data, fn, loginUserId);
        }
    })
    //断开连接
    socket.on('disconnect', function() {
        var socketId = socket.id,
            userId = socketIds[socketId];
        outRedis(loginUserId);
        delete clients[userId];
        delete socketIds[socketId];
        //更新在线人员
        io.emit('onlineUsers', Object.keys(clients));
    });
});
class groupFunctionArray {
    constructor() {};
    getJoinTime(data, loginUserId) {
        return new Promise((resolve, reject) => {
            publishRedis.hgetall("join_group_time", function(err, timeResult) {
                var joinTime = timeResult[data.id + '_' + loginUserId];
                if (!joinTime) {
                    joinTime = 0;
                }
                resolve(joinTime);
            })
        })
    };
    getSql(selectSQL) {
        return new Promise((resolve, reject) => {
            pool.getConnection(function(err, connection) {
                if (err) {
                    console.log(err);
                };
                connection.query(selectSQL, (error, rows) => {
                    if (error) {
                        addLog('_error_' + selectSQL);
                    };
                    resolve(rows);
                });
                connection.release();
            })
        })
    };
    getRedis(data, joinTime) {
        return new Promise((resolve, reject) => {
            publishRedis.hgetall("group_chat_record", function(err, result) {
                let rows = [];
                for (var key in result) {
                    result[key] = JSON.parse(result[key]);
                    result[key].chat_object = key.split('_')[0];
                    if (result[key].chat_object === data.id && result[key].time > joinTime) {
                        rows.push(result[key]);
                    }
                };
                resolve(rows);
            })
        })
    };
    getRedisString(selectSQL) {
        return new Promise((resolve, reject) => {
            publishRedis.hgetall(selectSQL, function(err, result) {
                resolve(result);
            })
        })
    }
}
class sqlFormat extends groupFunctionArray {
    constructor(getJoinTime, getSql, getRedis, getRedisString) {
        super(getJoinTime, getSql, getRedis, getRedisString);
    };
    selectFromSql(tableName, condition) {
        let condi = " WHERE ",
            selectSql = "SELECT * FROM " + tableName;
        for (let key in condition) {
            condi = condi + ' ' + key + ' ' + condition[key];
        };
        return super.getSql(selectSql + condi);
    };
    getLengthOfTable(tableName, condition) {
        let condi = " WHERE ",
            selectSql = "SELECT count(*) FROM " + tableName;
        for (let key in condition) {
            condi = condi + ' ' + key + ' ' + condition[key];
        };
        return super.getSql(selectSql + condi);
    }
    insertToSql(tableName, data) {
        let selectSql = "INSERT INTO " + tableName;
        if (Array.isArray(data)) {
            let condiArray = ' (' + Object.keys(data[0]).join(',') + ') VALUES ',
                dataArrayValue = '',
                dataLength = data.length;
            data.forEach((value, index) => {
                if (index !== dataLength - 1) {
                    dataArrayValue = dataArrayValue + getData(value) + ','
                } else {
                    dataArrayValue += getData(value);
                }
            });
            return super.getSql(selectSql + condiArray + dataArrayValue);
        } else {
            let condiArray = ' (' + Object.keys(data).join(',') + ') VALUES';
            return super.getSql(selectSql + condiArray + getData(data));
        }

        function getData(value) {
            // body...
            let condiArray = Object.keys(value),
                condi = ' (';
            condiArray.forEach((key, index, valuearray) => {
                let dataValue ;
                if(value[key] && typeof value[key].replace === 'function'){
                    dataValue = value[key].replace(/"/g, '\"').replace(/'/g, "\'");
                }else{
                    dataValue = value[key];
                }
                if (index !== valuearray.length - 1) {
                    condi = condi + "'" + dataValue + "',";
                } else {
                    condi = condi + "'" + dataValue + "'";
                }
            });
            return condi + ')';
        }
    }
    createTable(tableName, condition) {
        let basic = "CREATE TABLE IF NOT EXISTS " + tableName,
            condi = '(',
            keyArray = Object.keys(condition);
        keyArray.forEach((value, index) => {
            if (index === keyArray.length - 1) {
                condi = condi + value + ' ' + condition[value];
            } else {
                condi = condi + 　value + ' ' + condition[value] + ',';
            }
        });
        return super.getSql(basic + ' ' + condi + ')');
    }
    deleteFromSql(tableName, condition) {
        let condi = " WHERE ",
            selectSql = "DELETE FROM " + tableName;
        for (let key in condition) {
            condi = condi + ' ' + key + ' ' + condition[key];
        };
        return super.getSql(selectSql + condi);
    };
    updateToSql(tableName, data, condition) {
        let condi = " WHERE ",
            selectSql = "UPDATE " + tableName + ' SET ',
            dataValue = '',
            dateArray = Object.keys(data);
        dateArray.forEach((value, index) => {
            if (index === dateArray.length - 1) {
                dataValue = dataValue + value + '="' + data[value] + '"'
            } else {
                dataValue = dataValue + value + '="' + data[value] + '",'
            }
        })
        for (let key in condition) {
            condi = condi + ' ' + key + ' ' + condition[key];
        };
        return super.getSql(selectSql + dataValue + condi);
    }
    dropTable(tableName) {
        let selectSql = 'DROP TABLE ' + tableName;
        return super.getSql(selectSql);
    }
}
//获取群组附近信息
function getGroupRecent(data, fn, loginUserId) {
    var functionArray = new sqlFormat(),
        getJoinTime = functionArray.getJoinTime,
        getRedis = functionArray.getRedis,
        selectFromSql = functionArray.selectFromSql,
        createTable = functionArray.createTable;
    var sqlSearchId = data.id.replace(/\-/g, '_'),
        tableName = 'chat_group_record_' + sqlSearchId,
        sqlString = createTableString;
    getJoinTime(data, loginUserId).then((joinTime) => {
        getRedis(data, joinTime).then((redisArray) => {
            let idArray = redisArray.map(value => value.msg_id);
            if (idArray.indexOf(data.msgId) < 0) {
                createTable(tableName, sqlString).then(() => {
                    //redis里没有
                    let recentArray = [];
                    //前5条
                    getRecent(data, 'DESC', joinTime).then(preRows => {
                        recentArray = recentArray.concat(preRows);
                        //后5条
                        getRecent(data, 'ASC', joinTime).then(nextRows => {
                            if (nextRows.length < 5 && redisArray.length > 0) {
                                redisArray.forEach(value => {
                                    if (nextRows.length < 5) {
                                        nextRows.push(value);
                                    }
                                })
                            };
                            recentArray = recentArray.concat(nextRows);
                            recentArray = dealwithRows(recentArray);
                            fn(recentArray);
                        })
                    })
                })
            } else if (idArray.indexOf(data.msgId) >= 5) {
                let msgIdx = idArray.indexOf(data.msgId) - 5,
                    recentArray = [];
                redisArray.forEach((value, index) => {
                    if (index >= msgIdx && recentArray.length <= 11) {
                        recentArray.push(value);
                    }
                })
                recentArray = dealwithRows(recentArray);
                fn(recentArray);
            } else {
                createTable(tableName, sqlString).then(() => {
                    let msgIdx = idArray.indexOf(data.msgId) + 5,
                        recentArray = [];
                    redisArray.forEach((value, index) => {
                        if (index <= msgIdx) {
                            recentArray.push(value);
                        }
                    });
                    //前5条
                    getRecent(data, 'DESC', joinTime).then(preRows => {
                        recentArray = preRows.concat(recentArray);
                        while (recentArray.length > 11) {
                            recentArray.shift();
                        }
                        recentArray = dealwithRows(recentArray);
                        fn(recentArray);
                    })
                })
            }
        })
    })

    function getRecent(data, order, joinTime) { //取mysql里的数据
        var condition;
        if (order === "DESC") {
            condition = {
                'msg_id': ' > ' + joinTime + ' AND ',
                'time': ' <= "' + +data.msgId + '" ',
                'ORDER': 'BY time DESC LIMIT 6'
            }
        } else if (order === "ASC") {
            condition = {
                'msg_id': ' > ' + joinTime + ' AND ',
                'time': ' > "' + +data.msgId + '" ',
                'ORDER': 'BY time ASC LIMIT 5'
            }
        };
        return selectFromSql(tableName, condition);
    };

    function dealwithRows(rows) {
        if (rows.length > 0) {
            rows.sort((first, sencond) => {
                return sencond.time - first.time;
            });
            rows.forEach((value) => {
                value.userTime = moment(value.userTime).format("YYYY-MM-DD HH:mm:ss")
                value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString();
                if (typeof value.fromDetail === "string") {
                    value.fromDetail = JSON.parse(value.fromDetail);
                }
                if (typeof value.info === "string") {
                    value.info = JSON.parse(value.info);
                }
            })
        };
        return rows;
    }
}
//获取群组信息条数
function getGroupLength(data, fn, loginUserId) {
    var functionArray = new sqlFormat(),
        getJoinTime = functionArray.getJoinTime,
        getRedis = functionArray.getRedis,
        selectFromSql = functionArray.selectFromSql,
        createTable = functionArray.createTable,
        getLengthOfTable = functionArray.getLengthOfTable;
    var sqlSearchId = data.id.replace(/\-/g, '_'),
        tableName = 'chat_group_record_' + sqlSearchId,
        sqlString = createTableString;
    getJoinTime(data, loginUserId).then((joinTime) => {
        var selectSQL = {
            'msg_id': ' >' + joinTime
        };
        createTable(tableName, sqlString).then(() => {
            getLengthOfTable(tableName, selectSQL).then((rows) => {
                getRedis(data, joinTime).then((redisArray) => {
                    var number = 0;
                    if (rows[0] && rows[0]['count(*)']) {
                        number += parseInt(rows[0]['count(*)'], 10);
                    };
                    number += redisArray.length;
                    fn(number);
                })
            })
        })
    })
}
//获取单个群组的聊天记录
function getOneGrouPrecord(data, fn, loginUserId) {
    var functionArray = new sqlFormat(),
        getJoinTime = functionArray.getJoinTime,
        getRedis = functionArray.getRedis,
        selectFromSql = functionArray.selectFromSql,
        createTable = functionArray.createTable;
    /*
    data.from
    data.limit
    data.to
    data.type
    data.keyword
    data.getRecordType
    */
    addLog(loginUserId + '获取群组记录开始');
    if (!data) {
        return;
    } else if (data.getRecordType === "string") {
        getString(data);
    } else if (data.getRecordType === "time") {
        getTimeRange(data);
    } else if (!data.getRecordType) {
        getUsualRecord(data);
    } else if (data.getRecordType === "both") {
        getBoth(data);
    };
    var sqlSearchId = data.id.replace(/\-/g, '_'),
        tableName = 'chat_group_record_' + sqlSearchId,
        sqlString = createTableString;

    function dealwithRows(rows) {
        if (rows.length > 0) {
            rows.sort((first, sencond) => {
                return sencond.time - first.time;
            });
            rows.forEach((value) => {
                value.userTime = moment(value.time).format("YYYY-MM-DD HH:mm:ss");
                value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString();
                if (typeof value.fromDetail === "string") {
                    value.fromDetail = JSON.parse(value.fromDetail);
                }
                if (typeof value.info === "string") {
                    value.info = JSON.parse(value.info);
                }
            })
        };
        return rows;
    }

    function getUsualRecord(data) {
        getJoinTime(data, loginUserId).then((joinTime) => {
            var selectSQL = {
                'msg_id': ' >' + joinTime,
                'ORDER': ' BY `time` DESC ',
                'LIMIT': ' ' + data.limit
            };
            createTable(tableName, sqlString).then(() => {
                selectFromSql(tableName, selectSQL).then((rows) => {
                    getRedis(data, joinTime).then((redisArray) => {
                        rows = rows.concat(redisArray);
                        rows = dealwithRows(rows);
                        addLog(loginUserId + '获取群组记录' + rows.length + '条');
                        if (rows.length >= data.limit) {
                            rows = rows.slice(0, data.limit);
                            fn(rows, true);
                        } else {
                            fn(rows, false);
                        };
                    })
                })
            })
        })
    }

    function getString(data) {
        getJoinTime(data, loginUserId).then((joinTime) => {
            var selectSQL = {
                'msg_id': ' > ' + joinTime + ' AND ',
                'msg': ' LIKE "\%' + data.keyword + '\%" ',
                'ORDER': ' BY `time` DESC '
            };
            createTable(tableName, sqlString).then(() => {
                selectFromSql(tableName, selectSQL).then((rows) => {
                    getRedis(data, joinTime).then((redisArray) => {
                        redisArray.forEach(value => {
                            if (value.msg.indexOf(data.keyword) >= 0) {
                                rows.push(value);
                            }
                        })
                        rows = dealwithRows(rows);
                        fn(rows, false);
                    })
                })
            })
        })
    }

    function getTimeRange(data) {
        if (!data.keyword) {
            fn([]);
            return;
        }
        var timeArray = data.keyword.split(','),
            startTime, endTime;
        if (timeArray[0] > timeArray[1]) {
            startTime = parseInt(timeArray[1], 10);
            endTime = parseInt(timeArray[0], 10);
        } else {
            startTime = parseInt(timeArray[0], 10);
            endTime = parseInt(timeArray[1], 10);
        };
        getJoinTime(data, loginUserId).then((joinTime) => {
            var selectSQL = {
                'msg_id': ' > ' + joinTime + ' AND ',
                'time >=': ' "' + startTime + '" AND ',
                'time <=': ' "' + endTime + '" '
            };
            createTable(tableName, sqlString).then(() => {
                selectFromSql(tableName, selectSQL).then((rows) => {
                    getRedis(data, joinTime).then((redisArray) => {
                        if (redisArray.length > 0) {
                            redisArray.forEach(value => {
                                if (value.time >= startTime && value.time <= endTime) {
                                    rows.push(value);
                                };
                            })
                        };
                        rows = dealwithRows(rows);
                        fn(rows, false);
                    })
                })
            })
        })
    }

    function getBoth(data) {
        var keywordTime = data.keyword.split('_~')[0],
            keywordString = data.keyword.split('_~')[1],
            timeArray = keywordTime.split(','),
            startTime, endTime;
        if (timeArray[0] > timeArray[1]) {
            startTime = parseInt(timeArray[1], 10);
            endTime = parseInt(timeArray[0], 10);
        } else {
            startTime = parseInt(timeArray[0], 10);
            endTime = parseInt(timeArray[1], 10);
        };
        getJoinTime(data, loginUserId).then((joinTime) => {
            var selectSQL = {
                'msg_id': ' > ' + joinTime + ' AND ',
                'msg': ' LIKE "\%' + keywordString + '\%" AND',
                'time >=': ' "' + startTime + '" AND ',
                'time <=': ' "' + endTime + '" ',
                'ORDER': ' BY `time` DESC ',
            };
            createTable(tableName, sqlString).then(() => {
                selectFromSql(tableName, selectSQL).then((rows) => {
                    getRedis(data, joinTime).then((redisArray) => {
                        if (redisArray.length > 0) {
                            redisArray.forEach(value => {
                                if (value.time >= startTime && value.time <= endTime && value.msg.indexOf(keywordString) >= 0) {
                                    rows.push(value);
                                };
                            })
                        };
                        rows = dealwithRows(rows);
                        fn(rows, false);
                    })
                })
            })
        })
    }
}
//获取群组的图片和文件
function getGroupFile(data, fn, loginUserId) {
    var functionArray = new sqlFormat(),
        getJoinTime = functionArray.getJoinTime,
        getRedis = functionArray.getRedis,
        selectFromSql = functionArray.selectFromSql,
        createTable = functionArray.createTable;
    fileType = data['fileType'] || "img";
    var sqlSearchId = data.id.replace(/\-/g, '_'),
        tableName = 'chat_group_record_' + sqlSearchId,
        sqlString = createTableString;

    function dealwithRows(rows) {
        if (rows.length > 0) {
            rows.sort((first, sencond) => {
                return sencond.send_time - first.send_time;
            });
            rows.forEach((value) => {
                value.userTime = moment(value.userTime).format("YYYY-MM-DD HH:mm:ss")
                value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString();
                if (typeof value.fromDetail === "string") {
                    value.fromDetail = JSON.parse(value.fromDetail);
                }
                if (typeof value.info === "string") {
                    value.info = JSON.parse(value.info);
                }
            })
        };
        return rows;
    };
    getJoinTime(data, loginUserId).then((joinTime) => {
        var selectSQL = {
            'msg_id': ' >' + joinTime + ' AND ',
            'msg_type': ' = "' + fileType + '"'
        };
        createTable(tableName, sqlString).then(() => {
            selectFromSql(tableName, selectSQL).then((rows) => {
                getRedis(data, joinTime).then((redisArray) => {
                    redisArray.forEach(value => {
                        if (value.msg_type === fileType) {
                            rows.push(value);
                        }
                    });
                    rows = dealwithRows(rows);
                    fn(rows, false);
                })
            })
        })
    })
}
//获取个人所有的图片
function getPersonFile(data, fn, fileType) {
    let promisAarray = new personPromiseArray(data),
        redisPromise = promisAarray.redisPromise(),
        imageArray = [];
    fileType = fileType || data['fileType'];
    var functionArray = new sqlFormat(),
        selectFromSql = functionArray.selectFromSql,
        getRedisString = functionArray.getRedisString;

    function getMark(data) {
        let selectMark = {
            'FIND_IN_SET': '("' + data.from + '",`creator`) AND ',
            'FIND_IN_SET(': '"' + data.to + '",`creator`)'
        }
        var thisPromise = new Promise((resolve, reject) => {
            selectFromSql('chat_personal_record_mark', selectMark).then(rows => {
                if (rows && rows.length > 0) {
                    resolve(rows[0].time);
                } else {
                    resolve('noneMark');
                }
            })
        })
        return thisPromise;
    };
    getMark(data).then(mark => {
        if (mark === 'noneMark') {
            redisPromise.then(redisArray => {
                if (redisArray.length > 0) {
                    redisArray.forEach(value => {
                        if (value.msg_type === fileType) {
                            imageArray.push(value);
                        }
                    })
                }
                imageArray.forEach(value => value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString())
                fn(imageArray);
            })
        } else {
            var selectSQL = {
                'FIND_IN_SET': '("' + data.from + '",`chat_object`) AND ',
                'FIND_IN_SET(': '"' + data.to + '",`chat_object`) AND ',
                'msg_type': '="' + fileType + '"'
            };
            selectFromSql('chat_personal_record_' + mark, selectSQL).then(rows => {
                imageArray = imageArray.concat(rows);
                redisPromise.then(redisArray => {
                    if (redisArray.length > 0) {
                        redisArray.forEach(value => {
                            if (value.msg_type === fileType) {
                                imageArray.push(value);
                            }
                        })
                    }
                    imageArray.forEach(value => value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString())
                    fn(imageArray);
                })
            })
        }
    })
}

function personPromiseArray(data) {
    this.redisPromise = function() {
        return new Promise((resolve, reject) => {
            publishRedis.hgetall("personal_chat_record", (err, result) => {
                if (err) {
                    reject(rows);
                }
                var rows = [];
                for (var key in result) {
                    result[key] = JSON.parse(result[key]);
                    result[key].chat_object = key.split('_')[0];
                    if (result[key].chat_object.indexOf(data.from) >= 0 && result[key].chat_object.indexOf(data.to) >= 0) {
                        rows.push(result[key]);
                    }
                };
                rows.sort((first, sencond) => first - sencond);
                resolve(rows);
            })
        });
    };
    return this;
}
//获取个人信息条数
function getPersonLength(data, fn) {
    let promisAarray = new personPromiseArray(data),
        redisPromise = promisAarray.redisPromise();
    var functionArray = new sqlFormat(),
        selectFromSql = functionArray.selectFromSql,
        getLengthOfTable = functionArray.getLengthOfTable;

    function getMark(data) {
        let selectMark = {
            'FIND_IN_SET': '("' + data.from + '",`creator`) AND ',
            'FIND_IN_SET(': '"' + data.to + '",`creator`)'
        }
        var thisPromise = new Promise((resolve, reject) => {
            selectFromSql('chat_personal_record_mark', selectMark).then(rows => {
                if (rows && rows.length > 0) {
                    resolve(rows[0].time);
                } else {
                    resolve('noneMark');
                }
            })
        })
        return thisPromise;
    };
    getMark(data).then(mark => {
        if (mark === 'noneMark') {
            redisPromise.then(function(redisArray) {
                fn(redisArray.length)
            })
        } else {
            var selectSQL = {
                    'FIND_IN_SET': '("' + data.from + '",`chat_object`) AND ',
                    'FIND_IN_SET(': '"' + data.to + '",`chat_object`)'
                },
                number = 0;
            getLengthOfTable('chat_personal_record_' + mark, selectSQL).then(rows => {
                if (rows[0] && rows[0]['count(*)']) {
                    number += parseInt(rows[0]['count(*)'], 10);
                };
                redisPromise.then(function(redisArray) {
                    fn(parseInt(redisArray.length, 10) + number);
                })
            })
        }
    });
}
//获取个人附近信息
function getPersonRecent(data, fn) {
    let promisAarray = new personPromiseArray(data),
        redisPromise = promisAarray.redisPromise();
    var functionArray = new sqlFormat(),
        selectFromSql = functionArray.selectFromSql,
        getRedisString = functionArray.getRedisString;

    function getMark(data) {
        let selectMark = {
            'FIND_IN_SET': '("' + data.from + '",`creator`) AND ',
            'FIND_IN_SET(': '"' + data.to + '",`creator`)'
        }
        var thisPromise = new Promise((resolve, reject) => {
            selectFromSql('chat_personal_record_mark', selectMark).then(rows => {
                if (rows && rows.length > 0) {
                    resolve(rows[0].time);
                } else {
                    resolve('noneMark');
                }
            })
        })
        return thisPromise;
    };

    function getRecent(data, order) { //取mysql里的数据
        return new Promise((resolve, reject) => {
            getMark(data).then(mark => {
                var selectSQL = {
                    'FIND_IN_SET': '("' + data.from + '",`chat_object`) AND ',
                    'FIND_IN_SET(': '"' + data.to + '",`chat_object`) AND ',
                }
                if (order === "DESC") {
                    selectSQL['msg_id'] = '<="' + data.msgId + '"';
                    selectSQL['ORDER'] = 'BY time DESC LIMIT 6';
                } else if (order === "ASC") {
                    selectSQL['msg_id'] = '>"' + data.msgId + '"';
                    selectSQL['ORDER'] = 'BY time ASC LIMIT 5';
                };
                selectFromSql('chat_personal_record_' + mark, selectSQL).then(rows => {
                    resolve(rows);
                })
            })
        })
    };
    redisPromise.then((redisArray) => {
        let idArray = redisArray.map(value => value.msg_id);
        if (idArray.indexOf(data.msgId) < 0) {
            let recentArray = [];
            //前5条
            getRecent(data, 'DESC').then(preRows => {
                recentArray = recentArray.concat(preRows);
                //后5条
                getRecent(data, 'ASC').then(nextRows => {
                    if (nextRows.length < 5 && redisArray.length > 0) {
                        redisArray.forEach(value => {
                            if (nextRows.length < 5) {
                                nextRows.push(value);
                            }
                        })
                    };
                    recentArray = recentArray.concat(nextRows);
                    recentArray.forEach(value => value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString())
                    fn(recentArray);
                })
            })
        } else if (idArray.indexOf(data.msgId) >= 5) {
            let msgIdx = idArray.indexOf(data.msgId) - 5,
                recentArray = [];
            redisArray.forEach((value, index) => {
                if (index >= msgIdx && recentArray.length <= 11) {
                    recentArray.push(value);
                }
            })
            recentArray.forEach(value => value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString())
            fn(recentArray);
        } else {
            let msgIdx = idArray.indexOf(data.msgId) + 5,
                recentArray = [];
            redisArray.forEach((value, index) => {
                if (index <= msgIdx) {
                    recentArray.push(value);
                }
            });
            //前5条
            getRecent(data, 'DESC').then(preRows => {
                recentArray = preRows.concat(recentArray);
                while (recentArray.length > 11) {
                    recentArray.shift();
                }
                recentArray.forEach(value => value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString())
                fn(recentArray);
            }).catch(() => {
                recentArray.forEach(value => value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString())
                fn(recentArray);
            })
        }
    });
}
/**
 * 将用户加入群组
 * @param  {[type]} userInfo [description]
 * @param  {[type]} socket   [description]
 * @return {[type]}          [description]
 */
function joinGroup(userInfo, socket) {
    var functionArray = new sqlFormat(),
        selectFromSql = functionArray.selectFromSql,
        getRedisString = functionArray.getRedisString;
    var userId = userInfo.userId,
        deptId = userInfo.deptId,
        roleId = userInfo.roleId;
    //群组命名规则 群组类别_group_群组ID
    //个人组
    publishRedis.hgetall("chat_record_mark", function(err, result) {
        var recordTime = result,
            joinTime;
        publishRedis.hgetall("join_group_time", function(err, timeResult) {
            joinTime = timeResult;
            var selectSQL = {
                'creator': '= "' + userId + '" OR',
                'FIND_IN_SET': '("' + userId + '",`members`)'
            };
            selectFromSql('chat_group', selectSQL).then(rows => {
                if (!rows) {
                    return;
                };
                var myGroup = [],
                    allGroup = {};
                for (var i = 0; i < rows.length; i++) {
                    socket.join("personal_group_" + rows[i]['id']);
                    if (rows[i].creator === userId) {
                        myGroup.push(rows[i]);
                    };
                };
                allGroup.myGroup = myGroup;
                allGroup.group = rows;
                socket.emit('send myGroup', allGroup);
            })
        })
    });
}
//获取个人聊天记录
function getPersonalRecord(info, fn) {
    /*
    info.from
    info.limit
    lnfo.to
    info.type
    info.keyword
    info.getRecordType
    */
    addLog(info.from + '获取个人记录开始');
    var promisAarray = new personPromiseArray(info),
        redisPromise = promisAarray.redisPromise();
    var functionArray = new sqlFormat(),
        selectFromSql = functionArray.selectFromSql,
        getRedisString = functionArray.getRedisString;
    if (!info) {
        return;
    } else if (info.getRecordType === "string") {
        getString(info);
    } else if (info.getRecordType === "time") {
        getTimeRange(info);
    } else if (!info.getRecordType) {
        getUsualRecord(info);
    } else if (info.getRecordType === "both") {
        getBoth(info);
    };

    function getMark(data) {
        let selectMark = {
            'FIND_IN_SET': '("' + data.from + '",`creator`) AND ',
            'FIND_IN_SET(': '"' + data.to + '",`creator`)'
        }
        var thisPromise = new Promise((resolve, reject) => {
            selectFromSql('chat_personal_record_mark', selectMark).then(rows => {
                if (rows && rows.length > 0) {
                    resolve(rows[0].time);
                } else {
                    resolve('noneMark');
                }
            })
        })
        return thisPromise;
    };

    function getString(data) {
        redisPromise.then(function(redisArray) {
            var trueArray = [];
            if (redisArray.length > 0) {
                redisArray.forEach(value => {
                    if (value.chat_object.indexOf(data.keyword) >= 0) {
                        trueArray.push(value);
                    };
                })
            };
            getMark(data).then(mark => {
                if (mark === 'noneMark') {
                    var rows = trueArray;
                    if (rows.length > 0) {
                        rows.sort((first, sencond) => {
                            return first.send_time - sencond.send_time;
                        }, 0)
                        rows.forEach(value => value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString())
                    }
                    fn(rows, false);
                } else {
                    var selectSQL = {
                        'FIND_IN_SET': '("' + data.from + '",`chat_object`) AND ',
                        'FIND_IN_SET(': '"' + data.to + '",`chat_object`) AND ',
                        'msg': ' LIKE "\%' + data.keyword + '\%" ',
                        'ORDER': 'BY `time` DESC'
                    };
                    selectFromSql('chat_personal_record_' + mark, selectSQL).then(rows => {
                        rows = rows.concat(trueArray);
                        if (rows.length > 0) {
                            rows.sort((first, sencond) => {
                                return sencond.send_time - first.send_time;
                            }, 0)
                            rows.forEach(value => value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString())
                        }
                        fn(rows, false);
                    })
                }
            })
        })
    }

    function getTimeRange(data) {
        if (!data.keyword) {
            fn([]);
            return;
        }
        var timeArray = data.keyword.split(','),
            startTime, endTime;
        if (timeArray[0] > timeArray[1]) {
            startTime = parseInt(timeArray[1], 10);
            endTime = parseInt(timeArray[0], 10);
        } else {
            startTime = parseInt(timeArray[0], 10);
            endTime = parseInt(timeArray[1], 10);
        };
        redisPromise.then(function(redisArray) {
            var trueArray = [];
            if (redisArray.length > 0) {
                redisArray.forEach(value => {
                    if (value.time >= startTime && value.time <= endTime) {
                        trueArray.push(value);
                    };
                })
            };
            getMark(data).then(mark => {
                if (mark === 'noneMark') {
                    let rows = trueArray;
                    if (rows.length > 0) {
                        rows.sort((first, sencond) => {
                            return first.send_time - sencond.send_time;
                        }, 0)
                        rows.forEach(value => value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString())
                    }
                    fn(rows, false);
                } else {
                    var selectSQL = {
                        'FIND_IN_SET': '("' + data.from + '",`chat_object`) AND ',
                        'FIND_IN_SET(': '"' + data.to + '",`chat_object`) AND ',
                        'time >=': ' "' + startTime + '" AND ',
                        'time <=': ' "' + endTime + '" ',
                        'ORDER': 'BY `time` DESC'
                    };
                    selectFromSql('chat_personal_record_' + mark, selectSQL).then(rows => {
                        rows = rows.concat(trueArray);
                        if (rows.length > 0) {
                            rows.sort((first, sencond) => {
                                return sencond.send_time - first.send_time;
                            }, 0)
                            rows.forEach(value => value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString())
                        }
                        fn(rows, false);
                    })
                }
            })
        });
    }

    function getUsualRecord(data) {
        getMark(data).then(mark => {
            if (mark === 'noneMark') {
                var rows = [];
                redisPromise.then(function(redisArray) {
                    rows = rows.concat(redisArray);
                    if (rows.length !== 0) {
                        rows.sort((first, sencond) => {
                            return first.send_time - sencond.send_time;
                        }, 0)
                        rows.forEach(value => value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString())
                    }
                    if (rows.length >= data.limit) {
                        rows = rows.slice(rows.length - data.limit);
                        fn(rows, true);
                    } else {
                        fn(rows, false);
                    }
                })
            } else {
                var selectSQL = {
                    'FIND_IN_SET': '("' + data.from + '",`chat_object`) AND ',
                    'FIND_IN_SET(': '"' + data.to + '",`chat_object`) ',
                    'ORDER': 'BY `time` DESC',
                    'LIMIT': data.limit,
                };
                selectFromSql('chat_personal_record_' + mark, selectSQL).then(rows => {
                    console.log('数据库信息条数=' + rows.length);
                    redisPromise.then(function(redisArray) {
                        rows = rows.concat(redisArray);
                        if (rows.length !== 0) {
                            rows.sort((first, sencond) => {
                                return first.send_time - sencond.send_time;
                            }, 0)
                            rows.forEach(value => value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString())
                        }
                        addLog(data.from + '获取个人记录' + rows.length + '条');
                        if (rows.length >= data.limit) {
                            rows = rows.slice(rows.length - data.limit);
                            fn(rows, true);
                        } else {
                            fn(rows, false);
                        }
                    })
                })
            }
        })
    }

    function getBoth(data) {
        var keywordTime = data.keyword.split('_~')[0],
            keywordString = data.keyword.split('_~')[1],
            timeArray = keywordTime.split(','),
            startTime, endTime;
        if (timeArray[0] > timeArray[1]) {
            startTime = parseInt(timeArray[1], 10);
            endTime = parseInt(timeArray[0], 10);
        } else {
            startTime = parseInt(timeArray[0], 10);
            endTime = parseInt(timeArray[1], 10);
        };
        redisPromise.then(function(redisArray) {
            var trueArray = [];
            if (redisArray.length > 0) {
                redisArray.forEach(value => {
                    if (value.chat_object.indexOf(keywordString) >= 0) {
                        if (value.time >= startTime && value.time <= endTime) {
                            trueArray.push(value);
                        }
                    };
                })
            };
            getMark(data).then(mark => {
                if (mark === 'noneMark') {
                    let rows = trueArray;
                    if (rows.length > 0) {
                        rows.sort((first, sencond) => {
                            return first.send_time - sencond.send_time;
                        }, 0)
                        rows.forEach(value => value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString())
                    }
                    fn(rows, false);
                } else {
                    var selectSQL = {
                        'FIND_IN_SET': '("' + data.from + '",`chat_object`) AND ',
                        'FIND_IN_SET(': '"' + data.to + '",`chat_object`) AND ',
                        'msg': ' LIKE "\%' + keywordString + '\%" AND',
                        'time >=': ' "' + startTime + '" AND ',
                        'time <=': ' "' + endTime + '" ',
                        'ORDER': 'BY `time` DESC'
                    };
                    selectFromSql('chat_personal_record_' + mark, selectSQL).then(rows => {
                        rows = rows.concat(trueArray);
                        if (rows.length > 0) {
                            rows.sort((first, sencond) => {
                                return sencond.send_time - first.send_time;
                            }, 0)
                            rows.forEach(value => value.msg = CryptoJS.AES.encrypt(value.msg, encryptKey).toString())
                        }
                        fn(rows, false);
                    })
                }
            })
        });
    }
}

function getGroupRecord(userInfo, socket) {
    var userId = userInfo;
    var functionArray = new sqlFormat(),
        getRedisString = functionArray.getRedisString,
        selectFromSql = functionArray.selectFromSql,
        updateToSql = functionArray.updateToSql;
    publishRedis.hgetall("chat_record_mark", function(err, result) {
        var recordTime = result,
            joinTime;
        publishRedis.hgetall("join_group_time", function(err, timeResult) {
            joinTime = timeResult;
            var selectSQL = {
                'creator':' ="' + userId + '" OR',
                'FIND_IN_SET':'("' + userId + '",`members`)'
            };
            selectFromSql('chat_group',selectSQL).then( (rows) => {
                if (!rows || rows.length === 0) {
                    return;
                };
                var myGroup = [],
                    allGroup = {},
                    rowsLength = rows.length;
                for (var i = 0; i < rowsLength; i++) {
                    if (rows[i].creator === userId) {
                        myGroup.push(rows[i]);
                    };
                    (function(idx, rowsLength) {
                        if (rows[idx]) {
                            var sqlSearchId = rows[idx].id.replace(/\-/g, '_'),
                                rowID = rows[idx].id;
                            var searchIdSQL = 'chat_group_record_' + sqlSearchId;
                            selectFromSql(searchIdSQL).then( recordRows => {
                                var recordObject = {};
                                if(!recordRows){
                                    recordRows = [];
                                }
                                recordObject.record = recordRows;
                                publishRedis.hgetall("group_chat_record", function(err, result) {
                                    for (var key in result) {
                                        if (key.indexOf(rowID) >= 0) {
                                            recordRows.push(JSON.parse(result[key]));
                                        }
                                    };
                                    if (recordRows && recordRows.length > 0) {
                                        var recordResult = parseInt(recordTime[rowID + '_' + userId], 10);
                                        if (!recordResult) {
                                            recordResult = 0;
                                        }
                                        var timeResult = parseInt(joinTime[rowID + '_' + userId], 10);
                                        if (!timeResult) {
                                            timeResult = 0;
                                        };
                                        var unReadCount = {};
                                        recordRows.forEach((value) => {
                                            if (value.time > recordResult && value.time > timeResult && value.creator !== userId) {
                                                if (!unReadCount['length']) {
                                                    unReadCount = {
                                                        info: JSON.parse(value.info),
                                                        id: value.group_id,
                                                        type: value.type,
                                                    }
                                                    unReadCount['length'] = 1;
                                                } else {
                                                    unReadCount['length']++;
                                                }
                                            }
                                        });
                                        socket.emit('send groupRecordLength', unReadCount);
                                    }
                                });
                            })
                        }
                    })(i, rowsLength);
                };
            })
        })
    });
}

function getPersonalReacord(userInfo, socket) {
    var userId = userInfo;
    var functionArray = new sqlFormat(),
        selectFromSql = functionArray.selectFromSql,
        createTable = functionArray.createTable,
        getSql = functionArray.getSql;
    var createTable = '',
        findTable = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'eoffice10'";
        getSql(findTable).then( nameArray => {
            if (!nameArray) {
                nameArray = [];
            };
            if (nameArray.length > 0) {
                nameArray = nameArray.map((value) => {
                    return value.TABLE_NAME;
                })
            }
            var record = {},
                oldArray = ['chat_personal_record_0', 'chat_personal_record_1', 'chat_personal_record_2', 'chat_personal_record_3'],
                useNameArray = [],
                selectSQL = '';
            oldArray.forEach((name) => {
                if (nameArray.indexOf(name) >= 0) {
                    useNameArray.push(name);
                }
            });
            useNameArray.forEach((recordId, index, nameArr) => {
                if (index === nameArr.length - 1) {
                    selectSQL += 'SELECT * FROM ' + recordId + ' WHERE haveread = 0 AND FIND_IN_SET("' + userId + '",`chat_object`)' + 'AND creator !="' + userId + '"';
                } else {
                    selectSQL += 'SELECT * FROM ' + recordId + ' WHERE haveread = 0 AND FIND_IN_SET("' + userId + '",`chat_object`)' + 'AND creator !="' + userId + '" UNION ';
                }
            });
            publishRedis.hgetall("personal_chat_record", function(err, result) {
                if (selectSQL) {
                    getSql(selectSQL).then( rows=>{
                        if (!rows) {
                            rows = [];
                        };
                        record.rows = rows;
                        for (var key in result) {
                            result[key] = JSON.parse(result[key]);
                            result[key].chat_object = key.split('_')[0];
                            if (result[key].chat_object.indexOf(userId) >= 0 && result[key].creator !== userId && result[key].haveread === 0) {
                                record.rows.push(result[key]);
                            }
                        };
                        if (rows.length > 0) {
                            var recordLength = {};
                            rows.forEach((value) => {
                                if (value.haveread === 0) {
                                    value.chat_object = value.chat_object.replace(userId, '').replace(',', '');
                                    if (!recordLength[value.chat_object]) {
                                        recordLength[value.chat_object] = 1;
                                    } else {
                                        recordLength[value.chat_object]++;
                                    }
                                }
                            });
                            socket.emit('send recordLength', recordLength);
                        }
                    })
                } else {
                    var rows = [];
                    record.rows = rows;
                    for (var key in result) {
                        result[key] = JSON.parse(result[key]);
                        result[key].chat_object = key.split('_')[0];
                        if (result[key].chat_object.indexOf(userId) >= 0 && result[key].creator !== userId && result[key].haveread === 0) {
                            record.rows.push(result[key]);
                        }
                    };
                    if (rows.length > 0) {
                        var recordLength = {};
                        rows.forEach((value) => {
                            if (value.haveread === 0) {
                                value.chat_object = value.chat_object.replace(userId, '').replace(',', '');
                                if (!recordLength[value.chat_object]) {
                                    recordLength[value.chat_object] = 1;
                                } else {
                                    recordLength[value.chat_object]++;
                                }
                            }
                        });
                        socket.emit('send recordLength', recordLength);
                    }
                }
            });
        })
}

function setChatRecordMark(data) {
    var functionArray = new sqlFormat(),
        getRedisString = functionArray.getRedisString,
        selectFromSql = functionArray.selectFromSql,
        updateToSql = functionArray.updateToSql;
    if (data.type === 'user') {
        var from = data.from.split('').reverse().slice(0, 4).reverse().join(''),
            to = data.to.split('').reverse().slice(0, 4).reverse().join(''),
            peopleId;
        if (!parseInt(from, 10)) {
            from = 0;
        } else {
            from = parseInt(from, 10)
        };
        if (!parseInt(to, 10)) {
            to = 0;
        } else {
            to = parseInt(to, 10)
        };
        if (from > to) {
            peopleId = data.from + ',' + data.to;
        } else {
            peopleId = data.to + ',' + data.from;
        };
        var selectMark = {
                'creator': '="' + peopleId + '"'
            },
            selectSQL;
        selectFromSql('chat_personal_record_mark', selectMark).then((mark) => {
            if (mark && mark.length > 0) {
                selectSQL = {
                    'haveread': 1
                };
                var condition = {
                    'creator': ' ="' + data.from + '" AND',
                    'FIND_IN_SET': '("' + data.to + '",chat_object) AND',
                    'time': '<="' + data.msg_id + '"'
                };
                updateToSql('chat_personal_record_' + mark[0].time, selectSQL, condition);
            }
        })
        publishRedis.hgetall('personal_chat_record', (err, result) => {
            for (var key in result) {
                result[key] = JSON.parse(result[key]);
                var chat_object = key.split('_')[0];
                if (chat_object.indexOf(data.from) >= 0 && chat_object.indexOf(data.to) >= 0 && result[key].time <= data.msg_id && result[key].haveread == 0 && result[key].creator !== data.to) {
                    result[key].haveread = 1;
                };
                publishRedis.hset('personal_chat_record', key, JSON.stringify(result[key]));
            };
        })
    } else if (data.type === "personal_group") {
        publishRedis.hset("chat_record_mark", data.group_id + '_' + data.userId, data.msg_id);
    }
}

function redisRememberRecord(data, dataTo, haveRead) {
    if (data.type === 'user') {
        var from = data.creator.split('').reverse().slice(0, 4).reverse().join(''),
            to = dataTo.split('').reverse().slice(0, 4).reverse().join(''),
            key, peopleId;
        if (!parseInt(from, 10)) {
            from = 0;
        } else {
            from = parseInt(from, 10)
        };
        if (!parseInt(to, 10)) {
            to = 0;
        } else {
            to = parseInt(to, 10)
        };
        if (from > to) {
            peopleId = data.creator + ',' + dataTo;
            key = data.creator + ',' + dataTo + '_' + data.msg_id;
        } else {
            peopleId = dataTo + ',' + data.creator;
            key = dataTo + ',' + data.creator + '_' + data.msg_id;
        };
        if (haveRead) {
            data.haveread = 1;
        }
        publishRedis.hset("personal_chat_record", key, JSON.stringify(data));
        publishRedis.hset("eoffice_last_record", peopleId, data.msg + '_' + data.time);
        addLog("personal_chat_record" + key + '_' + '_存储个人消息', 'success');
    } else if (data.type === "personal_group" || data.type === "public_group") {
        publishRedis.hset("group_chat_record", data.group_id + '_' + data.msg_id, JSON.stringify(data));
        publishRedis.hset("eoffice_last_record", data.group_id, data.msg + '_' + data.time);
        addLog("group_chat_record" + data.group_id + '_' + data.msg_id + '_存储群组消息', 'success');
    }
}

function whenJoinGroup(group_id, userId, time) {
    var key = group_id + '_' + userId;
    publishRedis.hset('join_group_time', key, time);
}
//定时存储
function timeoutRedisToMysql() {
    redisToMysql();
    setTimeout(timeoutRedisToMysql, 1000 * 60 * 5);
}

function redisToMysql() {
    var functionArray = new sqlFormat(),
        getRedisString = functionArray.getRedisString,
        selectFromSql = functionArray.selectFromSql,
        createTable = functionArray.createTable,
        insertToSql = functionArray.insertToSql;
    // var
    getRedisString("personal_chat_record").then((result) => {
        var recordObj = {},
            personalRecord = {},
            keySqlValue, valueSqlValue = 'VALUES',
            lastKey;
        for (var key in result) {
            var trueKey = key.split('_')[0];
            result[key] = JSON.parse(result[key]);
            result[key].chat_object = trueKey;
            if (!personalRecord[trueKey]) {
                personalRecord[trueKey] = [];
            };
            personalRecord[trueKey].push(result[key]);
        };
        var createMarkSql = {
            'creator': 'char(50) not null',
            'time': 'bigint(20) not null'
        };
        if (Object.keys(personalRecord).length > 0) {
            lastKey = Object.keys(personalRecord)[Object.keys(personalRecord).length - 1];
            createTable('chat_personal_record_mark', createMarkSql).then(() => {
                sendToMysql(personalRecord);
                publishRedis.del('personal_chat_record');
            });
        } else {
            createTable('chat_personal_record_mark', createMarkSql);
        }
    })
    //开始存储
    function sendToMysql(personalRecord) {
        addLog("开始存储个人聊天记录");
        for (var recordKey in personalRecord) {
            var recordArray = personalRecord[recordKey];
            keySqlValue = null;
            valueSqlValue = 'VALUES';
            if (recordArray.length > 0) {
                recordArray = recordArray.map(value => {
                    if (value.download) {
                        value.download = "'" + JSON.stringify(value.download) + "'";
                    } else {
                        value.download = "''";
                    };
                    return value;
                })
            };
            //存储聊天记录
            (function(recordArray, recordKey) {
                if (recordArray) {
                    addLog('存储' + recordKey + '的个人记录');
                    var selectMark = {
                            'creator': '="' + recordKey + '"',
                        },
                        creatPensonalTable = {
                            'creator': 'char(50) not null',
                            'msg': 'mediumtext not null',
                            'time': 'bigint(20) not null',
                            'chat_object': 'char(50) not null',
                            'msg_type': 'char(50) not null',
                            'type': 'char(50) not null',
                            'haveread': 'int(20) not null',
                            'send_time': 'bigint(20) not null',
                            'msg_id': 'char(50) not null',
                            'download': 'char(255)',
                            'file_type': 'char(50)'
                        };
                    selectFromSql('chat_personal_record_mark', selectMark).then((rows) => {
                        if (rows && rows.length > 0) { //找到记录，直接存储
                            var recordTime = rows[0].time;
                            createTable('chat_personal_record_' + recordTime, creatPensonalTable).then(() => {
                                insertToSql('chat_personal_record_' + recordTime, recordArray).then(() => {
                                    addLog('存储' + recordKey + '的个人记录成功');
                                });
                            })
                        } else { //没找到，生成记录并且存储记录，然后再存储聊天信息
                            var recordTime = parseInt(Math.random() * 4, 10);
                            insertToSql('chat_personal_record_mark', {
                                'creator': recordKey,
                                'time': recordTime
                            }).then(() => {
                                createTable('chat_personal_record_' + recordTime, creatPensonalTable).then(() => {
                                    insertToSql('chat_personal_record_' + recordTime, recordArray).then(() => {
                                        addLog('存储' + recordKey + '的个人记录成功');
                                    });
                                })
                            })
                        }
                    })
                }
            })(recordArray, recordKey);
        }
    };
    getRedisString("group_chat_record").then((result) => {
        addLog('开始存储群组聊天记录');
        var recordObj = {},
            personalRecord = [],
            keySqlValue;
        for (var key in result) {
            var trueKey = key.split('_')[0];
            if (!recordObj[trueKey]) {
                recordObj[trueKey] = [];
            }
            result[key] = JSON.parse(result[key]);
            recordObj[trueKey].push(result[key]);
        };
        for (var groupId in recordObj) {
            addLog('开始存储群组中' + groupId + '的聊天记录');
            (function(groupId) {
                if (recordObj[groupId].length > 0) {
                    keySqlValue = recordObj[groupId].map(value => {
                        if (value.download) {
                            value.download = "'" + JSON.stringify(value.download) + "'";
                        } else {
                            value.download = "''";
                        };
                        return value;
                    });
                    groupId = groupId.replace(/\-/g, '_');
                    var sqlString = createTableString;
                    createTable('chat_group_record_' + groupId, sqlString).then(() => {
                        insertToSql('chat_group_record_' + groupId, keySqlValue).then(() => {
                            addLog('群组中' + groupId + '的聊天记录存储成功');
                        });
                    });
                };
            })(groupId)
        }
        publishRedis.del('group_chat_record');
    })
}
setTimeout(timeoutRedisToMysql, 1000 * 10);

function deleteRedisGroupRecord(id) {
    var mgsIdArray = [],
        joinTimeArray = [],
        recordArray = [],
        lastRecord = [];
    publishRedis.hgetall("group_chat_record", function(err, result) {
        for (var key in result) {
            if (key.indexOf(id) >= 0) {
                mgsIdArray.push(key);
            }
        };
        if (mgsIdArray.length > 0) {
            mgsIdArray.forEach((msgId) => {
                publishRedis.hdel("group_chat_record", msgId);
            })
        }
    })
    //删除加入时间等信息
    publishRedis.hgetall("join_group_time", function(err, result) {
        for (var key in result) {
            if (key.indexOf(id) >= 0) {
                joinTimeArray.push(key);
            }
        };
        if (joinTimeArray.length > 0) {
            joinTimeArray.forEach((msgId) => {
                publishRedis.hdel("join_group_time", msgId);
            })
        }
    })
    //删除已读信息时间信息
    publishRedis.hgetall("chat_record_mark", function(err, result) {
        for (var key in result) {
            if (key.indexOf(id) >= 0) {
                recordArray.push(key);
            }
        };
        if (recordArray.length > 0) {
            recordArray.forEach((msgId) => {
                publishRedis.hdel("chat_record_mark", msgId);
            })
        }
    })
    //删除已读信息时间信息
    publishRedis.hgetall("eoffice_last_record", function(err, result) {
        for (var key in result) {
            if (key.indexOf(id) >= 0) {
                recordArray.push(key);
            }
        };
        if (lastRecord.length > 0) {
            lastRecord.forEach((msgId) => {
                publishRedis.hdel("eoffice_last_record", msgId);
            })
        }
    })
}

function iniToObj(location) {
    var ini = fs.readFileSync(location, "ascii"),
        iniArray = parseINIString(ini);
    return iniArray;
}

function parseINIString(data) {
    var regex = {
        section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
        param: /^\s*([\w\.\-\_]+)\s*=\s*(.*?)\s*$/,
        comment: /^\s*;.*$/
    };
    var value = {};
    var lines = data.split(/\r\n|\r|\n/);
    var section = null;
    lines.forEach(function(line) {
        if (regex.comment.test(line)) {
            return;
        } else if (regex.param.test(line)) {
            var match = line.match(regex.param);
            if (section) {
                value[section][match[1]] = match[2];
            } else {
                value[match[1]] = match[2];
            }
        } else if (regex.section.test(line)) {
            var match = line.match(regex.section);
            value[match[1]] = {};
            section = match[1];
        } else if (line.length == 0 && section) {
            section = null;
        };
    });
    return value;
}
//通过id找name
function getNameById(id) {
    return new Promise((resolve, reject) => {
        var getSqlArray = new sqlFormat();
        var selectSQL = {
            'user_id':'="' + id + '"'
        };
        getSqlArray.selectFromSql('user',selectSQL).then( (rows)=>{
            if (rows && rows.length > 0) {
                resolve(rows[0]);
            } else {
                resolve({});
            }
        })
    })
}
//加入到redis已经登录
function joinRedis(id) {
    var loginUsers;
    publishRedis.get('eoffice_login_users', function(err, result) {
        if (!result) {
            loginUsers = id;
            publishRedis.set('eoffice_login_users', loginUsers);
        } else {
            if (result.indexOf(id) < 0) {
                loginUsers = result + "," + id;
                publishRedis.set('eoffice_login_users', loginUsers);
            }
        }
    });
}

function outRedis(id) {
    var loginUsers, index;
    publishRedis.get('eoffice_login_users', function(err, result) {
        if (!result) {
            return;
        }
        loginUsers = result.split(','), index = loginUsers.indexOf(id);
        loginUsers.splice(index, 1);
        publishRedis.set('eoffice_login_users', loginUsers.join(','));
    });
}
