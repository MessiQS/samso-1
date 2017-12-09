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
                success:int,
                error:int
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
                    success: detail[key]['success'],
                    error: detail[key]['error']
                };
            } else {
                if (detail[key]['type'] === "success") {
                    cellDeatil[key][qname]["success"] += detail[key]['success'];
                } else {
                    cellDeatil[key][qname]["error"] += detail[key]['error'];
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
            success:int,
            error:int
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
                success: detail['success'],
                error: detail['error'],
                score: detail['score']
            };
        } else {
            if (detail[key]['type'] === "success") {
                cellDeatil[qname]["success"] += detail['success'];
            } else {
                cellDeatil[qname]["error"] += detail['error'];
            }
            cellDeatil['score'] += detail['score']
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