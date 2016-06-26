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
import { applyActionAndGetNextSession, ReduxORMAdapter } from './utils';

describe('Models', () => {
    // This will be the initial state.
    let state;

    // This will be a Session instance with the initial data.
    let session;

    beforeEach(done => {
        // Get the default state and start a mutating session.
        state = schema.getDefaultState();
        session = schema.withMutations(state);

        factory.setAdapter(new ReduxORMAdapter(session));

        factory.createMany('User', 2).then(users => {
            return Promise.all(users.map(user => {
                const userId = user.getId();

                // Create 10 todos for both of our 2 users.
                return factory.createMany('Todo', { user: userId }, 10);
            }));
        }).then(() => {
            // Generating data is finished, start up a session.
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

    it('correctly handle MARK_DONE', () => {
        const todo = session.Todo.filter({ done: false }).first();
        const todoId = todo.getId();

        const action = {
            type: MARK_DONE,
            payload: todoId,
        };

        expect(todo.done).to.be.false;

        const { Todo } = applyActionAndGetNextSession(schema, state, action);

        expect(Todo.withId(todoId).done).to.be.true;
    });

    it('correctly handle DELETE_TODO', () => {
        const todo = session.Todo.first();
        const todoId = todo.getId();

        const action = {
            type: DELETE_TODO,
            payload: todoId,
        };

        expect(session.Todo.count()).to.equal(20);

        const { Todo } = applyActionAndGetNextSession(schema, state, action);

        expect(Todo.count()).to.equal(19);
        expect(() => Todo.withId(todoId)).to.throw(Error);
    });

    it('correctly handle ADD_TAG_TO_TODO', () => {
        const todo = session.Todo.first();
        const todoId = todo.getId();

        const newTagName = 'coolnewtag';

        const action = {
            type: ADD_TAG_TO_TODO,
            payload: {
                todo: todoId,
                tag: newTagName,
            },
        };

        expect(session.Tag.count()).to.equal(80);

        const { Todo, Tag } = applyActionAndGetNextSession(schema, state, action);

        expect(Tag.count()).to.equal(81);
        expect(Tag.last().name).to.equal(newTagName);

        expect(Todo.withId(todoId).tags.withRefs.map(tag => tag.name)).to.include(newTagName);
    });

    it('correctly handles REMOVE_TAG_FROM_TODO', () => {
        const todo = session.Todo.first();
        const todoId = todo.getId();

        const removeTagId = todo.tags.first().getId();

        const action = {
            type: REMOVE_TAG_FROM_TODO,
            payload: {
                todo: todoId,
                tag: removeTagId,
            },
        };

        expect(session.Tag.count()).to.equal(80);

        const { Todo, Tag } = applyActionAndGetNextSession(schema, state, action);

        // Tag count should remain the same.
        expect(Tag.count()).to.equal(80);

        expect(Todo.withId(todoId).tags.withRefs.map(tag => tag.name)).to.not.include(removeTagId);
    });
});
