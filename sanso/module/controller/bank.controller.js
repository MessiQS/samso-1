async function transObjToProvice(paperNameArray) {
    const provinceArray = ['安徽', '北京', '上海', '天津', '重庆', '河北', '山西', '内蒙古',
        '辽宁', '吉林', '黑龙江', '江苏', '浙江', '福建', '江西', '山东',
        '河南', '湖北', '湖南', '广东', '广西', '海南', '四川', '贵州',
        '云南', '西藏', '陕西', '甘肃', '宁夏', '青海', '新疆', '香港',
        '澳门', '台湾', '国家', '北京', '上海', '天津', '重庆'
    ],
        cityArray = ['北京', '上海', '天津', '重庆', '广州', '深圳'],
        quArray = ['内蒙古', '宁夏', '西藏', '新疆'];
    let typeObject = [];

    for (let key in paperNameArray) {
        let result = paperNameArray[key],
            typeName,
            province;
        const { title } = result;
        if (title.indexOf('国家') >= 0) {
            typeName = '国考';
            province = "国家"
        } else if (isCity(title, quArray).type) {
            let index = isCity(title, quArray).idx;
            typeName = quArray[index] + '区考';
            province = quArray[index]
        } else if (isCity(title, cityArray).type) {
            let index = isCity(title, cityArray).idx;
            typeName = cityArray[index] + '市考';
            province = cityArray[index]
        } else {
            let idx = checkProvince(title);
            typeName = provinceArray[idx] + '省考';
            province = provinceArray[idx]
        };
        typeObject = pushInType({
            typeObject,
            typeName,
            result,
            province,
        });
    }
    return typeObject

    function isCity(key, cityArray) {
        let index = -1;
        cityArray.forEach((res, idx) => {
            if (key.indexOf(res) >= 0) {
                index = idx;
            }
        })
        if (index >= 0) {
            return {
                type: true,
                idx: index
            }
        } else {
            return {
                type: false
            }
        }
    }

    function checkProvince(key) {
        let index = -1;
        provinceArray.forEach((res, idx) => {
            if (key.indexOf(res) >= 0) {
                index = idx;
            }
        })
        return index;
    }

    function pushInType({ typeObject, typeName, result, province }) {
        //检测有没有这个区的，如果没有就新建
        if (!typeObject.some((res) => {
            if (res.title === typeName) {
                res.data.push(result)
            }
            return res.title === typeName;
        })) {
            typeObject.push({
                title: typeName,
                province,
                data: [result]
            })
        }
        return typeObject
    }
}

function transObjToDriver(paperNameArray) {
    let titleArr = ['科目一', '科目四']
    let typeObject = [{
        title: '科目一',
        province: '科目一',
        data: []
    }, {
        title: '科目四',
        province: '科目四',
        data: []
    },]
    for (let key in paperNameArray) {
        const result = paperNameArray[key],
        const { province } = result
        const index = titleArr.indexOf(province)
        typeObject[index].data.push(result)
    }
    return typeObject
}

module.exports = {
    transObjToProvice,
    transObjToDriver
}