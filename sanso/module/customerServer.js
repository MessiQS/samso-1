/**
 * 
 * 客户服务
 * customerService
 * 
 */
const sendMail = require('../service/mail')
const { checkHeader } = require('../service/check');
const send = require('koa-send'); // "koa-send"
const moment = require('moment')
const fs = require('fs')
const versionPath = "./bin/version.json"
//链接数据库的类
const {
	sqlFormat
} = require('../service/connect');
const {
	selectFromSql,
    insertToSql,
    updateToSql
} = new sqlFormat();

class AboutVersion {
    static getAllVersion() {
        const version = fs.readFileSync(versionPath)
        return JSON.parse(version)
    }

    static getLastVersion() {
        const version = fs.readFileSync(versionPath)
        const versionArray = JSON.parse(version)
        const last = versionArray.length ? versionArray.length - 1 : 0;
        return versionArray[last]
    }
    static updateAppVersion(info) {
        const version = fs.readFileSync(versionPath)
        const versionArray = JSON.parse(version)
        versionArray.push(info)
        fs.writeFileSync(versionPath, JSON.stringify(versionArray))
    }
}
// const info1 = {
//     "version": "1.21",
//     "size": "1.61M",
//     "date": "2015-11-11",
//     "updateInfo": [
//         "UI改动",
//         "修复BUG若干"
//     ],
//     "url": "https://shuatiapp.cn/api/getNewVersion"
// }

class CustomerService {
    static async feedback(ctx, next) {
        const { title, content, user_id } = ctx.request.body;
        // console.log(title,content)

        const isValid = await checkHeader(ctx.request, user_id)
        if (!isValid) {
            ctx.response.body = {
                type: false,
                data: '登录错误，请重新登录'
            }
            return;
        };

        if (!title || !content) {
            ctx.response.body = {
                type: false,
                data: "请填写邮箱地址和内容"
            }
            return;
        }
        const reg = new RegExp("^[a-z0-9]+([._\\-]*[a-z0-9])*@([a-z0-9]+[-a-z0-9]*[a-z0-9]+.){1,63}[a-z0-9]+$");
        if (!reg.test(title)) {
            ctx.response.body = {
                type: false,
                data: "请填写正确的邮箱地址"
            }
            return;
        }
        const result = await sendMail('kefu@shuatiapp.cn', `来自用户 ${title} 的反馈信息`, `${user_id}说${content}`)
        //给对方一个反馈
        sendMail(title, `感谢您的反馈！`, "客服会在短时间内对此问题做出调整，希望能给您带来更好的产品体验！")
        ctx.response.body = result
    }

    static async wrongFeedBack(ctx, next) {
        const { title, id, question_number, user_id } = ctx.request.body;
        const isValid = await checkHeader(ctx.request, user_id)
        if (!isValid) {
            ctx.response.body = {
                type: false,
                data: '登录错误，请重新登录'
            }
            return;
        };


        try {
            const rows = await selectFromSql('error_question', {
                id: ` = "${id}"`
            })
            if (rows.length > 0) {
                let user_id_array = JSON.parse(rows[0].user_id_array)
                if (user_id_array.indexOf(id) < 0) {
                    user_id_array.push(user_id)
                    await updateToSql('error_question', {
                        user_id_array: JSON.stringify(user_id_array),
                        dateTime: moment().format("YYYY-MM-DD HH:mm:ss")
                    }, {
                            id: ` = "${id}"`
                        })
                }
            } else {
                await insertToSql('error_question', {
                    title, id, question_number,
                    user_id_array: JSON.stringify([user_id]),
                    dateTime: moment().format("YYYY-MM-DD HH:mm:ss")
                })

            }
            ctx.response.body = {
                type: true,
                data: "反馈成功"
            }
        } catch (e) {
            console.log(e)
            ctx.response.body = {
                type: true,
                data: "反馈失败，请稍后重试"
            }
        }
    }

    static async getUpdate(ctx, next) {
        // const { version } = ctx.query
        const res = AboutVersion.getLastVersion()
        ctx.response.body = {
            type: true,
            data: res
        }
    }

    static async getNewVersion(ctx, next) {
        var fileName = 'app-release.apk';
        ctx.attachment(fileName);
        await send(ctx, fileName, { root: __dirname + './../../version' });
    }
}
module.exports = CustomerService