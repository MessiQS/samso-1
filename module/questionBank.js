//链接数据库的类
const {
	sqlFormat
} = require('./connect');

class QuestionBank{
	static aysnc getPaper(ctx, next){
		const account = ctx.request.body.account || '', //账号，一般为电话号码
			token = ctx.request.body.token || '', //确认token
			

	}
}