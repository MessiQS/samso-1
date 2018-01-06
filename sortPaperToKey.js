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
let test = {}

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
        let { question_number } = result
        const { key, value, title } = titleObj
        const changeArr = needToUpdate(result, key);
        if (changeArr.length > 0) {
            let updateObject = {}
            changeArr.forEach(option => {
                updateObject[option] = replaceTokey(result[option], key, value)
            })

            if (!test[title]) {
                test[title] = []
            }
            changeArr.push({
                question_number
            })
            test[title].push(changeArr)

            updateToSql('question_banks', updateObject, {
                "title": ` = "${title}"`,
                "AND question_number": ` = "${question_number}"`
            })
        }
    })
}


function needToUpdate({ question, question_material, analysis, option_A, option_B, option_C, option_D }, key) {
    let tobeChange = [];

    if (question.indexOf(key) >= 0) {
        tobeChange.push('question')
    }

    if (question_material.indexOf(key) >= 0) {
        tobeChange.push('question_material')
    }
    if (analysis.indexOf(key) >= 0) {
        tobeChange.push('analysis')
    }
    if (option_A.indexOf(key) >= 0) {
        tobeChange.push('option_A')
    }

    if (option_B.indexOf(key) >= 0) {
        tobeChange.push('option_B')
    }
    if (option_C.indexOf(key) >= 0) {
        tobeChange.push('option_C')
    }
    if (option_D.indexOf(key) >= 0) {
        tobeChange.push('option_D')
    }
    return tobeChange
}

function replaceTokey(title, oldk, newk) {
    newk = `images/${newk}`

    for (let i = 0; i < 100; i++) {
        if (title.indexOf(oldk) >= 0) {
            title = title.replace(oldk, newk)
        } else {
            break;
        }
    }
    return title

}


// async function testFunc(title) {
//     const quesArray = await selectFromSql('question_banks', {
//         "title": `= "${title}"`,
//     })
//     quesArray.forEach(res => {
//         if(res.question_number === "94"){
//             console.log(res.question)
//         }
//     })
// }

// testFunc('2013年广东(务工)《行测》真题')