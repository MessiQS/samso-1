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

export default class QuesrtionModel{
    //获取用户刷题情况
    static async getUserQuestionInfo(user_id){
        /*
        *用户刷题情况包含
        *最近几日刷题情况
        *
        */ 
    }
}