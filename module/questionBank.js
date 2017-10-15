//链接数据库的类
const {
	sqlFormat
} = require('../service/connect');
const { city, province } = require('../../bin/config');
const {
	selectFromSql,
	insertToSql,
	updateToSql
} = new sqlFormat();
const { checkToken } = require('../service/check');

class QuestionBank {
	static async getPaper(ctx, next) {
		const { account, token, paperId } = ctx.query;
		const isValid = await checkToken(account, token);
		if (!isValid) {
			ctx.response.body = {
				type: 'false',
				data: '登录错误，请重新登录'
			}
			return;
		};
		if(!paperId || !province[paperId]){
			ctx.response.body = {
				type: 'false',
				data: '试卷id错误'
			}
			return;
		}
		const questionArray = await selectFromSql('question_banks', {
			'FIND_IN_SET': '("' + province[paperId] + '",`title`)'
		});
		if (!questionArray) {
			ctx.response.body = {
				type: 'false',
				data: '发生错误，请重试'
			}
			return;
		};
		ctx.response.body = {
			type: 'true',
			data: questionArray
		}
	}
}
module.exports = QuestionBank;
