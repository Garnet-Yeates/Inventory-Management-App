import { db } from "../../../server.js";

export function Table(tableName) {

    return {
        tableName,

        select(columns) {
            return new SelectQueryBuilder(tableName).select(columns);
        },

        where(whereClause) {
            return new SelectQueryBuilder(tableName).where(whereClause);
        },

        join(joinedTableName, columnMap, selectClause) {
            return new SelectQueryBuilder(tableName).join(joinedTableName, columnMap, selectClause);
        },

        removeWhere(whereClause) {
            return new DeleteQueryBuilder(tableName).where(whereClause)
        },

        insert(keyValuePairs) {
            return new InsertQueryBuilder(tableName).insert(keyValuePairs);
        }
    }

}

export class SelectQueryBuilder {

    tableName;
    selectClause = [];
    joinClauses = [];
    whereClause;
    limit = 0;

    constructor(tableName) {
        this.limit = undefined;
        this.tableName = tableName;
        createSafeExecute(this);
    }

    select(columns) {
        this.selectClause = columns;
        return this;
    }

    where(clause) {
        this.whereClause = clause;
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

    lastQuery;

    async execute() {

        let limitSQL = this.limit > 0 ? `\nLIMIT ${this.limit} ` : ""

        let selectSQL = `SELECT ${this.selectClause.length > 0 ? this.selectClause.join(", ") : "*"}`

        let fromSQL = `\nFROM ${this.tableName}`;

        let joinSQL = this.getJoinClauses()

        let whereSQL = this.whereClause ? `\nWHERE ${keyValueEquality(this.whereClause, " AND ")}` : "";

        let sql = `${selectSQL}${fromSQL}${joinSQL}${whereSQL}${limitSQL}`;

        this.lastQuery = sql;
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
            return [];
        }

        let prevTableName = this.tableName;
        this.selectClause = this.selectClause.map(element => `${this.tableName}.${element}`); 
        
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

        this.selectClause = [ ...this.selectClause, ...addToSelect ]

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

    getExplicit(selectClause, alias) {
        return 
    }
}

export class DeleteQueryBuilder {

    tableName;
    whereClause;

    constructor(tableName) {
        this.limit = undefined;
        this.tableName = tableName;
        createSafeExecute(this);
    }

    where(clause) {
        this.whereClause = clause;
        return this;
    }

    lastQuery;

    async execute() {

        let sql = `DELETE FROM ${this.tableName} \nWHERE ${keyValueEquality(this.whereClause, " AND ")}`;

        this.lastQuery = sql;
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
        createSafeExecute(this);
    }

    insert(keyValuePairs) {
        this.keyValuePairs = keyValuePairs;
        return this;
    }

    lastQuery;

    async execute() {

        let [ columnNames, columnValues ] = extractKeysAndValuesAsLists(this.keyValuePairs)

        let sql = `INSERT INTO ${this.tableName} (${columnNames}) \nVALUES (${columnValues})`;

        this.lastQuery = sql;
        printSql(sql);

        await db.query(sql);

        return true;
    }
}

// Adds a function to the queryBuilders (prevents redundancy of typing this over and over)
function createSafeExecute(queryBuilder) {
    queryBuilder.executeSafe = async function() {
        try {
            return await this.execute();
        }
        catch (err) {
            console.log(err);
            console.log(`error executing query (SelectQueryBuilder): \n${this.lastQuery} `)
            return {
                sqlError: `Error executing select query for ${this.tableName} (SelectQueryBuilder)`
            }
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

