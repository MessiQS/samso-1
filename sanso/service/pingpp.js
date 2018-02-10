const path = require('path')
const { pingpp_app_id, test_key, live_key } = require('../../bin/config');
const moment = require('moment');
const pingpp = require('pingpp')(live_key);
const {
    sqlFormat
} = require('./connect');
const rp = require('request-promise');

const {
    selectFromSql,
    insertToSql,
    updateToSql,
    getLengthOfTable
} = new sqlFormat();

const privateUrl = path.resolve(__dirname, "../../bin/private_key.pem")

pingpp.setPrivateKeyPath(privateUrl);
class Pingpay {
    static async createCharge(ctx, next) {
        const { client_ip, amount, channel, subject, body, paper_id } = ctx.request.body;
        const paperrRow = await selectFromSql('papers', {
            id: ` = "${paper_id}"`
        })
        //服务端控制价格
        let price = 600;
        if (paperrRow && paperrRow[0]) {
            price = parseInt(paperrRow[0].price, 10) * 100
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
        const chargePromise = new Promise((resolve, reject) => {
            pingpp.charges.create({
                order_no: getOrderNo(),
                app: { id: pingpp_app_id },
                channel: channel,
                amount: price,
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
            const { object: { body } } = data
            const keyArr = body.split('_BUY_')
            const user_id = keyArr[0]
            const bankname = keyArr[1]
            console.log(keyArr, body)

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
    static async applePay(ctx, next) {
        let body = ctx.request.body;
        const { user_id, paper_id, receipt } = body
        if (!user_id || !paper_id || !receipt) {
            ctx.response.body = {
                "type": false,
                "data": '缺少参数',
            };
            return false
        }
        const sandUri = "https://sandbox.itunes.apple.com/verifyReceipt"
        const uri = "https://buy.itunes.apple.com/verifyReceipt"

        var options = getOption(uri, receipt)
        const response = await rp(options)
        if (response && response.status === 0) {
            const updatInfo = await updateBuyInfo(user_id, paper_id)
            if (updatInfo) {
                ctx.response.body = {
                    type: true,
                    data: response.receipt
                }
            } else {
                ctx.response.body = {
                    "type": false,
                    "data": '付款成功但是更新购买信息失败',
                };
            }
            return false;
        } else if (response && response.status === 21007) {
            const sandOption = getOption(sandUri, receipt)
            const sandRenspose = await rp(sandOption)
            if (sandRenspose && sandRenspose.status === 0) {
                const updatInfo = await updateBuyInfo(user_id, paper_id)
                if (updatInfo) {
                    ctx.response.body = {
                        type: true,
                        data: response.receipt
                    }
                } else {
                    ctx.response.body = {
                        "type": false,
                        "data": '沙盒环境购买成功，刷新购买信息失败',
                    };
                }
            }else{
                ctx.response.body = {
                    "type": false,
                    "data": '正式环境不行，沙盒环境也不行',
                };  
            }
            return
        }
        ctx.response.body = {
            type: false,
            data: response
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

function updateBuyInfo(user_id, paper_id) {
    return new Promise((resolve, reject) => {
        try {
            const selectAccount = await selectFromSql('user', {
                "user_id": `= "${user_id}"`
            });
            let { data_info } = selectAccount[0]
            data_info = data_info ? JSON.parse(data_info) : {}

            data_info.buyedInfo = data_info.buyedInfo ? data_info.buyedInfo : []

            if (data_info.buyedInfo.indexOf(paper_id) < 0) {
                data_info.buyedInfo.push(paper_id)
            }
            await updateToSql('user', {
                data_info: JSON.stringify(data_info)
            }, {
                    "user_id": ` = "${user_id}"`,
                })
            resolve(true)
        } catch (e) {
            console.log(e)
            resolve(false)
        }
    })
}

function getOption(uri, receipt) {
    return {
        method: 'post',
        uri,
        body: {
            "receipt-data": receipt
        },
        headers: {
            'User-Agent': 'Request-Promise'
        },
        json: true
    };
}