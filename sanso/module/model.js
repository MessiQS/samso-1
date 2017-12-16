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

const { updateDataModel, updateBankModel, getOldDataModel, getOldBankModel, dealWithData } = require('./model.controller')

class QuesrtionModel {
    //获取用户刷题情况
    static async getUserQuestionInfo(ctx, next) {
        const { user_id, bankname, dateTime, isDataDefault, isBankDefault } = ctx.query
        /*
        *用户刷题情况包含
        *最近几日刷题情况
        *已购买试卷刷题情况
        */
        if (!user_id) {
            ctx.response.body = {
                type: 'false',
                data: '请添加用户id'
            }
            return;
        }
        let bankModel = await getOldBankModel({ user_id, bankname })
        let dataModel = await getOldDataModel({ user_id, dateTime })
        if (dataModel.error || bankModel.error) {
            console.log(dataModel.source)
            console.log(bankModel.source)
            return {}
        }
        dataModel.detail = JSON.parse(dataModel.detail)
        bankModel.detail = JSON.parse(bankModel.detail)

        if (bankname || isBankDefault) {
            ctx.response.body = {
                type: true,
                data: { bankModel }
            }
            return;
        } else if (dateTime || isDataDefault) {
            ctx.response.body = {
                type: true,
                data: { dataModel }
            }
            return
        } else {
            ctx.response.body = {
                type: true,
                data: {
                    dataModel,
                    bankModel
                }
            }
        }
    }

    static async getUpdateInfoCache(ctx, next) {
        const data = ctx.request.body;
        temporaryQuesInfo.push(data);
        console.log(data)
        if (temporaryQuesInfo.length >= 100) {
            this.updateUserQuestionInfo()
        }
        ctx.response.body = {
            "type": true,
            "data": '信息存储成功',
        };
    }

    static async updateUserQuestionInfo() {
        //globalData:Array[]
        let copyGlobalData = [].concat(temporaryQuesInfo);
        temporaryQuesInfo.length = 0;
        let { dataModel, dataBank } = dealWithData(copyGlobalData)

        //更新用户刷题情况
        //需要同时更新日期模型和题库模型
        dataModel.forEach(result => {
            updateDataModel(result)
        })

        dataBank.forEach(result => {
            updateBankModel(result)
        })
    }

    static async getUserBuyInfo(ctx,next) {
        const data = ctx.request.body;
        //更新用户购买情况
        const { user_id } = data;
        const selectAccount = await selectFromSql('user', {
            "user_id": "= " + user_id
        });
        try {
            let { data_info } = selectAccount[0]
            data_info = data_info ? JSON.parse(data_info) : {}
            return data_info;
        } catch (e) {
            return e;
        }

    }

    static async updateUserBuyInfo(ctx, next) {
        const data = ctx.request.body;
        //更新用户购买情况
        const { user_id, bankname } = data;
        const selectAccount = await selectFromSql('user', {
            "user_id": "= " + user_id
        });
        let { data_info } = selectAccount[0]
        data_info = data_info ? JSON.parse(data_info) : {}

        data_info.buyedInfo = data_info.buyedInfo ? data_info.buyedInfo : []

        if (data_info.buyedInfo.indexOf(bankname) < 0) {
            data_info.buyedInfo.push(bankname)
        }
        console.log(data)

        try {
            await updateToSql('user', {
                data_info: JSON.stringify(data_info)
            }, {
                    "user_id": ` = ${user_id}`,
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