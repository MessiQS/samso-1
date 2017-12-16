const log4js = require('log4js');
const fs = require('fs');
// const config = iniToObj("../../../../bin/config.ini");
log4js.configure(__dirname + '/log_config.json');
let log_success = log4js.getLogger('success'),
    log_chat = log4js.getLogger('chat'),
    log_group = log4js.getLogger('group'),
    log_error = log4js.getLogger('error');
let isdebugger = true;
// if (config && config.app && config.app.APP_DEBUG) {
//     isdebugger = true;
// }

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
};
module.exports = {
    addLog: addLog
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