import errors from 'feathers-errors';

// https://github.com/feathersjs/feathers-errors
export function errorHandler (error) {
  let feathersError = error;

  if (error.name) {
    switch (error.name) {
      case 'CouchError':
        if (error.code === 404 || error.headers.status === 404) {
          feathersError = new errors.NotFound(error);
        } else {
          feathersError = new errors.GeneralError(error);
        }
        break;
    }
  }

  throw feathersError;
}