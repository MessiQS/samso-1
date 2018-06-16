const crypto = require('crypto');
const {
    codeObj,
    temporaryQuesInfo
} = require('./global');
//链接数据库的类
const {
	sqlFormat
} = require('../service/connect');
const {
	selectFromSql,
    insertToSql,
    updateToSql
} = new sqlFormat();
const moment = require('moment')
const addLog = require('../serverLog').addLog;

const Check = require('../service/check')
const { updateActiveUser } = require('./report')
// const { updateDataModel, updateBankModel, getOldDataModel, getOldBankModel, dealWithData } = require('./model.controller')

class QuesrtionModel {
    //获取用户刷题情况
    static async getUserQuestionInfo(ctx, next) {
        const { user_id } = ctx.query
        //bankname, dateTime, isDataDefault, isBankDefault 
        /*
        *用户刷题情况包含
        *最近几日刷题情况
        *已购买试卷刷题情况
        */
        if (!user_id) {
            ctx.response.body = {
                type: false,
                data: '请添加用户id'
            }
            return;
        }

        const isValid = await Check.checkHeader(ctx.request, user_id)
        if (!isValid) {
            ctx.response.body = {
                type: false,
                data: '登录错误，请重新登录'
            }
            return;
        };


        let modelArray = await selectFromSql('question_model', {
            "user_id": `= "${user_id}"`,
            "order by": "lastDateTime desc"
        })
        let responseData = setUserQuestionInfo(modelArray)
        let lastPaperInfo = {}
        if (Object.keys(responseData).length > 0) {
            const { paper_id } = modelArray[0]
            const papers = await selectFromSql('papers', {
                id: ` = "${paper_id}"`
            })
            lastPaperInfo = papers[0] || {}
        }
        ctx.response.body = {
            type: true,
            data: {
                lastPaperInfo,
                userQuestionInfo: responseData
            }
        }
    }

    static async getQuestionInfoByPaperid(ctx, next) {
        const { user_id, paper_id } = ctx.query
        //paper_id
        if (!user_id || !paper_id) {
            ctx.response.body = {
                type: false,
                data: '请添加用户id和试卷id'
            }
            return;
        }

        const isValid = await Check.checkHeader(ctx.request, user_id)
        if (!isValid) {
            ctx.response.body = {
                type: false,
                data: '登录错误，请重新登录'
            }
            return;
        };

        let modelArray = await selectFromSql('question_model', {
            "user_id": `= "${user_id}" and`,
            "paper_id": `= "${paper_id}"`
        })
        let responseData = setUserQuestionInfo(modelArray)
        ctx.response.body = {
            type: true,
            data: responseData
        }

    }
    static async getUpdateInfoCache(ctx, next) {
        const data = ctx.request.body;
        const { user_id } = data
        const isValid = await Check.checkHeader(ctx.request, user_id)
        if (!isValid) {
            ctx.response.body = {
                "type": false,
                "data": "没有权限",
            };
            return;
        }
        temporaryQuesInfo.push(data);
        addLog(`存储用户id为 ${user_id} 刷题的信息 , ${data}`, 'chat')
        const { paper_id } = data
        //记录活跃用户
        await updateActiveUser({ user_id, paper_id })

        if (temporaryQuesInfo.length >= 1) {
            updateUserQuestionInfo()
        }
        ctx.response.body = {
            "type": true,
            "data": '信息存储成功',
        };
    }

    static updateUserQuestionInfo() {
        updateUserQuestionInfo()
    }

    static async getUserBuyInfo(ctx, next) {
        const { user_id } = ctx.request.body;
        const isValid = await Check.checkHeader(ctx.request, user_id)
        if (!isValid) {
            ctx.response.body = {
                "type": false,
                "data": "没有权限",
            };
            return;
        }
        //更新用户购买情况
        const selectAccount = await selectFromSql('user', {
            "user_id": `= "${user_id}"`
        });
        try {
            let { data_info } = selectAccount[0]
            console.log(7, moment().format('YYYY-MM-DD HH:mm:ss'))
            data_info = data_info ? JSON.parse(data_info) : {}
            ctx.response.body = {
                "type": true,
                "data": data_info,
            };

        } catch (e) {
            ctx.response.body = {
                "type": false,
                "data": e,
            };
        }

    }

    static async updateUserBuyInfo(ctx, next) {
        const data = ctx.request.body;
        //更新用户购买情况
        const { user_id, bankname } = data;
        const selectAccount = await selectFromSql('user', {
            "user_id": `= "${user_id}"`
        });
        let { data_info } = selectAccount[0]

        console.log(8)

        data_info = data_info ? JSON.parse(data_info) : {}

        data_info.buyedInfo = data_info.buyedInfo ? data_info.buyedInfo : []

        if (data_info.buyedInfo.indexOf(bankname) < 0) {
            data_info.buyedInfo.push(bankname)
        }

        try {
            await updateToSql('user', {
                data_info: JSON.stringify(data_info)
            }, {
                    "user_id": ` = "${user_id}"`,
                })
            ctx.response.body = {
                "type": true,
                "data": '更新购买成功',
            };
            return true;
        } catch (err) {
            ctx.response.body = {
                "type": false,
                "data": '更新购买失败',
            };
            return false;
        }

    }
}

module.exports = QuesrtionModel

async function updateUserQuestionInfo() {
    //globalData:Array[]
    const NumberArray = ["right", "wrong", "weighted", "lastDateTime", "firstDateTime", "question_number"]
    let copyGlobalData = [].concat(temporaryQuesInfo);
    temporaryQuesInfo.length = 0;

    for (info of copyGlobalData) {
        for (let key in info) {
            if (NumberArray.indexOf(key) >= 0) {
                info[key] = Number(info[key])
            }
        }
        const { user_id, paper_id, question_id, record,
            question_number, right, wrong, weighted,
            lastDateTime, firstDateTime } = info
        const primary_key = `${user_id}_${question_id}`
        let row = await selectFromSql('question_model', {
            primary_key: ` = "${primary_key}"`
        })
        if (row.length === 0) {
            //更新
            info.primary_key = primary_key
            await insertToSql('question_model', info)
        } else {
            let oldInfo = row[0],
                updateInfo = {};
            updateInfo.wrong = oldInfo.wrong + info.wrong
            updateInfo.weighted = oldInfo.weighted + info.weighted
            updateInfo.correct = oldInfo.correct + info.correct
            updateInfo.lastDateTime = info.lastDateTime
            updateInfo.record = info.record
            await updateToSql('question_model', updateInfo, {
                primary_key: ` = "${primary_key}"`
            })

        }
    }
}
//整理用户答题信息
function setUserQuestionInfo(modelArray) {
    if (!Array.isArray(modelArray) || modelArray.length === 0) {
        return {}
    }
    let questionInfo = {}
    modelArray.forEach(info => {
        const { paper_id, question_number } = info
        questionInfo[paper_id] = questionInfo[paper_id] || {}
        let paperIdInfo = questionInfo[paper_id]
        paperIdInfo[question_number] = info
    })
    return questionInfo
}