const path = require('path')
const { pingpp_app_id, test_key } = require('../../bin/config');
const moment = require('moment');
const pingpp = require('pingpp')(test_key);

const privateUrl = path.resolve(__dirname, "../../bin/private_key.pem")

console.log(privateUrl )
pingpp.setPrivateKey(privateUrl);
class Pingpay {
    static async createCharge(ctx,next) {
        const { client_ip, amount, channel ,subject,body} = {
            client_ip:"192.168.0.103",
            amount:'100',
            channel:'alipay',
            subject:'ss0001',
            body:"1234"
        }
        // ctx.request.body;
        /*
        *   charge参数说明
        *   order_no 商户订单号
        *   app的id 即为 appid
        *   channel支付方式 ，目前支持为 alipay 支付宝支付  或者 wx 微信app支付
        *   amount总金额
        *   client_ip 客户端的IPv4
        *   currency 货币代码 固定位cny
        *   subject 商品名称 暂定为 该套题的 SPid
        *   body 商品描述信息
        */
        const chargePromise =  new Promise( (resolve ,reject) => {
            pingpp.charges.create({
                order_no: getOrderNo(),
                app: { id: pingpp_app_id },
                channel: channel,
                amount: amount,
                client_ip: client_ip,
                currency: "cny",
                subject: subject,
                body: body,
                // extra: extra 暂时不需要
            }, function (err, charge) {
                // YOUR CODE
                if(err){
                    resolve(err);
                    return;
                };
                resolve(charge);
            });
        });
        const reponseData = await chargePromise;
        console.log(reponseData);
        ctx.response.body = {
            type:true,
            data:reponseData
        }
    }
}
module.exports = Pingpay;


function getOrderNo() {
    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return moment().format('YYYYMMDDHHmmss') + S4();
}