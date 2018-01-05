const fs = require('fs');
const file = "./Shanghai.json"
const connect = require('./sanso/service/connect')
const {
    sqlFormat
} = connect
const {
    selectFromSql,
    updateToSql
} = new sqlFormat()


const init = async () => {

    fs.readFile(file, function (err, data) {
        if (err) {
            console.log(err);
            return;
        }
        const array = JSON.parse(data)
        array.forEach(async element => {
            const title = element.exam;
            const numberArr = element.number.split(',').map(res => Number(res));
            const quesArray = await selectFromSql('question_banks', {
                "title": `= "${title}"`
            })
            const needToExam = quesArray.filter(res => {
                return numberArr.indexOf(Number(res.question_number)) >= 0
            })
            needToExam.forEach(res => {
                res.question_material = element.material
                updateToSql("question_banks", {
                    question_material: element.material
                }, {
                        "title": `= "${title}"`,
                        "AND question_number": `= "${res.question_number}"`
                    })
            })
        });
    })
}
init()