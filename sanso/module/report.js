const {
    sqlFormat
} = require('../service/connect');
const sendMail = require('../service/mail')
const moment = require('moment')
const {
    getLengthOfTable,
    selectFromSql,
    insertToSql
} = new sqlFormat();
const {
    activeUserArray
} = require('./global')

async function sendUserToEmail() {
    const date = moment().format('YYYY-MM-DD')
    let typeArray = Object.keys(activeUserArray)
    const response = await getLengthOfTable('user')
    let length = response && response[0] && response[0]['count(*)']

    try {
        await insertToSql('user_login_cache', {
            date_time: moment().format('YYYY-MM-DD'),
            number: typeArray.reduce((left, right) => {
                return left + Number(activeUserArray[right])
            }, 0),
            user_length: length,
            info: JSON.stringify(activeUserArray)
        })
    } catch (e) {
        console.log(e)
    }

    sendMail('kefu@shuatiapp.cn',
        `${date} 用户数量报告 `,
        `${date} 的用户数量为${length} 人 ,
             ${typeArray.map(res => {
            return `${res}有${activeUserArray[res].length} 人`
        }).join()} `)

    typeArray.forEach(res => {
        activeUserArray[res].length = 0
    })

}

async function updateActiveUser({ user_id, paper_id }) {
    const paperInfo = await selectFromSql('papers', {
        id: ` = "${paper_id}"`
    })
    const type = paperInfo[0].type
    activeUserArray[type] = activeUserArray[type] || []

    if (activeUserArray[type].indexOf(user_id) < 0) {
        activeUserArray[type].push(user_id)
    }
}

module.exports = {
    sendUserToEmail,
    updateActiveUser
} 