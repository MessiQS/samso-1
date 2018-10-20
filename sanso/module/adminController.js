//链接数据库的类
const {
    sqlFormat
} = require('../service/connect');
const { checkAdminHeader } = require('../service/check')
const {
    selectFromSql,
    insertToSql,
    updateToSql
} = new sqlFormat();


async function adminLogin(ctx, next) {
    const { account, password } = ctx.request.body;
    let tableName = "admin"
    let row = await selectFromSql(tableName, {
        'account': `= "${account}"`
    });
    let userInfo = row && Array.isArray(row) && row[0]
    if (!userInfo) {
        ctx.response.body = {
            'type': false,
            'data': '账号不存在'
        };
        return
    }
    let { user_id, password: truePassword } = userInfo

    if (truePassword !== password) {
        ctx.response.body = {
            'type': false,
            'data': '您输入的密码不正确'
        };
        return
    }
    let token = getUid();
    let updatesql = await updateToSql(tableName, {
        token
    }, {
            "account": ` = "${account} "`
        });
    if (!updatesql) {
        ctx.response.body = {
            'type': false,
            'data': '登录失败请重试'
        };
        return
    }
    ctx.response.body = {
        'type': true,
        'data': {
            token,
            user_id,
        }
    };
}

async function checkAdminToken(ctx, next) {
    const { user_id } = ctx.query;
    const isValid = user_id && await checkAdminHeader(ctx.request, user_id);
    if (!isValid) {
        ctx.response.body = {
            type: false,
            data: '登录错误，请重新登录'
        }
        next()
        return
    }
    ctx.response.body = {
        type: true,
        data: '验证成功！'
    }
    next()
}

async function getErrorQuestion(ctx, next) {
    const { user_id } = ctx.query;
    let tableName = "error_question"
    const isValid = await checkAdminHeader(ctx.request, user_id);
    if (!isValid) {
        ctx.response.body = {
            type: false,
            data: '登录错误，请重新登录'
        }
        return;
    };
    let rows = await selectFromSql(tableName, {
        'is_checked': `= 0`
    });
    let idList = rows.map(row => row.id)
    let questionsRows = await getQuestionsByIdList(idList)
    let questionList = questionsRows.map(row => {
        let id = row.id, errorQues = rows.find(res => res.id === id)
        return {
            ...row,
            user_id_array: errorQues.user_id_array,
            dateTime: errorQues.dateTime
        }
    })
    ctx.response.body = {
        type: true,
        data: questionList
    }
}

async function getQuestionsByIdList(idList) {
    let tableName = "question_banks"
    let idString = idList.map(res => `\'${res}\'`).join(',')
    let rows = await selectFromSql(tableName, {
        'id': `in (${idString})`
    });
    return rows
}

async function setErrorToTrue(ctx, next) {
    const { user_id, id } = ctx.query;
    const isValid = await checkAdminHeader(ctx.request, user_id);
    if (!isValid) {
        ctx.response.body = {
            type: false,
            data: '登录错误，请重新登录'
        }
        return;
    };
    let updatesql = await setFiexed(id)
    let rerturnObj = updatesql
        ? {
            'type': true,
            'data': '确认成功 '
        }
        : {
            'type': false,
            'data': "更正失败"
        };
    ctx.response.body = rerturnObj
    next()
}

async function setFiexed(id) {
    let tableName = "error_question"
    let updatesql = await updateToSql(tableName, {
        is_checked: 1
    }, {
            "id": ` = "${id} "`
        });
    return updatesql
}

async function fixedErrorQuestion(ctx, next) {
    let tableName = "question_banks"
    const { user_id } = ctx.request.body;
    const isValid = await checkAdminHeader(ctx.request, user_id);
    if (!isValid) {
        return ctx.response.body = {
            type: false,
            data: '登录错误，请重新登录'
        }
    };
    let fixedObj = Object.assign({}, ctx.request.body)
    delete fixedObj.user_id
    let id = fixedObj.id
    delete fixedObj.id
    await updateToSql(tableName, fixedObj, {
        "id": ` = "${id} "`
    });
    let updatesql = await setFiexed(id)
    let rerturnObj = updatesql
        ? {
            'type': true,
            'data': '确认成功 '
        }
        : {
            'type': false,
            'data': "更正失败"
        };
    ctx.response.body = rerturnObj
    next()
}

module.exports = {
    adminLogin,
    getErrorQuestion,
    checkAdminToken,
    fixedErrorQuestion,
    setErrorToTrue
}

function getUid() {
    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
    return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
}