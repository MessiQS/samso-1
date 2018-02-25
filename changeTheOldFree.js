//链接数据库的类
const {
	sqlFormat
} = require('./sanso/service/connect');
const {
	selectFromSql,
    getSql,
    insertToSql,
    updateToSql,
    getLengthOfTable
} = new sqlFormat();


// init()
changetofree();


async function init() {
    const provinceArray = ['安徽', '上海', '天津', '重庆', '河北', '山西', '内蒙古',
        '辽宁', '吉林', '黑龙江', '江苏', '浙江', '福建', '江西', '山东',
        '河南', '湖北', '湖南', '广东', '广西', '海南', '四川', '贵州',
        '云南', '西藏', '陕西', '甘肃', '宁夏', '青海', '新疆', '香港',
        '澳门', '台湾', '国家', '北京', '上海', '天津', '重庆'
    ],
        cityArray = ['北京', '上海', '天津', '重庆', '广州', '深圳'],
        quArray = ['内蒙古', '宁夏', '西藏', '新疆'];
    const proArr = provinceArray.concat(cityArray).concat(quArray)
    for (let i in proArr) {
        let rows = await selectFromSql('papers', {
            "province": ` = "${proArr[i]}"`
        })
        if (rows.length === 0) {
            continue
        }
        const oldYear = (rows.map(res => res.year).sort())[0]
        const freeRow = rows.filter(res => (res.year === oldYear))
        for (let j in freeRow) {
            await updateToSql('papers', {
                "price": "0.00"
            }, {
                    "title": ` = "${freeRow[j]['title']}"`,

                })
        }
        console.log(`${proArr[i]} is completed !`)
    }
}


async function changetofree() {
    let rows = await selectFromSql('papers')
    for (let i = 0; i < rows.length; i++) {
        const { title } = rows[i]
        console.log(title)
        await updateToSql('papers', {
            "price": "0.00"
        }, {
                "title": ` = "${title}"`
            })
    }


}
