import { MongoClient, MongoClientOptions } from 'mongodb';

export class MongoURL {
    shortUrl: string;
    longUrl: string;

    constructor(public host: string, public port: number, public dbName: string, public username?: string, public password?: string) {
        const auth = (!!password ? `${username || 'root'}:${password}@` : '');
        this.shortUrl = `mongodb://${auth}${host}:${port}`;
        this.longUrl = `${this.shortUrl}/${dbName}`;
    }
}

let url: MongoURL;
let _options: MongoClientOptions = {};

export async function init(host: string = 'localhost', port: number = 27017, dbName: string = 'test', options: MongoClientOptions = {}): Promise<MongoURL> {
    setOptions(options);
    if (_options.auth) {
        url = new MongoURL(host || 'localhost', port || 27017, dbName || 'test', _options.auth.user, _options.auth.password);
    } else {
        url = new MongoURL(host || 'localhost', port || 27017, dbName || 'test');
    }
    return url;
}

export function setOptions(options: MongoClientOptions = {}): void {
    _options = options;
    if (!_options.auth && process.env.MONGO_PWD) {
        _options.auth = {
            user: process.env.MONGO_USER || 'root',
            password: process.env.MONGO_PWD,
        };
    }
    _options.useNewUrlParser = true;
}

export async function load(data: Record<string, any[]>, dbName?: string, mongoClient?: MongoClient): Promise<void> {
    const getMongoClient = mongoClient ? Promise.resolve(mongoClient) : MongoClient.connect(url.shortUrl, _options);
    return getMongoClient
        .then(client => {
            const db = client.db(dbName || url.dbName);
            const queries = Object.keys(data).map(col => {
                const collection = db.collection(col);
                return collection.insertMany(data[col]);
            });
            return Promise.all(queries).then(() => client.close());
        });
}

export async function drop(mongoClient?: MongoClient): Promise<void> {
    const getMongoClient = mongoClient ? Promise.resolve(mongoClient) : MongoClient.connect(url.shortUrl, _options);
    return getMongoClient
        .then(client => client.db(url.dbName).dropDatabase().then(() => client.close()));
}

export async function deleteAll(mongoClient?: MongoClient): Promise<void> {
    let _client: MongoClient;
    const getMongoClient = mongoClient ? Promise.resolve(mongoClient) : MongoClient.connect(url.shortUrl, _options);
    return getMongoClient
        .then(client => _client = client)
        .then(client => client.db(url.dbName).collections())
        .then(cols => {
            const queries = cols.map(col => col.deleteMany({}));
            return Promise.all(queries).then(() => _client.close());
        });
}
