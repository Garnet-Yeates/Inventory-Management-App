export default function createDatabase(con) {

    con.connect(function(err) {
      if (err) throw err;
      console.log("Connected to SQL server");
    });

    let db = con.promise();

    return db;
}