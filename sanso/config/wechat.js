const MD5 = require('crypto-js/md5');
const moment = require("moment");
const format = "YYYYMMDDHHmmss"; //商户订单号用的format
module.exports = {
	getWechatParams: getWechatParams,
	getWechatPayParams:getWechatPayParams,//支付字段
	wechatUrl: "https://api.mch.weixin.qq.com/pay/unifiedorder"
};
//获取支付字段
function getWechatPayParams(props){
	let wechat = {
				appId:props.appid,
				partnerId:props.mch_id,
				prepayId:props.prepay_id,
				nonceStr:getUid(),
				timeStamp:parseInt(new Date().getTime()/1000,10).toString(),
				package:"Sign=WXPay"
			};
	wechat.sign = getWechatSign(wechat);
	console.log(wechat);
	return wechat;
}

//获取微信请求参数
function getWechatParams(props) {
	//app发来的参数
	let {
		user_id,
		user_ip,
		total_fee,
		attach
	} = props;
	//常量
	const nonce_str = getUid(),
		body = "刷题库-题库",
		appid = "wx8f1006588bd45d9b",
		mch_id = "1489554582",
		notify_url = "http://www.samso.cn/api/wechatcallback";

	let wechat = {
		appid: appid,
		mch_id: mch_id, //商家id
		nonce_str: nonce_str, //随机串
		body: body,
		attach: attach,
		out_trade_no: moment().format(format) + user_id, //商户订单号
		total_fee: total_fee, //总金额
		spbill_create_ip: user_ip, //用户的ip
		// time_start: moment().format(format), //交易开始时间
		// time_expire: moment().add(10, 'minute').format(format), //10分钟后结束交易
		notify_url: notify_url, //通知地址
		trade_type: "APP", //支付类型
	};
	wechat.sign = getWechatSign(wechat);
	return wechat;
}
//获取微信签名
function getWechatSign(props) {
	let keyArr = Object.keys(props).sort();
	let stringA = '';
	keyArr.forEach( (res,index) => {
		if(index === 0){
			stringA = stringA + res + '=' + props[res];
		}else{
			stringA =  stringA + '&' + res + '=' + props[res];
		}
	});
	const stringSignTemp = stringA + "&key=yegeqinshou2101yegeqinshou210111";
	const sign = MD5(stringSignTemp).toString().toUpperCase();
	return sign;
}

//获取32位随机串
function getUid() {
	function S4() {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	}
	return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
}