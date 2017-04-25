# feathers-couchdb-nano

[![Build Status](https://travis-ci.org/pdxbmw/feathers-couchdb-nano.png?branch=master)](https://travis-ci.org/pdxbmw/feathers-couchdb-nano)
[![Code Climate](https://codeclimate.com/github/pdxbmw/feathers-couchdb-nano/badges/gpa.svg)](https://codeclimate.com/github/pdxbmw/feathers-couchdb-nano)
[![Test Coverage](https://codeclimate.com/github/pdxbmw/feathers-couchdb-nano/badges/coverage.svg)](https://codeclimate.com/github/pdxbmw/feathers-couchdb-nano/coverage)
[![Dependency Status](https://img.shields.io/david/pdxbmw/feathers-couchdb-nano.svg?style=flat-square)](https://david-dm.org/pdxbmw/feathers-couchdb-nano)
[![Download Status](https://img.shields.io/npm/dm/feathers-couchdb-nano.svg?style=flat-square)](https://www.npmjs.com/package/feathers-couchdb-nano)

> Feathers CouchDB adapter service using Apache CouchDB Nano.

## Installation

```
npm install feathers-couchdb-nano --save
```

## Documentation

Please refer to the [feathers-couchdb-nano documentation](http://docs.feathersjs.com/) for more details.

## Options

| Name          | Type    | Description                                                   |
| ------------- | ------- | --------------------------------------------------------------|
| **db**        | Object  | Instance of CouchDB Nano database.                            |
| **events**    | Array   | List of custom service events sent by this service.           |
| **id**        | String  | Name of id field property (defaults to `_id`).                |
| **paginate**  | Object  | Pagination object containing `default` and `max` page size.   |
| **type**      | String  | Name of CouchDB document type.                                |

## Complete Example

Here's an example of a Feathers server that uses `feathers-couchdb-nano`. 

```js
const feathers = require('feathers');
const rest = require('feathers-rest');
const hooks = require('feathers-hooks');
const bodyParser = require('body-parser');
const errorHandler = require('feathers-errors/handler');
const plugin = require('feathers-couchdb-nano');

// Initialize the application
const app = feathers()
  .configure(rest())
  .configure(hooks())
  // Needed for parsing bodies (login)
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  // Initialize your feathers plugin
  .use('/plugin', plugin())
  .use(errorHandler());

app.listen(3030);

console.log('Feathers app started on 127.0.0.1:3030');
```

## License

Copyright (c) 2016

Licensed under the [MIT license](LICENSE).
