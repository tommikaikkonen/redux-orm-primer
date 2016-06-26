/* eslint no-unused-expressions: 0, no-shadow: 0 */
import { expect } from 'chai';
import {
    users,
    user,
    todos,
} from '../selectors';
import { schema } from '../models';
import factory from './factories';
import Promise from 'bluebird';
import { applyActionAndGetNextSession, ReduxORMAdapter } from './utils';

describe('Selectors', () => {
    let ormState;
    let session;
    let state;

    beforeEach(done => {
        ormState = schema.getDefaultState();

        session = schema.withMutations(ormState);

        factory.setAdapter(new ReduxORMAdapter(session));

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
