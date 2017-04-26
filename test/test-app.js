import { DOC_NAME, DB_NAME, DB_URI } from './constants';
import feathers from 'feathers';
import rest from 'feathers-rest';
import nano from 'nano';
import errorHandler from 'feathers-errors/handler';
import bodyParser from 'body-parser';
import plugin from '../src';

export default new Promise((resolve) => {
  const cxn = nano(DB_URI);

  cxn.db.create(DB_NAME, () => {
    const options = {
      db: cxn.use(DB_NAME),
      name: DOC_NAME,
      paginate: {
        default: 2,
        max: 4
      }
    };

    const app = feathers()
      .configure(rest())
      .use(bodyParser.json())
      .use(bodyParser.urlencoded({ extended: true }))
      .use(options.name, plugin(options))
      .use(errorHandler());

    const server = app.listen(3333);

    server.on('listening', () => {
      console.log('Feathers CouchDB Nano service running on 127.0.0.1:3333');
      resolve(server);
    });
  });
});
