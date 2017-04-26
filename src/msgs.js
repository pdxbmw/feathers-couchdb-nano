// src/msgs.js

export default {
  DB_REQUIRED: 'You must provide an Apache CouchDB Nano database.',
  NAME_REQUIRED: 'You must provide a CouchDB document type name.',
  VIEW_REQUIRED: 'You must provide a design document using the query q property.',
  UPDATE_ARRAY_REQUIRED: 'Not replacing multiple records. Did you mean `patch`?',
  ID_OR_REV_REQUIRED: 'Missing document _rev or _id key.'
};
