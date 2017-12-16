/**
 * 
 * 客户服务
 * customerService
 * 
 */
const sendMail = require('../service/mail')
class CustomerService {
    static async feedback(ctx, next) {
        const { title, content } = ctx.request.body;
        const result = await sendMail('messizhao@foxmail.com', title, content)
        ctx.response.body = result
    }
}
module.exports = CustomerService