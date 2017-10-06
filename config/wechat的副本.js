const MD5 = require('crypto-js/md5');
const moment = require("moment");
const format = "YYYYMMDDHHmmss"; //商户订单号用的format
module.exports = {
	getWechatSign: getWechatSign
};


//获取微信请求参数
function getWechatSign(props) {
	const {
		body,
		user_id,
		user_ip,
		total_fee
	} = props;
	const nonce_str = getUid(),
		appid = "wx8f1006588bd45d9b",
		mch_id = "1489554582",
		body = "刷题库-题库",
		notify_url = "http://www.samso.cn",
		device_info = "web";

	let wechat = {
		appid: appid,
		mch_id: mch_id, //商家id
		device_info: device_info, //设备号
		nonce_str: nonce_str, //随机串
		body: body,
		sign: getWechatSign(nonce_str, appid, mch_id, device_info, body),
		sign_type: "MD5",
		attach: "2013-江苏分卷",
		out_trade_no: moment().format(format) + user_id; //商户订单号
		total_fee:total_fee,//总金额
		user_ip:user_ip,//用户的ip
		time_start:moment().format(format),//交易开始时间
		time_expire:moment().add(10,'minute').format(format),//10分钟后结束交易
		notify_url:notify_url,//通知地址
		trade_type:"APP",//支付类型
	}
	return wechat;
}
//获取微信签名
function getWechatSign(nonce_str, appid, mch_id, device_info, body) {
	const stringA = "appid=" + appid + "&body=" + body + "&device_info=" + device_info + "&mch_id=" + mch_id + "&nonce_str=" + nonce_str;
	const stringSignTemp = stringA + "&key=yegeqinshou2101yegeqinshou210111";
	const sign = MD5(stringSignTemp).toUpperCase();
	return sign;
}

//获取32位随机串
function getUid() {
	function S4() {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	}
	return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
}