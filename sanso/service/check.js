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
            account: `= "${account}"`
        });
        if (user && user[0] && user[0].token === token) {
            return true;
        } else {
            return false;
        }
    }
    static async checkHeader({ header }, user_id) {
        if (!header || !header.authorization) {
            return false;
        }
        const token = header.authorization
        const user = await selectFromSql('user', {
            user_id: `= "${user_id}"`
        });
        if (user && user[0] && user[0].token === token) {
            return true;
        } else {
            return false;
        }
    }

    static async checkAdminHeader({ header }, user_id) {
        let authorization = header && header.authorization
        let tableName = "admin"
        if(!authorization) return false
        const result = await selectFromSql(tableName, {
            user_id: `= "${user_id}"`
        });
        let token = result && result[0] && result[0].token 
        let isValid = token === authorization
        return isValid
    }
}

module.exports = Check;