import Proto from 'uberproto';
import makeDebug from 'debug';
import filter from 'feathers-query-filters';
import * as utils from './utils';

const debug = makeDebug('feathers-couchdb-nano');

// Variable constants.
const FILE_EXISTS = 'file_exists';
const TYPE_KEY = '$type';


class Service {
  constructor (options) {
    if (!options) {
      throw new Error('CouchDB options have to be provided')
    }

    if (!options.db || !options.db.insert) {
      throw new Error('You must provide a Apache CouchDB Nano database');
    }

    if (!options.Model) {
      throw new Error('You must provide a CouchDB Model name')
    }

    this.id = options.id || '_id';
    this.events = options.events || [];
    this.paginate = options.paginate || {};
    this.model = options.Model.toString().toLowerCase();
    this.nano = options.nano;
    this.db = options.db;
  }

  extend (obj) {
    return Proto.extend(obj, this);
  }

  _find (params, getFilter = filter) {
    const db = this.db;
    const { filters, query } = getFilter(params.query || {});

    if (!query.q) {
      throw new Error('You must provide a design document using the query `q` property');
    }

    const [design, view] = query.q.split('/');
    const options = {
      limit: filters.$limit || paginate.default || 100,
      skip: filters.$skip || 0
    };

    return new Promise((resolve, reject) => {
      const callback = (err, body) => {
        const rows = body.rows;
        const n = rows.length;
        let data = [];

        if (err) {
          return reject(err);
        }

        for (let i = 0; i < n; i++) {
          const item = rows[i].key;
          const sel = filters.$select;
          let j = sel && Array.isArray(sel) && sel.length;
          let tmp = {};

          // Filtered select query.
          if (j && j.length > 0) {
            while (j--) {
              tmp[sel[j]] = rows[i][sel[j]];
            }
          }
          else {
            tmp = Object.assign(tmp, item);

            tmp.id = tmp._id;

            delete tmp._id;
            delete tmp._rev;
            delete tmp[TYPE_KEY];
          }

          data[i] = tmp;
        }

        resolve({
          /* jshint camelcase: false */
          total: body.total_rows,
          skip: body.offset,
          limit: options.limit,
          data: data
        });
      };

      return db.view(design, view, options, callback);
    });
  }

  find (params) {
    const paginate = params && typeof params.paginate !== 'undefined' ? params.paginate : this.paginate;
    const result = this._find(params, where => filter(where, paginate));

    return result.then(result => {
      return {
        total: result.total,
        limit: result.limit,
        skip: result.skip,
        data: result.data
      };
    }).catch(utils.errorHandler);
  }

  _get (id, params) {
    const db = this.db;

    return new Promise((resolve, reject) => {
      const callback = (err, body) => {
        let data = Object.assign({}, body);

        if (err) {
          return reject(err);
        }

        data.id = data._id;

        delete data._id;
        delete data._rev;
        delete data[TYPE_KEY];

        resolve(data);
      };

      return db.get(id, callback);
    });
  }

  get (id, params) {
    const result = this._get(id);

    return result.then(result => result).catch(utils.errorHandler);
  }

  _create (data) {
    const db = this.db;

    data[TYPE_KEY] = this.model;

    return new Promise((resolve, reject) => {
      const callback = (err, body) => {
        if (err) {
          return reject(err);
        }

        resolve(body);
      };

      return db.insert(data, callback);
    });
  }

  create (data, params) {
    const result = this._create(data);

    return result.catch(utils.errorHandler);
  }

  update(id, data, params) {}
  patch(id, data, params) {}
  remove(id, params) {}
  setup(app, path) {}
}


export default function init (options) {
  return new Service(options);
}

init.Service = Service;
