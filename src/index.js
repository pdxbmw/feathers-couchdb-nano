import Proto from 'uberproto';
import errors from 'feathers-errors';
import filter from 'feathers-query-filters';
import * as utils from './utils';

// import makeDebug from 'debug';
// const debug = makeDebug('feathers-couchdb-nano');

const DEFAULT_LIMIT = 100;
const DEFAULT_SKIP = 0;
const TYPE_KEY = '$type';

class Service {
  constructor (options = {}) {
    if (!options.db || !options.db.insert) {
      throw new Error('You must provide an Apache CouchDB Nano database');
    }

    if (!options.name) {
      throw new Error('You must provide a CouchDB document type name');
    }

    this.db = options.db;
    this.events = options.events || [];
    this.id = options.id || '_id';
    this.name = options.name.toLowerCase();
    this.paginate = options.paginate || {};
  }

  extend (obj) {
    return Proto.extend(obj, this);
  }

  _find (params, getFilter = filter) {
    const db = this.db;
    const { filters, query } = getFilter(params.query || {});

    // TODO: Improve method for getting doc design view. Consider creating
    //       view if provided path doesn't exist.
    let [design, view] = this._getDesignView(query.q);
    if (!design || !view) {
      throw new Error(
        'You must provide a design document using the query "q" property'
      );
    }

    let pg = query.paginate;
    let options = {
      limit: filters.$limit || (pg && pg.default) || DEFAULT_LIMIT,
      skip: filters.$skip || DEFAULT_SKIP
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
          } else {
            tmp = Object.assign(tmp, item);
          }

          data[i] = this._formatForFeathers(tmp);
        }

        resolve({
          data,
          /* jshint camelcase: false */
          total: body.total_rows,
          skip: body.offset,
          limit: options.limit
        });
      };

      return db.view(design, view, options, callback);
    });
  }

  find (params = {}) {
    const paginate = typeof params.paginate !== 'undefined' ? params.paginate : this.paginate;
    const result = this._find(params, where => filter(where, paginate));

    return result
      .then(page => paginate.default ? page : page.data)
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

        resolve(data);
      };

      return db.get(id, callback);
    });
  }

  get (id, params) {
    const result = this._get(id);

    return result
      .then(data => this._formatForFeathers(data))
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

  update (id, data, params) {
    if (Array.isArray(data)) {
      return Promise.reject(new errors.BadRequest(
        'Not replacing multiple records. Did you mean `patch`?'
      ));
    }
  }

  patch (id, data, params) {
    if (!data._rev || !data[this.id]) {
      return Promise.reject(new errors.BadRequest(
        'Missing document `_rev` or `_id` key.'
      ));
    }

    return this._insert(data).catch(utils.errorHandler);
  }

  _remove (id, rev, params) {
    const db = this.db;

    if (!id || !rev) {
      return Promise.reject(new errors.BadRequest(
        'Missing document `_rev` or `_id` key.'
      ));
    }

    return new Promise((resolve, reject) => {
      const callback = (err, body) => {
        if (err) {
          return reject(err);
        }

        resolve(body);
      };

      return db.destroy(id, rev, callback);
    });
  }

  remove (id, params) {
    return this._get(id)
      .then(data => this._remove(data._id, data._rev))
      .catch(utils.errorHandler);
  }

  setup (app, path) {}

  /// //////////////////
  // Helpers

  _getDesignView (q) {
    const parts = q && q.split('/');
    const len = parts && parts.length;

    return [
      len > 0 && parts[0],
      len > 1 && parts[1]
    ];
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

    obj[TYPE_KEY] = this.name;
    obj._id = id;

    return obj;
  }
}

export default function init (options) {
  return new Service(options);
}

init.Service = Service;
