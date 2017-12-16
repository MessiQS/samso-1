//链接数据库的类
const {
	sqlFormat
} = require('./connect');
const {
	selectFromSql,
    insertToSql,
    updateToSql
} = new sqlFormat();
class Check {
    static async checkToken(account, token) {
        if (!account) {
            return false;
        }
        const user = await selectFromSql('user', {
            account: '= ' + account
        });
        if (user && user[0] && user[0].token === token) {
            return true;
        } else {
            return false;
        }
    }
}
module.exports = Check;