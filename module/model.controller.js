module.exports = {
    updateDataModel,
    updateBankModel,
    getOldDataModel,
    getOldBankModel
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
                    right: detail[key]['right'],
                    wrong: detail[key]['wrong']
                };
            } else {
                if (detail[key]['type'] === "right") {
                    cellDeatil[key][qname]["right"] += detail[key]['right'];
                } else {
                    cellDeatil[key][qname]["wrong"] += detail[key]['wrong'];
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
                right: detail['right'],
                wrong: detail['wrong'],
                wrighted: detail['wrighted']
            };
        } else {
            if (detail[key]['type'] === "right") {
                cellDeatil[qname]["right"] += detail['right'];
            } else {
                cellDeatil[qname]["wrong"] += detail['wrong'];
            }
            cellDeatil['wrighted'] += detail['wrighted']
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
        let params;
        if (!!dateTime) {
            params = {
                "user_id": ` = ${user_id}`,
                "data": ` = ${dateTime}`
            }
        } else {
            params = {
                "user_id": ` = ${user_id}`,
            }
        }
        const response = selectFromSql('datamodel', params);
        if (Array.isArray(response) && response.length > 0) {
            return {
                isDefault: true,//标记是否已经存在
                cell: response[0]
            }
        } else {
            return {
                isDefault: false,//标记是否已经存在
                cell: {
                    user_id,
                    date: dateTime
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

async function getOldBankModel({ user_id, bankname }) {
    try {
        let params;
        if (!!bankname) {
            params = {
                "user_id": ` = ${user_id}`,
                "bankname": ` = ${bankname}`
            }
        } else {
            params = {
                "user_id": ` = ${user_id}`,
            }
        }
        const response = selectFromSql('bankmodel', params);
        if (Array.isArray(response) && response.length > 0) {
            return {
                isDefault: true,//标记是否已经存在
                cell: response[0]
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
        if (idDataIndex < 0) {
            useridAndDate.push(user_id)
            let dataModelDetail = {
                user_id,
                detail: {}
            }
            dataModelDetail["detail"][bankname] = dataModelDetail["detail"][bankname] || {}
            dataModelDetail["detail"][bankname][qname] = res;
            dataModel.push(dataModelDetail)
        } else {
            let dataModelDetail = dataModel[idDataIndex]
            dataModelDetail["detail"][bankname] = dataModelDetail["detail"][bankname] || {}
            dataModelDetail["detail"][bankname][qname] = res;
        }
        //bankmodel
        const idAndBankname = `${user_id}_${bankname}`;
        const idBankIndex = useridAndBankname.indexOf(idAndBankname);
        if (idBankIndex < 0) {
            useridAndBankname.push(idAndBankname);
            let dataBankDetail = {
                user_id,
                bankname,
                detail: {
                    "qname": res
                }
            }
            dataBank.push(dataBankDetail);
        } else {
            let dataBankDetail = dataBank[idBankIndex];
            dataBankDetail.detail["qname"] = res;
        }
    })
    return {
        dataModel,
        dataBank
    }
}