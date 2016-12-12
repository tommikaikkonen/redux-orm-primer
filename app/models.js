/* eslint-disable default-case, no-shadow */
import { ORM, Model, many, fk, attr } from 'redux-orm';
import { PropTypes } from 'react';
import propTypesMixin from 'redux-orm-proptypes';
import {
    CREATE_TODO,
    MARK_DONE,
    DELETE_TODO,
    ADD_TAG_TO_TODO,
    REMOVE_TAG_FROM_TODO,
} from './actionTypes';

const ValidatingModel = propTypesMixin(Model);

export class Tag extends ValidatingModel {
    static reducer(action, Tag) {
        const { payload, type } = action;
        switch (type) {
        case CREATE_TODO:
            const tags = payload.tags.split(',');
            const trimmed = tags.map(name => name.trim());
            trimmed.forEach(name => Tag.create({ name }));
            break;
        case ADD_TAG_TO_TODO:
            if (!Tag.filter({ name: payload.tag }).exists()) {
                Tag.create({ name: payload.tag });
            }
            break;
        }
    }
}
Tag.modelName = 'Tag';
Tag.options = {
    idAttribute: 'name',
};
Tag.fields = {
    name: attr(),
}

export class User extends ValidatingModel {}
User.modelName = 'User';
User.fields = {
    id: attr(),
    name: attr(),
};

export class Todo extends ValidatingModel {
    static reducer(action, Todo, session) {
        console.log('Todo reducer');
        const { payload, type } = action;
        switch (type) {
        case CREATE_TODO:
            // Payload includes a comma-delimited string
            // of tags, corresponding to the `name` property
            // of Tag, which is also its `idAttribute`.
            const tagIds = action.payload.tags.split(',').map(str => str.trim());

            // You can pass an array of ids for many-to-many relations.
            // `redux-orm` will create the m2m rows automatically.
            const props = Object.assign({}, payload, { tags: tagIds, done: false });
            Todo.create(props);
            break;
        case MARK_DONE:
            // withId returns a Model instance.
            // Assignment doesn't mutate Model instances.
            Todo.withId(payload).done = true;
            break;
        case DELETE_TODO:
            Todo.withId(payload).delete();
            break;
        case ADD_TAG_TO_TODO:
            Todo.withId(payload.todo).tags.add(payload.tag);
            break;
        case REMOVE_TAG_FROM_TODO:
            Todo.withId(payload.todo).tags.remove(payload.tag);
            break;
        }
    }
}
Todo.modelName = 'Todo';
Todo.fields = {
    id: attr(),
    done: attr(),
    text: attr(),
    tags: many('Tag', 'todos'),
    user: fk('User', 'todos'),
};
Todo.propTypes = {
    text: PropTypes.string.isRequired,
    done: PropTypes.bool.isRequired,
    user: PropTypes.oneOfType([
        PropTypes.instanceOf(User),
        PropTypes.number,
    ]).isRequired,
    tags: PropTypes.arrayOf(PropTypes.oneOfType([
        PropTypes.instanceOf(Tag),
        PropTypes.string,
    ])).isRequired,
};
Todo.defaultProps = {
    done: false,
};

export const orm = new ORM();
orm.register(Todo, Tag, User);

export default orm;
