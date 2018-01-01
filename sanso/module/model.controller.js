

//链接数据库的类
const {
	sqlFormat
} = require('../service/connect');
const {
	selectFromSql,
    insertToSql,
    updateToSql
} = new sqlFormat();
const moment = require('moment')
module.exports = {
    updateDataModel,
    updateBankModel,
    getOldDataModel,
    getOldBankModel,
    dealWithData,
}

/*
    detail:{
        bankname{
            qname:{
                right:int,
                wrong:int
            }
        }
    }
*/
async function updateDataModel(data) {
    const dateTime = moment().format('YYYY-MM-DD');
    const { user_id, detail } = data;
    if(!detail || Object.keys(detail).length === 0){
        return;
    }
    const oldCell = await getOldDataModel({
        user_id,
        dateTime
    })
    if (oldCell.error) {
        console.log(oldCell.source)
        return;
    }
    let { isDefault, cell } = oldCell;
    let cellDeatil = isDefault ? JSON.parse(cell.detail) : {};
    for (let key of detail) {
        if (!cellDeatil[key]) {
            cellDeatil[key] = {};
        }
        for (let qname of detail[key]) {
            if (!cellDeatil[key][qname]) {
                cellDeatil[key][qname] = {
                    right: detail[key][qname]['right'],
                    wrong: detail[key][qname]['wrong']
                };
            } else {
                if (detail[key]['type'] === "right") {
                    cellDeatil[key][qname]["right"] += detail[key][qname]['right'];
                } else {
                    cellDeatil[key][qname]["wrong"] += detail[key][qname]['wrong'];
                }
            }

        }
    }
    if (isDefault) {
        updateToSql('datamodel', {
            detail: JSON.stringify(cellDeatil)
        }, {
                "user_id": ` = ${user_id}`,
                "data": ` = ${dateTime}`
            })
    } else {
        cell.detail = JSON.stringify(cellDeatil);
        insertToSql('datamodel', cell)
    }
}


/*
    detail:{
        qname:{
            right:int,
            wrong:int
        }
    }
*/
async function updateBankModel(data) {
    const { user_id, bankname, detail } = data;
    if(!detail || Object.keys(detail).length === 0){
        return;
    }
    const oldCell = await getOldBankModel({
        user_id,
        bankname
    })
    if (oldCell.error) {
        console.log(oldCell.source)
        return;
    }
    let { isDefault, cell } = oldCell;
    let cellDeatil = isDefault ? JSON.parse(cell.detail) : {};
    for (let qname of detail) {
        if (!cellDeatil[qname]) {
            cellDeatil[qname] = {
                right: detail[qname]['right'],
                wrong: detail[qname]['wrong'],
                wrighted: detail[qname]['wrighted']
            };
        } else {
            if (detail[key]['type'] === "right") {
                cellDeatil[qname]["right"] += detail[qname]['right'];
            } else {
                cellDeatil[qname]["wrong"] += detail[qname]['wrong'];
            }
            cellDeatil['wrighted'] += detail[qname]['wrighted']
        }

    }
    if (isDefault) {
        updateToSql('bankmodel', {
            detail: JSON.stringify(cellDeatil)
        }, {
                "user_id": ` = ${user_id}`,
                "bankname": ` = ${bankname}`
            })
    } else {
        cell.detail = JSON.stringify(cellDeatil);
        insertToSql('bankmodel', cell)
    }
}

async function getOldDataModel({ user_id, dateTime }) {
    try {
        let params,
            /*
            type 表示获取数据的类型
            共三种
            all 表示拉取所有信息
            arrry 表示拉一个 数据
            simple 表示一个
            */
            type = "all",
            isDefault = false;//标记是否已经存在
        if (!!dateTime && !Array.isArray(dateTime)) {
            type = "simple";
            params = {
                "user_id": ` = "${user_id}"`,
                "data": ` = "${dateTime}"`
            }
        } else if (!!dateTime && Array.isArray(dateTime)) {
            type = "arrry";
            params = {
                "user_id": ` = "${user_id}"`,
            }
        } else {
            type = "all";
            params = {
                "user_id": ` = "${user_id}"`,
            }
        }
        const response = selectFromSql('datamodel', params);
        let cell;
        if (Array.isArray(response) && response.length > 0) {
            response.forEach(res => {
                res.detail = res.detail ? JSON.parse(dataModel.detail) : null
            });
            switch (type) {
                case 'all':
                    cell = response
                    break;
                case 'array':
                    cell = response.filter(res => dateTime.indexOf(res.data) >= 0)
                    break
                case 'simple':
                    cell = response[0]
                    break
            }
            isDefault = true
        } else {
            switch (type) {
                case 'all':
                    cell = null
                    break;
                case 'array':
                    cell = dateTime.map(res => {
                        return {
                            user_id,
                            date: res
                        }
                    })
                    break
                case 'simple':
                    cell = {
                        user_id,
                        date: dateTime
                    }
                    break
            }
        }
        return {
            isDefault,
            cell
        }
    } catch (source) {
        return {
            error: true,
            source
        };
    }
}

