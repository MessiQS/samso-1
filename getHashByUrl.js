const { Post } = require('../utils/http')
const { startRequest } = require('./gethtml')
var fs = require('fs');

let { value } = require('./config')

const cookie = "a_n=18361449780; d_t=b86f57f4-25d7-41cb-916b-9139d70f8c8e; Hm_lvt_7807b581bd39ca93734ed246857f588e=1525400631; NTKF_T2D_CLIENTID=guest1B495905-7ADB-CCA3-0A73-28F69A7E3582; nTalk_CACHE_DATA={uid:kf_9751_ISME9754_guest1B495905-7ADB-CC,tid:1525400640125592}; yb_uuid=76cdcf2d-4f71-4841-ab6a-4b1dfc63a4ef; JSESSIONID=B96C8C7912938B67BD805FB606DAB70A; __jsluid=fba11cef0f10390517cb3f0cea4300fa; Hm_lpvt_7807b581bd39ca93734ed246857f588e=1525401992; Hm_lvt_bb1529acd128834552116f9f2e99f849=1525401943,1525401953,1525401995,1525402003; Hm_lvt_e9587046efa5e97399e96a76705556ba=1525401943,1525401953,1525401995,1525402003; Hm_lpvt_bb1529acd128834552116f9f2e99f849=1525402029; Hm_lpvt_e9587046efa5e97399e96a76705556ba=1525402029"


function getOptions(path, body) {
    const postData = "skuId=" + body
    return {
        host: "sku.duia.com",
        path: path,
        method: "POST",
        body: postData,
        headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Cookie": cookie,
            'Content-Length': postData.length,
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        }
    }
}

function getTikuOptions(path, body) {
    const postData = JSON.stringify(body);
    return {
        host: "ntiku.duia.com",
        path: path,
        method: "POST",
        body: postData,
        headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Cookie": cookie,
            'Content-Length': postData.length,
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Content-Type": "application/json",
        }
    }
}

var testarr = ['（测一）', '（测二）', '（测三）', '（测四）']

var aaa = []

function sleep(time) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, time)
    })
}

function rnd(n, m) {
    var random = Math.floor(Math.random() * (m - n + 1) + n);
    return random;
}
async function gettwo() {
    let bigObject = {}
    for (let i = 0; i < value.length; i++) {
        console.log('out ' + i + 'begin')
        val = value[i]
        bigObject[val.name] = {}
        let { skuList } = val
        for (let onei = 0; onei < skuList.length; onei++) {
            console.log('onei ' + onei + 'begin')
            const sku = skuList[onei]
            const options = getOptions('/tiku/subject/list', sku.id)
            await sleep(rnd(3000, 5000))
            const response = await Post(options)
            let twoContent = response.data.as
            bigObject[val.name][sku.name] = {}
            if (!twoContent) {
                return
            }
            for (let twoi = 0; twoi < twoContent.length; twoi++) {
                console.log('twoi ' + twoi + 'begin')
                let twoCon = twoContent[twoi]
                let { a, b } = twoCon
                let twoOptions = getTikuOptions(`/paper/list`, {
                    a: sku.id.toString(), //第一步的id
                    b: a.toString(), //第二部的a
                    c: "2",//固定
                    d: 0 //固定
                })
                await sleep(rnd(3000, 5000))
                let twoRes = await Post(twoOptions)
                if (twoRes.data && twoRes.data.as) {
                    let threeContent = twoRes.data.as
                    for (let threei = 0; threei < threeContent.length; threei++) {
                        console.log('threei ' + threei + 'begin')
                        let threeCon = threeContent[threei]
                        let threeOptions = getTikuOptions(`/paper/list`, {
                            a: sku.id.toString(), //第一步的id
                            b: a.toString(), //第二部的a
                            c: "2",//固定
                            d: threeCon.a //固定
                        })
                        await sleep(rnd(3000, 5000))
                        let threeRes = await Post(threeOptions)
                        if (threeRes && threeRes.data && threeRes.data.as) {
                            let titleArray = threeRes.data.as
                            console.log(titleArray)
                            if (Array.isArray(titleArray)) {
                                getPaperByArray({
                                    titleArray,
                                    skuId: sku.id.toString(),
                                    type: val.name,//大类，会计学院
                                    sencondType: sku.name,//初级会计职称
                                    thirdType: threeCon.b,//会计概述
                                })
                            }
                        }
                    }

                }
            }
        }
    }
    console.log('done')
    fs.writeFileSync(`test.json`, JSON.stringify(aaa))

}
function getPaperByArray({
    titleArray,
    skuId,
    type,
    sencondType,
    thirdType
}) {
    let path = './papers/'
    let typePath = path + type
    let sencondPath = typePath + '/' + sencondType
    //新建文件夹
    if (!fsExistsSync(typePath)) {
        fs.mkdirSync(typePath)
    }
    if (!fsExistsSync(sencondPath)) {
        fs.mkdirSync(sencondPath)
    }
    let quesArray = []
    let j = 0
    for (let i = 0; i++; i < titleArray.length) {
        let hash = titleArray[i].e
        let options = getOption({ hash, skuId })
        startRequest(options, thirdType, list => {
            quesArray = quesArray.concat(list)
            j++
            if (j === titleArray.length) {
                quesArray = quesArray.sort((a, b) => a.subject - b.subject)
                fs.writeFileSync(`${sencondPath}/${thirdType}.json`, JSON.stringify(quesArray));
            }
        })
    }
}

function getOption({ hash, skuId }) {
    const postData = JSON.stringify({
        a: hash,
        b: 2,
        c: skuId,
        d: 6
    });

    return {
        host: "ntiku.duia.com",
        path: `/exam`,
        method: "POST",
        body: postData,
        headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Cookie": cookie,
            'Content-Length': postData.length,
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Content-Type": "application/json",
        }
    }
}
//检测文件或者文件夹存在 nodeJS
function fsExistsSync(path) {
    try {
        fs.accessSync(path, fs.F_OK);
    } catch (e) {
        return false;
    }
    return true;
}
gettwo()