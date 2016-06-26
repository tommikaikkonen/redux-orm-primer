import _factory from 'factory-girl';
import { Todo, User, Tag } from '../models';
import bluebird from 'bluebird';
import { ReduxORMAdapter } from './utils';

// factory-girl only works asynchronously with associated models,
// so we need to roll with that even though Redux-ORM is synchronous.
// We promisify factory-girl so we can use Promises instead of callbacks.
const factory = _factory.promisify(bluebird);

factory.define('Todo', 'Todo', {
    id: factory.sequence(n => n),
    text: factory.sequence(n => `Todo ${n}`),
    user: factory.assoc('User', 'id'),
    tags: factory.assocMany('Tag', 'name', 4), // 4 tags for each Todo
    done: factory.sequence(n => n % 2 ? true : false),
});

factory.define('User', 'User', {
    id: factory.sequence(n => n),
    name: factory.sequence(n => `User ${n}`),
});

factory.define('Tag', 'Tag', {
    name: factory.sequence(n => `Tag ${n}`),
});

export default factory;
