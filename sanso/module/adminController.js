//链接数据库的类
const {
    sqlFormat
} = require('../service/connect');
const {checkAdminHeader} = require('../service/check')
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
    }
    ctx.response.body = {
        'type': true,
        'data': {
            token,
            user_id,
        }
    };
}

async function checkAdminToken(ctx,next){
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
    let questionsRows = getQuestionsByIdList(idList)
    let questionList = questionsRows.map(row => {
        let id = row.id,
            errorQues = questionsRows.find(res => res.id === id)
        return {
            ...rows,
            user_id_array:errorQues.user_id_array,
            dateTime:errorQues.dateTime
        }
    })
    ctx.response.body = {
        type: false,
        data: questionList
    }
}

async function getQuestionsByIdList (idList){
    let tableName = "question_banks"
    let idString = idList.map(res => `\'${res}\'`).join(',')
    let rows = await selectFromSql(tableName, {
        'is_checked': `in (${idString})`
    });
    return rows
}

module.exports = {
    adminLogin,
    getErrorQuestion,
    checkAdminToken
}

function getUid() {
    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
    return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
}