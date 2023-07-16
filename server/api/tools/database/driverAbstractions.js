import { db } from "../../../server.js";

export function Table(tableName) {

    return {
        tableName,

        select(columns) {
            return new SelectQueryBuilder(tableName).select(columns);
        },

        where(whereMap) {
            return new SelectQueryBuilder(tableName).where(whereMap);
        },

        update(updateMap) {
            return new UpdateQueryBuilder(tableName).update(updateMap);
        },

        join(joinedTableName, columnMap, selectClause) {
            return new SelectQueryBuilder(tableName).join(joinedTableName, columnMap, selectClause);
        },

        removeWhere(whereMap) {
            return new DeleteQueryBuilder(tableName).where(whereMap)
        },

        insert(keyValuePairs) {
            return new InsertQueryBuilder(tableName).insert(keyValuePairs);
        }
    }

}

export class UpdateQueryBuilder {

    tableName;
    updateMap;
    whereMap;

    constructor(tableName) {
        this.tableName = tableName;
    }

    update(updateMap) {
        this.updateMap = updateMap;
        return this;
    }

    where(whereMap) {
        if (Object.keys(whereMap).length < 1) {
            throw new Error("whereMap cannot be empty")
        }
        this.whereMap = whereMap;
        return this;
    }

    async execute() {

        if (!this.updateMap) {
            throw new Error("updateMap must be defined")
        }

        let updateSQL = `UPDATE ${this.tableName}`

        let setSQL = `\nSET ${keyValueEquality(this.updateMap, ", ")}`

        let whereSQL = this.whereMap ? `\nWHERE ${keyValueEquality(this.whereMap, " AND ")}` : "";

        let sql = `${updateSQL}${setSQL}${whereSQL}`;

        printSql(sql);

        await db.query(sql);
    }
}

export class SelectQueryBuilder {

    tableName;
    selectColumns = [];
    joinClauses = [];
    whereMap;
    limit = undefined;

    constructor(tableName) {
        this.limit = undefined;
        this.tableName = tableName;
    }

    select(columns) {
        this.selectColumns = columns;
        return this;
    }

    where(whereMap) {
        if (Object.keys(whereMap).length < 1) {
            throw new Error("whereMap cannot be empty")
        }
        this.whereMap = whereMap;
        return this;
    }

    join(tableName, columnMap, selectClause) {
        this.joinClauses.push({ tableName, columnMap, additionalSelect: selectClause });
        return this;
    }

    first() {
        this.limit = 1;
        return this;
    }

    limit(n) {
        this.limit = n;
        return this;
    }

    list() {
        this.limit = 0;
        return this;
    }

    async execute() {

        if (this.limit === null || this.limit === undefined) {
            throw new Error("Limit must be defined")
        }

        let limitSQL = this.limit > 0 ? `\nLIMIT ${this.limit} ` : ""

        let selectSQL = `SELECT ${this.selectColumns.length > 0 ? this.selectColumns.join(", ") : "*"}`

        let fromSQL = `\nFROM ${this.tableName}`;

        let joinSQL = this.getJoinClauses()

        let whereSQL = this.whereMap ? `\nWHERE ${keyValueEquality(this.whereMap, " AND ")}` : "";

        let sql = `${selectSQL}${fromSQL}${joinSQL}${whereSQL}${limitSQL}`;

        printSql(sql);

        let [results] = await db.query(sql);

        if (this.limit == 1) {
            return results[0]
        }
        
        return results;
    }

    getJoinClauses() {

        let joinClauses = this.joinClauses

        if (joinClauses.length === 0) {
            return "";
        }

        let prevTableName = this.tableName;
        this.selectColumns = this.selectColumns.map(element => `${this.tableName}.${element}`);

        const addToSelect = [];
        const queryStrings = [];

        for (let joinClause of joinClauses) {

            let { tableName: joinedTableName, columnMap, additionalSelect = [] } = joinClause;

            columnMap = this.getExplicitColumnMap(columnMap, prevTableName, joinedTableName);

            additionalSelect = additionalSelect.map(element => `${joinedTableName}.${element}`)
            for (let column of additionalSelect) {
                addToSelect.push(column);
            }

            let onString = `ON ${keyValueEquality(columnMap, " AND ", false)}`

            queryStrings.push(`\nINNER JOIN ${joinedTableName}\n  ${onString}`)

            prevTableName = joinedTableName;
        }

        this.selectColumns = [...this.selectColumns, ...addToSelect]

        return queryStrings;
        // joinClauses: [ { tableName: "name", selectClause: { KVP } }, { ..... }]
    }

    getExplicitColumnMap(columnMap, table1Name, table2Name) {
        let newMap = {};
        for (let key in columnMap) {
            let val = columnMap[key];
            newMap[`${table1Name}.${key}`] = `${table2Name}.${val}`;
        }
        return newMap;
    }
}

export class DeleteQueryBuilder {

    tableName;
    whereMap;

    constructor(tableName) {
        this.limit = undefined;
        this.tableName = tableName;
    }

    where(whereMap) {
        if (Object.keys(whereMap).length < 1) {
            throw new Error("whereMap cannot be empty")
        }
        this.whereMap = whereMap;
        return this;
    }

    async execute() {

        let sql = `DELETE FROM ${this.tableName} \nWHERE ${keyValueEquality(this.whereMap, " AND ")}`;

        printSql(sql);

        await db.query(sql);
    }
}

export class InsertQueryBuilder {

    tableName;
    keyValuePairs;

    constructor(tableName) {
        this.limit = undefined;
        this.tableName = tableName;
    }

    insert(keyValuePairs) {
        this.keyValuePairs = keyValuePairs;
        return this;
    }

    async execute() {

        let [columnNames, columnValues] = extractKeysAndValuesAsLists(this.keyValuePairs)

        let sql = `INSERT INTO ${this.tableName} (${columnNames}) \nVALUES (${columnValues})`;

        printSql(sql);

        await db.query(sql);

        return true;
    }
}

export function removeNullish(object) {
    for (let key of object) {
        if (object[key] === null || object[key] === undefined) {
            delete object[key];
        }
    }
}

export function throwIfAnyKeyIsNullish(obj) {
    for (let key of Object.keys(obj)) {
        if (obj[key] === null || obj[key] === undefined) {
            throw new Error(`${key} can not be null`)
        }
    }
}

const extractKeysAndValuesAsLists = (o, separator = ", ") => ([Object.keys(o).join(separator), Object.values(o).map(val => getValueAsSQLString(val)).join(separator)]);

function keyValueEquality(whereClause, separator, convertValueToSQLString = true) {
    if (!whereClause) {
        return "";
    }

    let keys = Object.keys(whereClause);
    let values = Object.values(whereClause).map(value => convertValueToSQLString ? getValueAsSQLString(value) : value);

    let zipped = keys.map((key, index) => {
        let val = values[index];
        return [key, val].join(" = ");
    })

    return zipped.join(separator);
}

function getValueAsSQLString(str) {
    switch (typeof str) {
        case "string":
            return `'${str}'`;
        default:
            return `${str}`
    }
}

function printSql(sql) {
    console.log("\nSQL Generated: ", `\n${sql}\n`)
}