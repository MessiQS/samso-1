const path = require('./path')
const fs = require('fs');
//链接数据库的类
const {
	sqlFormat
} = require('./sanso/service/connect');
const {
	selectFromSql,
    getSql,
    insertToSql,
    updateToSql
} = new sqlFormat();

const jsonPath = "./test2.json"
let test = {

}

const init = async () => {
    let titleArray = [];
    for (let key in path) {
        let title = key.split('-')[0]
        titleArray.push({
            key,
            title,
            value: path[key]
        })
    }
    for (let i in titleArray) {
        let titleObj = titleArray[i]
        const quesArray = await selectFromSql('question_banks', {
            "title": `= "${titleObj.title}"`,
        })
        console.log(titleObj.title)
        changeAPaper(quesArray, titleObj)
    }

    console.log(test.length)
    fs.writeFileSync(jsonPath, JSON.stringify(test))

}
init()

function changeAPaper(quesArray, titleObj) {
    quesArray.forEach(result => {
        const { question, question_number } = result
        const { key, value, title } = titleObj
        if (question.indexOf(key) >= 0) {
            let newTitle = replaceTokey(question, key, value)


            if (!test[title]) {
                test[title] = []
            }
            test[title].push(question_number)

            // updateToSql('question_banks', {
            //     question: newTitle
            // }, {
            //         "title": ` = "${title}"`,
            //         "AND question_number": ` = "${question_number}"`
            //     })
        }
    })
}
function replaceTokey(title, oldk, newk) {
    newk = `images/${newk}`
    title = title.replace(oldk, newk)
    if (title.indexOf(oldk) >= 0) {
        title = title.replace(oldk, newk)
    }
    if (title.indexOf(oldk) >= 0) {
        title = title.replace(oldk, newk)
    }
    if (title.indexOf(oldk) >= 0) {
        title = title.replace(oldk, newk)
    }
    if (title.indexOf(oldk) >= 0) {
        title = title.replace(oldk, newk)
    }
    if (title.indexOf(oldk) >= 0) {
        title = title.replace(oldk, newk)
    }
    if (title.indexOf(oldk) >= 0) {
        title = title.replace(oldk, newk)
    }
    return title

}