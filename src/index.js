import Proto from 'uberproto';
import makeDebug from 'debug';
import filter from 'feathers-query-filters';
import * as utils from './utils';

const debug = makeDebug('feathers-couchdb-nano');

const FILE_EXISTS = 'file_exists';


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
    this.Model = options.Model.toString().toLowerCase();
    this.nano = options.nano;
    this.db = options.db;
  }

  extend (obj) {
    return Proto.extend(obj, this);
  }

  _find (params, getFilter = filter) {
    const db = this.db;
    const design = this.Model;
    const view = 'all'; // TODO: Determine how to create dynamically.
    const { filters, query } = getFilter(params.query || {});

    const options = {
      limit: filters.$limit || paginate.default || 100,
      skip: filters.$skip || 0
    };

    return new Promise((resolve, reject) => {
      return db.view(design, view, options, (err, body) => {
        const rows = body.rows;
        const n = rows.length;
        let data = [];

        if (err) {
          return reject(err);
        }

        for (let i = 0; i < n; i++) {
          const item = rows[i].key;
          const select = filters.$select;
          const m = select && Array.isArray(select) && select.length;

          data[i] = item;
          data[i].id = item._id;

          delete data[i]._id;
          delete data[i]._rev;

          if (m && m.length > 0) {
            let tmp = {};

            for (let j = 0; j < m; j++) {
              tmp[select[j]] = rows[i][select[j]];
            }

            data[i] = tmp;
          }
        }

        resolve({
          /* jshint camelcase: false */
          total: body.total_rows,
          skip: body.offset,
          limit: options.limit,
          data: data
        });
      });
    });
  }

  // Boilerplate
  find (params) {
    const db = this.db;
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

  get(id, params) {}
  create(data, params) {}
  update(id, data, params) {}
  patch(id, data, params) {}
  remove(id, params) {}
  setup(app, path) {}
}


export default function init (options) {
  return new Service(options);
}

init.Service = Service;
