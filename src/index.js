import Proto from 'uberproto';
import makeDebug from 'debug';
import errors from 'feathers-errors';
import filter from 'feathers-query-filters';
import * as utils from './utils';

const debug = makeDebug('feathers-couchdb-nano');

// Variable constants.
const DEFAULT_LIMIT = 100;
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

    this.db = options.db;
    this.id = options.id || '_id';
    this.events = options.events || [];
    this.paginate = options.paginate || {};
    this.model = options.Model.toString().toLowerCase();
  }

  extend (obj) {
    return Proto.extend(obj, this);
  }

  _find (params, getFilter = filter) {
    const db = this.db;
    const { filters, query } = getFilter(params.query || {});
    let [design, view] = this._getDesignView(query.q);

    if (!design || !view) {
      throw new Error('You must provide a design document using the query `q` property');
    }

    let pg = query.paginate;
    let options = {
      limit: filters.$limit || pg && pg.default || DEFAULT_LIMIT,
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
          }

          data[i] = this._formatForFeathers(tmp);
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

    return result
      .then(result => {
        return paginate && typeof paginate.default === 'number' ?
          {
            total: result.total,
            limit: result.limit,
            skip: result.skip,
            data: result.data
          } :
          result.data;
      })
      .catch(utils.errorHandler);
  }

  _get (id, params) {
    const db = this.db;

    return new Promise((resolve, reject) => {
      const callback = (err, body) => {
        let data = Object.assign({}, body);

        if (err) {
          return reject(err);
        }

        data = this._formatForFeathers(data);

        resolve(data);
      };

      return db.get(id, callback);
    });
  }

  get (id, params) {
    const result = this._get(id);

    return result
      .then(result => result)
      .catch(utils.errorHandler);
  }

  _insert (data) {
    const db = this.db;

    data = this._formatForCouch(data);

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
    const result = this._insert(data);

    return result.catch(utils.errorHandler);
  }

  update(id, data, params) {

    if (Array.isArray(data)) {
      return Promise.reject(new errors.BadRequest('Not replacing multiple records. Did you mean `patch`?'));
    }
  }

  _patch (id, data, params) {
    const db = this.db;

    // TODO: Should the _rev key be included in find and get, or should a
    //       lookup-by-id be performed before an update? Wouldn't a lookup
    //       potentially return a newer _rev token?
    if (!data._rev || !data[this.id]) {
      return Promise.reject(new errors.BadRequest('Missing document `_rev` or `_id` key.'));
    }

    return this._insert(data);
  }

  patch (id, data, params) {
    const result = this._patch(id, data);

    return result.catch(utils.errorHandler);
  }

  remove(id, params) {}
  setup(app, path) {}


  /////////////////////
  // Helpers

  _getDesignView (q) {
    const parts = q && q.split('/');
    const len = parts && parts.length;
    return [len > 0 && parts[0], len > 1 && parts[1]];
  }

  _formatForFeathers (obj) {
    const id = obj._id;

    delete obj.id;
    delete obj._id;
    delete obj[TYPE_KEY];

    obj[this.id] = id;

    return obj;
  }

  _formatForCouch (obj) {
    const id = obj[this.id];

    delete obj.id;

    obj[TYPE_KEY] = this.model;
    obj._id = id;

    return obj;
  }
}


export default function init (options) {
  return new Service(options);
}

init.Service = Service;
