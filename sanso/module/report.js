const {
	sqlFormat
} = require('../service/connect');
const sendMail = require('../service/mail')
const moment = require('moment')
const {
	getLengthOfTable
} = new sqlFormat();
const {
	activeUserArray
} = require('./global')

function sendUserToEmail() {
    const date = moment().format('YYYY-MM-DD')
    getLengthOfTable('user').then(response => {
        let length = response && response[0] && response[0]['count(*)']
        let typeArray = Object.keys(activeUserArray)
        sendMail('kefu@shuatiapp.cn',
            `${date} 用户数量报告`,
            `${date} 的用户数量为,
             ${typeArray.map(res => {
                return `${res}有${activeUserArray[res].length} 人`
            }).join()} `)

        typeArray.forEach(res => {
            activeUserArray[res].length = 0
        })

    })
}

module.exports = {
    sendUserToEmail
}