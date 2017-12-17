
// const QcloudSms = require("qcloudsms_js");
const { wechatConfig } = require('../../bin/config')
const { appid, appkey } = wechatConfig
const crypto = require('crypto')
const sha256 = crypto.createHash('sha256')
// const qcloudsms = QcloudSms(appid, appkey);

// const ssender = qcloudsms.SmsSingleSender();

// function sendCode({ phoneNumbers, code }) {
//     const time = 2;
//     const templId = "sanso01";
//     const params = [code, time]
//     // const content = `${code} 为您的登陆验证码，请于${time}分钟内填写。如非本人操作，请忽略本短信。`
//     return new Promise((resolve, reject) => {
//         ssender.send(86, phoneNumbers, params, "", "", "", resolve)
//     })
// }


const querystring = require('querystring');
var rp = require('request-promise');

function sendCode(data) {
    const random = getUid();
    const url = `https://yun.tim.qq.com/v5/tlssmssvr/sendsms?sdkappid=${appid}&random=${random}`
    const postBody = getPostBody(data, random)
    // var post_data = querystring.stringify(postBody);
    var options = {
        method: 'post',
        uri:url,
        body: postBody,
        headers: {
            'User-Agent': 'Request-Promise'
        },
        json: true
    };
    rp(options).then(function (data) {
        console.log(data)
    });
}

function getPostBody({ phoneNumbers, code }, random) {
    const strTime = parseInt(new Date().getTime() / 1000, 10); //unix时间戳
    const time = 2;
    const sigContent = `appkey=${appkey}&random=${random}&time=${strTime}&mobile=${phoneNumbers}`
    sha256.update(sigContent)
    const sig = sha256.digest('hex')
    const content = `${code} 为您的登陆验证码，请于${time}分钟内填写。如非本人操作，请忽略本短信。`
    return {
        "tel": { //如需使用国际电话号码通用格式，如："+8613788888888" ，请使用sendisms接口见下注
            "nationcode": "86", //国家码
            "mobile": phoneNumbers //手机号码
        },
        "type": 0, //0:普通短信;1:营销短信（强调：要按需填值，不然会影响到业务的正常使用）
        "msg": content, //utf8编码，需要匹配审核通过的模板内容 
        "sig": sig, //app凭证，具体计算方式见下注
        "time": strTime, //unix时间戳，请求发起时间，如果和系统时间相差超过10分钟则会返回失败
        "extend": "", //通道扩展码，可选字段，默认没有开通(需要填空)。
        //在短信回复场景中，腾讯server会原样返回，开发者可依此区分是哪种类型的回复
        "ext": "" //用户的session内容，腾讯server回包中会原样返回，可选字段，不需要就填空。
    }
}
sendCode({
    phoneNumbers:18361449780,
    code:1234
})
module.exports = sendCode


//获取32位随机串
function getUid() {
    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
    return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
}