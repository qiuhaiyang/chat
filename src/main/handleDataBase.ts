import Datastore from 'nedb';


class DB {
    private db: Datastore;
    private orderBy: any;
    private limit: number;
    private offset: number;
    constructor(file: string) {
        this.orderBy = undefined;
        this.limit = 10;
        this.offset = 0;
        this.db = new Datastore({
            autoload: true,
            filename: file
        });
    }

    public changeDataBase(file: string) {
        this.db = new Datastore({
            autoload: true,
            filename: file
        });
    }

    public insertData(values: any) {
        return new Promise((resolve, reject) => {
            this.db.insert(values, (err) => {
                if(err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        })
    }

    public sort(orderBy: any) {
        this.orderBy = orderBy;
        return this;
    }
    public limitFnc(offset: number, limit?: number) {
        this.offset = offset || 0;
        this.limit = limit || 10;
        return this;
    }

    public queryData(query = {}, select?: any) {
        return new Promise((resolve, reject) => {
            let stmt = this.db.find(query);
            if (this.orderBy !== undefined) {
                stmt.sort(this.orderBy);
            }
            if (this.offset !== undefined) {
                stmt.skip(this.offset * this.limit).limit(this.limit);
            }
            if (select != undefined) {
                stmt.projection(select || {});
            }
            stmt.exec((err, docs) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(docs);
                }
            })
        })
    }

    public findOne(query: any) {
        return new Promise((resolve, reject) => {
            this.db.findOne(query || {}, (err, document) => {
                if(err) {
                    reject(err);
                } else {
                    resolve(document);
                }
            });
        });
    }
    public updateData(query: any, values: any, options?: Datastore.UpdateOptions) {
        return new Promise((resolve, reject) => {
            this.db.update(query || {}, values || {}, options || {}, (err, numAffected) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(numAffected);
                }
            })
        });
    }
}

export default DB;