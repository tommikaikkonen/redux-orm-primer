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
