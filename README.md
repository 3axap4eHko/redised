# REDISed
Redis based Database

## Usage

``` javascript
const { Schema, Model, createClient } = require('redised');

const client = createClient();

// await redis connection
await client.connection;

// drop all existing data
await db.drop();

// create schema
const schema = Schema({
  id: Number,
  zip: { type: Number, index: true },
  country: { type: String, index: true },
  city: { type: String, index: true },
  address: String,
});

// create model
const Address = Model('address', schema);

// create entity
const adress1 = Adress.create({
  id: 1,
  zip: 10029,
  country: 'USA',
  state: 'NY',
  city: 'New York',
  address: '1291 5th Ave',
});

// save address
Address.set(adress1);
// get address by id
Address.get(address1.id);
// find all addresses in cities New York
Address.find({ city: 'New York' });

// close connection
db.close();
```

## Model API

 - create(data) - create a Model entity 
 - get(id) - get entity by id
 - getMany(ids) - get entities by their ids
 - find(query) - find entities with defined fields values
 - set(entity) - add or update entity
 - setMany(entities) - add or update multiple entities
 - del(...id) - delete entities by their ids 
 
## License

License [The MIT License](http://opensource.org/licenses/MIT)
Copyright (c) 2017-present Ivan Zakharchenko