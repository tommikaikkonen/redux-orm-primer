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
