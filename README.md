# Creating a Simple App with Redux-ORM

This article shows you how to create and test a simple todo application with some related data using [Redux-ORM](https://github.com/tommikaikkonen/redux-orm). I'll assume you're already familiar with Redux and React. The source for the app is in this repository and you can play around with the [live demo here](http://tommikaikkonen.github.io/redux-orm-primer).

![Screenshot of the Example App](https://raw.githubusercontent.com/tommikaikkonen/redux-orm-primer/master/screenshot.png)

## Overview of Redux-ORM

You want your data to be normalized in your Redux store. Now if your data is relational, your state is bound to look like tables in a relational database, because that's the normalized way to represent that kind of data.

As you write your Redux reducers and selectors, you want to divide them to small functions to create a hierarchy of functions. This makes the functions easy to test and reason about, and is one of the great things about Redux. 

You might have a reducer for a list of entities, lets say restaurants. To store information about restaurants, you have an `items` array of restaurant id's, and an `itemsById` map. In the main restaurant reducer, you delegate to separate `items` and `itemsById` reducers. You create another subreducer inside `itemsById` reducer that applies updates on individual restaurants' attributes.

That works great until you need to access employee entities related to that restaurant. The state supplied to your restaurant reducers doesn't have information about employees.

You might end up at some of these solutions to the problem:

- use `redux-thunk` to query the state with `getState` before dispatching the final action object with all the data needed for the separate reducers to do their job,
- write the reducer / selector logic higher up in the hierarchy or
- pass a larger piece of state to child reducers / selectors as an additional argument.

You can work with all these, but in my opinion, they get hairy to manage. Your code ends up handling a lot of low-level logic, and the bigger picture gets lost.

Redux-ORM provides an abstraction over the "relational database" state object. You define a schema through models, and start database sessions by passing a Schema instance the relational database state object. Reducers and selectors are able to respectively update and query the whole database through an immutable ORM API, which makes your code more expressive, readable and manageable.

In practice, the workflow with Redux-ORM looks like this:

1. Declare the relational schema with model classes
2. Write model-specific reducers to edit data
3. Write selectors to query data for connected components and actions
4. Plug the Redux-ORM reducer somewhere in your Redux reducer.

## Designing State For Our App

In our app we have Users, Todos and Tags. Every Todo is associated with a single User. A Todo can have multiple Tags, and a Tag can have multiple Todos.

The schema looks like this:

```
**User**
- id: integer
- name: string

**Todo**
- id: integer
- text: string
- done: boolean
- user: foreign key to User
- tags: many-to-many relation with Tag

**Tag**
- name: string (used as the primary key)
```

Additionally we'll store the selected user id in the Redux state, but outside the relational database. Our Redux state would look something like this:

```javascript
{
    orm: {/* the relational database state */},
    selectedUserId: 0,
}
```

The following actions are possible:

- Select a User
- Create a Todo with Tags
- Mark a Todo done
- Add a Tag to a Todo
- Remove a Tag from a Todo
- Delete a Todo

An app this simple would not normally warrant using an ORM, but it'll do great to get you up to speed.

## Defining Models

To let Redux-ORM know about the structure of our relational data, we create models. They are ES6 classes that extend from Redux-ORM's `Model`, which means that you can define any helper methods or attributes you might need on your models.

You'll often want to define your own base model for your project that extends from Model, and continue to extend your concrete models from that. The base model can contain, for example, functionality related to async calls and validation which Redux-ORM doesn't provide. The methods will be accessible to you when using the ORM API. This example will use vanilla Model classes.

Let's begin writing our Models.

```javascript
// models.js
import { Model } from 'redux-orm';

export class Todo extends Model {}
// Note that the modelName will be used to resolve
// relations!
Todo.modelName = 'Todo';

export class Tag extends Model {
}
Tag.modelName = 'Tag';
Tag.backend = {
    idAttribute: 'name';
};

export class User extends Model {}
User.modelName = 'User';

```

Just like React components need a `displayName`, models need a `modelName` so that running the code through a mangler won't break functionality. The value in `modelName` will be used to construct the relations. We also pass a `backend` attribute to Tag, where we define the custom setting `idAttribute`, so that we identify tags by its `name` attribute like we defined in the schema. The default `idAttribute` is `id`.

To declare how these models are related, we specify a static `fields` variable to the model class, where you declare the type of relations (`fk` for many to one, `oneToOne` for one to one, and `many` for many to many).

```javascript
// models.js
import { Model, many, fk, Schema } from 'redux-orm';

export class Todo extends Model {}
Todo.modelName = 'Todo';
Todo.fields = {
    user: fk('User', 'todos'),
    tags: many('Tag', 'todos'),
};

export class Tag extends Model {}
Tag.modelName = 'Tag';
Tag.backend = {
    idAttribute: 'name';
};

export class User extends Model {}
User.modelName = 'User';
```

`many`, `fk` and `oneToOne` field factories take two arguments: the related model's `modelName` and an optional reverse field name. If the reverse field name is not specified, it will be autogenerated (the default way to access Todos related to a user instance would be `user.todoSet`). For example, the declaration

```javascript
tags: many('Tag', 'todos'),
```

means that accessing the `todos` property of a Tag model instance returns the set of Todo's that have that tag. The value returned by `tagInstance.todos` is not an array but a `QuerySet` instance, which enables filtering, ordering, editing and reading operations on a set of entities.

> ### How State Is Managed For Many-To-Many Relations
>
> Redux-ORM internally mimics relational databases and creates a new "table" for many-to-many relations, represented by an internal "through" Model class.
> So when we define this field on a Todo:
>
> ```javascript
> tags: many('Tag', 'todos'),
> ```
>
> Redux-ORM creates a model named `TodoTags`, that's entities are in this form:
> ```javascript
> {
>     id: 0,
>     fromTodoId: 0,
>     toTagId: 1,
> }
> ```

What about non-relational fields like `User.name`, `Todo.text` and `Todo.done` that we defined in our schema plan? You don't need to declare non-relational fields in Redux-ORM. You can assign attributes to Model instances as if they were JavaScript objects. Redux-ORM takes care of "shallow immutability" in the model instances, so assignment to Model instances happens in an immutable fashion, but the immutability of the assigned values is your responsibility. This is only a concern if you assign referential (Object or Array) values to a Model instance and mutate those values.

> ### Using PropTypes to validate non-relational fields
> 
> In non-trivial applications, it's smart to validate non-relational fields,
> just like you validate incoming props on React components. [This gist](https://gist.github.com/tommikaikkonen/45d0d2ff2a5a383bb14d) shows you how to define a Model subclass, `ValidatingModel`, that you can use to define your concrete models. You could use it with the Todo model like this:
>
> ```javascript
> class Todo extends ValidatingModel {}
> // ...
> Todo.propTypes = {
>     id: React.PropTypes.number,
>     text: React.PropTypes.string.isRequired,
>     done: React.PropTypes.boolean.isRequired,
>     user: React.PropTypes.oneOf([
>         React.PropTypes.instanceOf(User),
>         React.PropTypes.number
>     ]).isRequired,
>     tags: React.PropTypes.arrayOf([
>         React.PropTypes.instanceOf(Tag),
>         React.PropTypes.number
>     ]),
> };
> 
> Todo.defaultProps = {
>     done: false,
> };
> ```

## Defining Actions and Action Creators

First up, let's define our action type constants:

```javascript
// actionTypes.js
export const SELECT_USER = 'SELECT_USER';
export const CREATE_TODO = 'CREATE_TODO';
export const MARK_DONE = 'MARK_DONE';
export const ADD_TAG_TO_TODO = 'ADD_TAG_TO_TODO';
export const REMOVE_TAG_FROM_TODO = 'REMOVE_TAG_FROM_TODO';
export const DELETE_TODO = 'DELETE_TODO';
```

And here are our simple action creators.

```javascript
// actions.js
import {
    SELECT_USER,
    CREATE_TODO,
    MARK_DONE,
    DELETE_TODO,
    ADD_TAG_TO_TODO,
    REMOVE_TAG_FROM_TODO,
} from './actionTypes';

export const selectUser = id => {
    return {
        type: SELECT_USER,
        payload: id,
    };
};

export const createTodo = props => {
    return {
        type: CREATE_TODO,
        payload: props,
    };
};

export const markDone = id => {
    return {
        type: MARK_DONE,
        payload: id,
    };
};

export const deleteTodo = id => {
    return {
        type: DELETE_TODO,
        payload: id,
    };
};

export const addTagToTodo = (todo, tag) => {
    return {
        type: ADD_TAG_TO_TODO,
        payload: {
            todo,
            tag,
        },
    };
};

export const removeTagFromTodo = (todo, tag) => {
    return {
        type: REMOVE_TAG_FROM_TODO,
        payload: {
            todo,
            tag,
        },
    };
};

```

Pretty standard stuff.

## Writing Reducers

Redux-ORM uses model-specific reducers to operate on data. You define a static `reducer` method on Model classes, which will receive all Redux-dispatched actions. If you don't define a `reducer`, the default implementation will be used, which calls `.getNextState` on the model class and returns the value.

First up, we'll write the reducer for the Todo model. Note that when creating a Todo, we want to pass a comma-delimited list of tags in the user interface and create the Tag instances based on that.

```javascript
// models.js
import { Schema, Model, many, fk } from 'redux-orm';
import {
    CREATE_TODO,
    MARK_DONE,
    DELETE_TODO,
    ADD_TAG_TO_TODO,
    REMOVE_TAG_FROM_TODO,
} from './actionTypes';

export class Todo extends Model {
    static reducer(state, action, Todo, session) {
        const { payload, type } = action;
        switch (type) {
        case CREATE_TODO:
            // Payload includes a comma-delimited string
            // of tags, corresponding to the `name` property
            // of Tag, which is also its `idAttribute`.
            const tagIds = action.payload.tags.split(',').map(str => str.trim());

            // You can pass an array of ids for many-to-many relations.
            // `redux-orm` will create the m2m rows automatically.
            const props = Object.assign({}, payload, { tags: tagIds });
            Todo.create(props);
            break;
        case MARK_DONE:
            // withId returns a Model instance.
            // Assignment doesn't mutate Model instances.
            Todo.withId(payload).set('done', true);
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

        // This call is optional. If the reducer returns `undefined`,
        // Redux-ORM will call getNextState for you.
        return Todo.getNextState();
    }
}
Todo.modelName = 'Todo';
Todo.fields = {
    tags: many('Tag', 'todos'),
    user: fk('User', 'todos'),
};

```

All Model reducers receive four arguments: the model state, the current action, the Model class, and the current Redux-ORM Session instance. You usually won't need the Session instance, but you can access and query other models through the Session instance (for example, you can access the Tag model through `session.Tag`), but modifying other model's data is not recommended nor supported.

Redux-ORM enables you to be pretty expressive in your reducers and not worry about the low level stuff. All of the actions done during a session (`create`, `delete`, `add`, `set`, `update`, `remove`) record updates, which will be applied in the new state returned by `Todo.getNextState()`.

Here's the reducer for Tag. Our simple app won't have any actions that act on User data, so we won't write a reducer for it.

```javascript
// models.js
// ...
export class Tag extends Model {
    static reducer(state, action, Tag) {
        const { payload, type } = action;
        switch (type) {
        case CREATE_TODO:
            const tags = payload.tags.split(',');
            const trimmed = tags.map(name => name.trim());
            trimmed.forEach(name => Tag.create({ name }));
            break;
        case ADD_TAG_TO_TODO:
            // Check if the tag already exists
            if (!Tag.filter({ name: payload.tag }).exists()) {
                Tag.create({ name: payload.tag });
            }
            break;
        }

        // Tag.getNextState will be implicitly called for us
    }
}
Tag.modelName = 'Tag';
Tag.backend = {
    idAttribute: 'name',
};
```

Now that we've finished our Model definitions, we create a Schema instance, register our models and export it as the default export of models.js:

```javascript
// models.js
// ... model definitions above
export const schema = new Schema();
schema.register(Todo, Tag, User);

export default schema;
```

We'll use the `schema` instance later to create selectors and inject the ORM reducer to Redux.

We have one additional reducer outside Redux-ORM we need to define, `selectedUserIdReducer`. We'll put it in `reducers.js`. It's very simple as it maintains a single number corresponding to the selected User id.

```javascript
// reducers.js
import { SELECT_USER } from './actionTypes';

export function selectedUserIdReducer(state = 0, action) {
    const { type, payload } = action;
    switch (type) {
    case SELECT_USER:
        return payload;
    default:
        return state;
    }
}

```

## Writing Selectors

`redux` and `reselect` libraries fit together with the [*Command Query Responsibility Segregation* pattern](http://martinfowler.com/bliki/CQRS.html). The gist of it is that you use a different model to update data (reducers in Redux) and to read data (selectors in Redux). We've handled the updating part of our state management. We're yet to define our selectors.

First, let's think about what we want to pass to our React components.

- Since we want to show the name of the current user, and bind action creators with the currently selected user's id, we need an object that describes the currently selected user with an id and a name. We'll call this selector `user`.
- We want to show a list of todos for the selected user. Each todo in that list should have its id, text, status (done or not), and a list of tag names associated with that todo, so we can render it nicely. We'll call this selector `todos`.
- Since we want the end user to be able to select which User to show todos for, we need a list of users you can select, with an id and the name for each user. We'll call this selector `users`.

Here's selectors.js, where we implement those selectors:

```javascript
// selectors.js
import { schema } from './models';
import { createSelector } from 'reselect';

// Selects the state managed by Redux-ORM.
export const ormSelector = state => state.orm;

// Redux-ORM selectors work with reselect. To feed input
// selectors to a Redux-ORM selector, we use the reselect `createSelector` function.
export const todos = createSelector(
    // The first input selector should always be the orm selector.
    // Behind the scenes, `schema.createSelector` begins a Redux-ORM
    // session with the value returned by `ormSelector` and passes
    // that Session instance as an argument instead.
    // So `orm` below is a Session instance.
    ormSelector,
    state => state.selectedUserId,
    schema.createSelector((orm, userId) => {
        console.log('Running todos selector');

        // We could also do orm.User.withId(userId).todos.map(...)
        // but this saves a query on the User table.
        //
        // `.withRefs` means that the next operation (in this case filter)
        // will use direct references from the state instead of Model instances.
        // If you don't need any Model instance methods, you should use withRefs.
        return orm.Todo.withRefs.filter({ user: userId }).map(todo => {
            // `todo.ref` is a direct reference to the state,
            // so we need to be careful not to mutate it.
            //
            // We want to add a denormalized `tags` attribute
            // to each of our todos, so we make a shallow copy of `todo.ref`.
            const obj = Object.assign({}, todo.ref);
            obj.tags = todo.tags.withRefs.map(tag => tag.name);

            return obj;
        });
    })
);

export const user = createSelector(
    ormSelector,
    state => state.selectedUserId,
    schema.createSelector((orm, selectedUserId) => {
        console.log('Running user selector');
        // .ref returns a reference to the plain
        // JavaScript object in the store.
        // It includes the id and name that we need.
        return orm.User.withId(selectedUserId).ref;
    })
);

export const users = createSelector(
    ormSelector,
    schema.createSelector(orm => {
        console.log('Running users selector');

        // `.toRefArray` returns a new Array that includes
        // direct references to each User object in the state.
        return orm.User.all().toRefArray();
    })
);
```

Like `reselect` selectors, Redux-ORM selectors have memoization, but it works a little differently. `reselect` checks if the passed arguments match the previous ones, and if so, returns the previous result. Redux-ORM selectors always take the whole `orm` branch as the first argument, therefore `reselect` style memoization would only work when the whole database has not changed.

To solve this, Redux-ORM observes which models' states you actually accessed when you ran the `todos` selector for the first time. On consecutive calls, before running the selector, the memoize function checks if any of those models' state has changed - if so, the selector is run again. Otherwise the previous result is returned.

Redux-ORM selectors are compatible with `reselect` selectors, as they are `reselect` selectors with a schema-specific memoization function.

> ### How Redux-ORM Selector Memoization Works
> 
> You don't need to know this to use Redux-ORM, but in case you're interested, here are the step-by-step instructions Redux-ORM uses to memoize selectors.
>
> 1. Has the selector been run before? If not, go to 5.
> 2. If the selector has other input selectors in addition to the ORM state selector, check their results for equality with the previous results. If they aren't equal, go to 5.
> 3. Is the ORM state referentially equal to the previous ORM state the selector was called with? If yes, return the previous result.
> 4. Check which Model's states the selector has accessed on previous runs. Check for equality with each of those states versus their states in the previous ORM state. If all of them are equal, return the previous result.
> 5. Run the selector. Check the Session object used by the selector for which Model's states were accessed, and merge them with the previously saved information about accessed models (if-else branching can change which models are accessed on different inputs). Save the ORM state and other arguments the selector was called with, overriding previously saved values. Save the selector result. Return the selector result.

So for `todos` selector, we access the Todo and Tag models (because we access all todos with `Todo.map(todo => ...)` and the related tags with `todo.tags`). The `user` selector accesses only the User model. All of our actions modify either the Todo or Tag model states, or change the selected user, so the `todos` selector is run after every update. If we also had a Tag selector like this:

```javascript
const tagNames = schema.createSelector(orm => {
    return orm.Tag.map(tag => tag.name);
});
```

it would only get run after the actions `createTodo`, `addTagToTodo` and `removeTagFromTodo` that possibly change the Tag model state.

When possible, we return plain objects and direct references from the state from selectors. It is much easier to use pure React components by passing plain JavaScript to props -- with Model instances, you would have to override `shouldComponentUpdate` to avoid redundant renders.

## Creating React Components

Next up, let's create our application's main React component that uses the action creators we defined and receives the views we defined through selectors as props.

```jsx
// app.js
/* eslint-disable no-shadow */
import React, { PropTypes } from 'react';
import PureComponent from 'react-pure-render/component';
import { connect } from 'react-redux';

// Dumb components, their implementation is not relevant
// to this article.
import {
    TodoItem,
    AddTodoForm,
    UserSelector,
} from './components';

import {
    selectUser,
    createTodo,
    markDone,
    deleteTodo,
    addTagToTodo,
    removeTagFromTodo,
} from './actions';
import {
    todos,
    user,
    users,
} from './selectors';

class App extends PureComponent {
    render() {
        const props = this.props;

        const {
            todos,
            users,
            selectedUser,

            selectUser,
            createTodo,
            markDone,
            deleteTodo,
            addTagToTodo,
            removeTagFromTodo,
        } = props;

        console.log('Props received by App component:', props);

        const todoItems = todos.map(todo => {
            return (
                // TodoItem is a dumb component, it's implementation
                // is not in this article's interest.
                <TodoItem key={todo.id}
                          tags={todo.tags}
                          done={todo.done}
                          onAddTag={addTagToTodo.bind(null, todo.id)}
                          onRemoveTag={removeTagFromTodo.bind(null, todo.id)}
                          onMarkDone={markDone.bind(null, todo.id)}
                          onDelete={deleteTodo.bind(null, todo.id)}>
                    {todo.text}
                </TodoItem>
            );
        });

        const userChoices = users.map(user => {
            return <option key={user.id} value={user.id}>{user.name}</option>;
        });

        const onUserSelect = userId => {
            selectUser(userId);
        };

        const onCreate = ({ text, tags }) => createTodo({ text, tags, user: selectedUser.id});
        
        return (
            <div>
                <h1>Todos for {selectedUser.name}</h1>
                <UserSelector onSelect={onUserSelect}>
                    {userChoices}
                </UserSelector>
                <ul className="list-group">
                    {todoItems}
                </ul>
                <h2>Add Todo for {selectedUser.name}</h2>
                <AddTodoForm onSubmit={onCreate}/>
            </div>
        );
    }
}

App.propTypes = {
    todos: PropTypes.arrayOf(PropTypes.object).isRequired,
    users: PropTypes.arrayOf(PropTypes.object).isRequired,
    selectedUser: PropTypes.object.isRequired,

    selectUser: PropTypes.func.isRequired,
    createTodo: PropTypes.func.isRequired,
    markDone: PropTypes.func.isRequired,
    deleteTodo: PropTypes.func.isRequired,
    addTagToTodo: PropTypes.func.isRequired,
    removeTagFromTodo: PropTypes.func.isRequired,
};

// This function takes the Redux state, runs the
// selectors and returns the props passed to App.
function stateToProps(state) {
    return {
        todos: todos(state),
        selectedUser: user(state),
        users: users(state),
    };
}

// This maps our action creators to props and binds
// them to dispatch.
const dispatchToProps = {
    selectUser,
    createTodo,
    markDone,
    deleteTodo,
    addTagToTodo,
    removeTagFromTodo,
};

export default connect(stateToProps, dispatchToProps)(App);

```

## Bootstrapping Initial State

To create an initial state for our app, we can manually instantiate an ORM session. To construct the initial state, we don't need immutable operations. We can do that with a mutating session.

In the model reducers and selectors, a session was instantiated for us automatically. You can instantiate a mutating session by calling the `withMutations` method on a Schema instance, and an immutable one with the `from` method. Both methods take a state object as the required first argument, and optionally an action object as the second argument.

Let's define a bootstrap function in bootstrap.js that initializes our state with some simple data.

```javascript
// bootstrap.js
export default function bootstrap(schema) {
    // Get the empty state according to our schema.
    const state = schema.getDefaultState();

    // Begin a mutating session with that state.
    // `state` will be mutated.
    const session = schema.withMutations(state);

    // Model classes are available as properties of the
    // Session instance.
    const { Todo, Tag, User } = session;

    // Start by creating entities whose props are not dependent
    // on others.
    const user = User.create({
        id: 0, // optional. If omitted, Redux-ORM uses a number sequence starting from 0.
        name: 'Tommi',
    });
    const otherUser = User.create({
        id: 1, // optional.
        name: 'John',
    });

    // Tags to start with.
    const work = Tag.create({ name: 'work' });
    const personal = Tag.create({ name: 'personal' });
    const urgent = Tag.create({ name: 'urgent' });
    const chore = Tag.create({ name: 'chore' });

    // Todo's for `user`
    Todo.create({
        text: 'Buy groceries',
        done: false,
        user,
        tags: [personal], // We could also pass ids instead of the Tag instances.
    });
    Todo.create({
        text: 'Attend meeting',
        done: false,
        user,
        tags: [work],
    });
    Todo.create({
        text: 'Pay bills',
        done: false,
        user,
        tags: [personal, urgent],
    });

    // Todo's for `otherUser`
    Todo.create({
        text: 'Prepare meals for the week',
        done: false,
        user: otherUser,
        tags: [personal, chore],
    });
    Todo.create({
        text: 'Fix the washing machine',
        done: false,
        user: otherUser,
        tags: [personal, chore],
    });
    Todo.create({
        text: 'Negotiate internet subscription',
        done: false,
        user: otherUser,
        tags: [personal, urgent],
    });

    // Return the whole Redux initial state.
    return {
        orm: state,
        selectedUserId: 0,
    };
}

```

Then we can feed that state to Redux. Schema instances have a `reducer` method that returns a reducer function you can plug in to a root reducer. A common way to do that is to have an `orm` branch in your state. Here's the index.js file that brings the whole app together.

```jsx
// index.js
import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import createLogger from 'redux-logger';
import { schema } from './models';
import { selectedUserIdReducer } from './reducers';
import bootstrap from './bootstrap';
import App from './app';

const rootReducer = combineReducers({
    orm: schema.reducer(),
    selectedUserId: selectedUserIdReducer,
});

// We're using `redux-logger`. Open up the console in the demo and you can inspect
// the internal state maintained by Redux-ORM.
const createStoreWithMiddleware = applyMiddleware(createLogger())(createStore);

const store = createStoreWithMiddleware(rootReducer, bootstrap(schema));

function main() {
    // In the repo, we have a simple index.html that includes Bootstrap CSS files
    // and a div element with id `app`.
    const app = document.getElementById('app');
    ReactDOM.render((
        <Provider store={store}>
            <App />
        </Provider>
    ), app);
}

main();

```

## Testing Reducers and Selectors

We want to test that we update our state correctly based on action objects. No problem. Redux-ORM makes testing easier too.

For good integration testing, we want to have nice test data and have the ability to easily generate it. Using an adapter, we can utilize the [`factory-girl`](https://github.com/aexmachina/factory-girl) library to generate data for us (this is overkill for a Todo app, but it is handy in larger projects). You could also use the function we wrote in bootstrap.js to generate test data.

Here's test/factories.js:

```javascript
// test/factories.js
import _factory from 'factory-girl';
import { Todo, User, Tag } from '../models';
import bluebird from 'bluebird';
import { ReduxORMAdapter } from './utils';

// factory-girl only works asynchronously with associated models,
// so we need to roll with that even though Redux-ORM is synchronous.
// We promisify factory-girl so we can use Promises instead of callbacks.
const factory = _factory.promisify(bluebird);

// Use a simple adapter for Redux-ORM
factory.setAdapter(new ReduxORMAdapter());

factory.define('Todo', Todo, {
    id: factory.sequence(n => n),
    text: factory.sequence(n => `Todo ${n}`),
    user: factory.assoc('User', 'id'),
    tags: factory.assocMany('Tag', 'name', 4), // 4 tags for each Todo
    done: factory.sequence(n => n % 2 ? true : false),
});

factory.define('User', User, {
    id: factory.sequence(n => n),
    name: factory.sequence(n => `User ${n}`),
});

factory.define('Tag', Tag, {
    name: factory.sequence(n => `Tag ${n}`),
});

export default factory;

```

Now we can use the factories to generate some initial data. In our model test suite's `beforeEach`, we start a mutating session, so that `factory-girl` generates the data to a mutating state object. (*Model classes are currently singletons that can be connected to zero or one sessions at a time, so this works even though `factory-girl` knows only about our Model classes and not our Session instance. The Model classes may not be singletons in the future, so I recommend always getting your Model classes from the Session instance*)

```javascript
/* eslint no-unused-expressions: 0 */
import { expect } from 'chai';
import {
    CREATE_TODO,
    MARK_DONE,
    DELETE_TODO,
    ADD_TAG_TO_TODO,
    REMOVE_TAG_FROM_TODO,
} from '../actionTypes';
import { schema } from '../models';
import factory from './factories';
import Promise from 'bluebird';
import { applyActionAndGetNextSession } from './utils';

describe('Models', () => {
    // This will be the initial ORM state.
    let state;

    // This will be a Session instance with the initial data.
    let session;

    beforeEach(done => {
        // Get the default state and start a mutating session.
        // Before we start another session, all Model classes
        // will be bound to this session.
        state = schema.getDefaultState();
        session = schema.withMutations(state);

        factory.createMany('User', 2).then(users => {
            return Promise.all(users.map(user => {
                const userId = user.getId();

                // Create 10 todos for both of our 2 users.
                return factory.createMany('Todo', { user: userId }, 10);
            }));
        }).then(() => {
            // Generating data is finished, start up an immutable session.
            session = schema.from(state);

            // Let mocha know we're done setting up.
            done();
        });
    });

    it('correctly handle CREATE_TODO', () => {
        const todoText = 'New Todo Text!';
        const todoTags = 'testing, nice, cool';
        const user = session.User.first();
        const userId = user.getId();

        const action = {
            type: CREATE_TODO,
            payload: {
                text: todoText,
                tags: todoTags,
                user: userId,
            },
        };

        expect(user.todos.count()).to.equal(10);
        expect(session.Todo.count()).to.equal(20);
        expect(session.Tag.count()).to.equal(80);

        // The below helper function completes an action dispatch
        // loop with the given state and action.
        // Finally, it returns a new Session started with the
        // next state yielded from the dispatch loop.
        // With this new Session, we can query the resulting state.
        const {
            Todo,
            Tag,
            User,
        } = applyActionAndGetNextSession(schema, state, action);

        expect(User.withId(userId).todos.count()).to.equal(11);
        expect(Todo.count()).to.equal(21);
        expect(Tag.count()).to.equal(83);

        const newTodo = Todo.last();

        expect(newTodo.text).to.equal(todoText);
        expect(newTodo.user.getId()).to.equal(userId);
        expect(newTodo.done).to.be.false;
        expect(newTodo.tags.map(tag => tag.name)).to.deep.equal(['testing', 'nice', 'cool']);
    });

    // To see tests for the rest of the actions, check out the source.
});
```

We can use a similar `beforeEach` setup with selectors, although we'll construct the whole Redux state that they take as an input instead of just the ORM state (this includes the selected user id):

```javascript
import { expect } from 'chai';
import {
    users,
    user,
    todos,
} from '../selectors';
import { schema } from '../models';
import factory from './factories';
import Promise from 'bluebird';
import { applyActionAndGetNextSession } from './utils';

describe('Selectors', () => {
    let ormState;
    let session;
    let state;

    beforeEach(done => {
        ormState = schema.getDefaultState();

        session = schema.withMutations(ormState);

        factory.createMany('User', 2).then(users => {
            return Promise.all(users.map(user => {
                const userId = user.getId();

                return factory.createMany('Todo', { user: userId }, 10);
            }));
        }).then(() => {
            session = schema.from(ormState);

            state = {
                orm: ormState,
                selectedUserId: session.User.first().getId(),
            };

            done();
        });
    });

    it('users works', () => {
        const result = users(state);

        expect(result).to.have.length(2);
        expect(result[0]).to.contain.all.keys(['id', 'name']);
    });

    it('todos works', () => {
        const result = todos(state);

        expect(result).to.have.length(10);
        expect(result[0]).to.contain.all.keys(['id', 'text', 'user', 'tags', 'done']);
        expect(result[0].tags).to.have.length(4);
    });

    it('user works', () => {
        const result = user(state);
        expect(result).to.be.an('object');
        expect(result).to.contain.all.keys(['id', 'name']);
    });
});

```

And that's it! Play around with the [live demo](https://tommikaikkonen.github.io/redux-orm-primer) and remember to open up the console.

Ping me on Twitter ([@tommikaikkonen](https://twitter.com/tommikaikkonen)) if you have any questions, or open up an issue in the [redux-orm repository](https://github.com/tommikaikkonen/redux-orm).