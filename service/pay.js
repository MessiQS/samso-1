const {
	getWechatParams,
	getWechatPayParams,
	wechatUrl
} = require('../config/wechat');
const {
	GET,
	POST,
	wechatPost
} = require('./node-http');

module.exports = {
	wechatPay: wechatPay
}

async function wechatPay(ctx, next) {
	const user_id = "SS0000001",
		user_ip = "192.168.0.102",
		attach = "2013-江苏分卷",
		total_fee = 1;
	const params = getWechatParams({
		user_id,
		user_ip,
		total_fee,
		attach
	});
	wechatPost(wechatUrl, params, fromWechat)

	function fromWechat(props) {
		for (let key in props) {
			if (Array.isArray(props[key]))
				props[key] = props[key][0];
		};
		let wechatPayObject = getWechatPayParams(props);
		ctx.request.body = {
			'type': true,
			'data': wechatPayObject
		}
	}
}