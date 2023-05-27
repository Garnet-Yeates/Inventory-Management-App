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
    selectClause;
    whereClause;
    limit;

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

        if (this.limit === undefined) {
            throw new Error("Limit must be defined")
        }

        let limit = this.limit > 0 ? `LIMIT ${this.limit} ` : ""

        let select = this.selectClause ? this.selectClause.join(", ") : "*";

        let sql = `SELECT ${select} FROM ${this.tableName} \nWHERE ${keyValueEquality(this.whereClause, " AND ")} \n${limit}`;

        this.lastQuery = sql;
        printSql(sql);

        let [results] = await db.query(sql);

        if (this.limit == 1) {
            return results[0]
        }

        return results;
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

        let sql = `DELETE FROM  ${this.tableName} \nWHERE ${keyValueEquality(this.whereClause, " AND ")}`;

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

        let [ columnNames, columnValues ] = keyValueSeparator(this.keyValuePairs)

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

function keyValueSeparator(o) {
    let keys = Object.keys(o);
    let vals = Object.values(o).map(val => getValueAsSQLString(val));
    return [ `${keys.join(', ')}`, `${vals.join(', ')}`]
}

function keyValueEquality(whereClause, separator) {
    if (!whereClause) {
        return "";
    }

    let keys = Object.keys(whereClause);
    let values = Object.values(whereClause);
    values = values.map(value => getValueAsSQLString(value))

    let zipped = keys.map((element, index) => {
        return [element, values[index]].join(" = ");
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

