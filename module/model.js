const crypto = require('crypto');
const {
	codeObj
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

const { updateDataModel, updateBankModel, getOldDataModel, getOldBankModel } = require('./model.controller')

export default class QuesrtionModel {
    //获取用户刷题情况
    static async getUserQuestionInfo(user_id) {
        /*
        *用户刷题情况包含
        *最近几日刷题情况
        *已购买试卷刷题情况
        */
        let dataModel = await getOldDataModel({ user_id })
        let bankModel = await getOldDataModel({ user_id })
        if (dataModel.error || bankModel.error) {
            console.log(dataModel.source)
            console.log(bankModel.source)
            return
        }
        dataModel.detail = JSON.parse(dataModel.detail)
        bankModel.detail = JSON.parse(bankModel.detail)
        return {
            dataModel,
            bankModel
        }
    }
    static async updateUserQuestionInfo(data) {
        //更新用户刷题情况
        //需要同时更新日期模型和题库模型
        updateDataModel(data)
        updateBankModel(data)
    }
    static async updateUserBuyInfo(data) {
        //更新用户购买情况
        const { user_id, bankname } = data;
    }
}

