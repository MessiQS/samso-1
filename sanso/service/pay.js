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
	const user_id = ctx.request.body.account || '', //账号，一般为电话号码
		  attach = ctx.request.body.attach || '',//购买的详细信息
		  total_fee = ctx.request.body.total_fee,//价格
		  user_ip = ctx.request.body.user_ip || ''; //ip地址
	let isValid = true,
		invalidData;//输入是否合法
	if(!user_id){
		isValid = false;
		invalidData = "账号不能为空";
	}else if(!attach){
		isValid = false;
		invalidData = "购买信息不能为空，请重试";
	}else if(!total_fee){
		isValid = false;
		invalidData = "价格不能为空";
	}else if(!user_ip){
		isValid = false;
		invalidData = "设备地址不能为空";
	};
	if(!isValid){
		ctx.request.body = {
			'type': false,
			'data': invalidData
		}
		return;
	}
	const params = getWechatParams({
		user_id,
		user_ip,
		total_fee,
		attach
	});
	const props = await wechatPost(wechatUrl, params);
	for (let key in props) {
		if (Array.isArray(props[key]))
			props[key] = props[key][0];
	};
	ctx.response.body = {
		"type":true,
		"data": props
	}

}