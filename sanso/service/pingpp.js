const path = require('path')
const { pingpp_app_id, test_key, live_key } = require('../../bin/config');
const moment = require('moment');
const pingpp = require('pingpp')(live_key);

const privateUrl = path.resolve(__dirname, "../../bin/private_key.pem")

pingpp.setPrivateKeyPath(privateUrl);
class Pingpay {
    static async createCharge(ctx, next) {
        const { client_ip, amount, channel, subject, body } = ctx.request.body;
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
        const chargePromise = new Promise((resolve, reject) => {
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
                if (err) {
                    resolve(err);
                    return;
                };
                resolve(charge);
            });
        });
        const reponseData = await chargePromise;
        // console.log(reponseData);
        ctx.response.body = {
            type: true,
            data: reponseData
        }
    }
    static async pingHook(ctx, next) {
        const { type, data } = ctx.request.body;
        //type
        // summary.daily.available 上一天 0 点到 23 点 59 分 59 秒的交易金额和交易量统计，在每日 04:00 点左右触发。
        // summary.weekly.available    上周一 0 点至上周日 23 点 59 分 59 秒的交易金额和交易量统计，在每周一 04:00 点左右触发。
        // summary.monthly.available   上月一日 0 点至上月末 23 点 59 分 59 秒的交易金额和交易量统计，在每月一日 04:00 点左右触发。
        // charge.succeeded    支付对象，支付成功时触发。

        if (type === "charge.succeeded") {
            const { body } = data
            const user_id = body.spliy('_BUY')[0]
            const bankname = body.spliy('_BUY')[1]

            const selectAccount = await selectFromSql('user', {
                "user_id": `= "${user_id}"`
            });
            let { data_info } = selectAccount[0]
            data_info = data_info ? JSON.parse(data_info) : {}

            data_info.buyedInfo = data_info.buyedInfo ? data_info.buyedInfo : []

            if (data_info.buyedInfo.indexOf(bankname) < 0) {
                data_info.buyedInfo.push(bankname)
            }

            try {
                await updateToSql('user', {
                    data_info: JSON.stringify(data_info)
                }, {
                        "user_id": ` = "${user_id}"`,
                    })
                ctx.response.body = {
                    type: true,
                    data: "收到支付"
                }
                return true;
            } catch (err) {
                ctx.response.body = {
                    "type": false,
                    "data": '更新购买失败',
                };
                return false;
            }

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