async function getOldBankModel({ user_id, bankname }) {
    try {
        let params;
        if (!!bankname) {
            params = {
                "user_id": ` = "${user_id}"`,
                "AND bankname": ` = "${bankname}"`
            }
        } else {
            params = {
                "user_id": ` = "${user_id}"`,
            }
        }
        const response = selectFromSql('bankmodel', params);
        if (Array.isArray(response) && response.length > 0) {
            response.forEach(res => {
                res.detail = res.detail ? JSON.parse(dataModel.detail) : null
            });
            return {
                isDefault: true,//标记是否已经存在
                cell: bankname ? response : response[0]
            }
        } else {
            return {
                isDefault: false,//标记是否已经存在
                cell: {
                    user_id,
                    bankname
                }
            }
        }
    } catch (source) {
        return {
            error: true,
            source
        };
    }
}

function dealWithData(copyGlobalData) {
    let dataModel = [],
        dataBank = [];
    const useridAndBankname = [];//用来限制datamodel去重
    const useridAndDate = [];//用来限制dataBank去重
    copyGlobalData.forEach(res => {
        const { user_id, bankname, qname } = res;
        //datamodel 
        const idDataIndex = useridAndDate.indexOf(user_id);
        let dataModelDetail;
        if (idDataIndex < 0) {
            useridAndDate.push(user_id)
            dataModelDetail = {
                user_id,
                detail: {}
            }
            dataModel.push(dataModelDetail)
        } else {
            dataModelDetail = dataModel[idDataIndex]
        }
        dataModelDetail["detail"][bankname] = dataModelDetail["detail"][bankname] || {}
        let qnameDetail = dataModelDetail["detail"][bankname][qname]
        if (!qnameDetail) {
            dataModelDetail["detail"][bankname][qname] = {
                "right": res.type === "right" ? 1 : 0,
                "wrong": res.type === "right" ? 0 : 1,
                "weighted": res.weighted
            };
        } else {
            qnameDetail = {
                "right": res.type === "right" ? qnameDetail["right"]++ : qnameDetail["right"],
                "wrong": res.type === "right" ? qnameDetail["wrong"] : qnameDetail["wrong"]++,
                "weighted": qnameDetail["weighted"] + res.weighted
            }
        }


        //bankmodel
        const idAndBankname = `${user_id}_${bankname}`;
        const idBankIndex = useridAndBankname.indexOf(idAndBankname);
        let dataBankDetail;
        if (idBankIndex < 0) {
            useridAndBankname.push(idAndBankname);
            dataBankDetail = {
                user_id,
                bankname,
                detail: {}
            }
            dataBank.push(dataBankDetail);
        } else {
            dataBankDetail = dataBank[idBankIndex];
        }
        let bankQnameDeatil = dataBankDetail["detail"][qname];
        if (!bankQnameDeatil) {
            dataBankDetail["detail"][qname] = {
                "right": res.type === "right" ? 1 : 0,
                "wrong": res.type === "right" ? 0 : 1,
                "weighted": res.weighted
            }
        } else {
            bankQnameDeatil = {
                "right": res.type === "right" ? bankQnameDeatil["right"]++ : bankQnameDeatil["right"],
                "wrong": res.type === "right" ? bankQnameDeatil["wrong"] : bankQnameDeatil["wrong"]++,
                "weighted": bankQnameDeatil["weighted"] + res.weighted
            }
        }

    })
    return {
        dataModel,
        dataBank
    }
}