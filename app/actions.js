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
