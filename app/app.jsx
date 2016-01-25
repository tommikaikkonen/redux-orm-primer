/* eslint-disable no-shadow */
import React, { PropTypes } from 'react';
import PureComponent from 'react-pure-render/component';
import { connect } from 'react-redux';
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
