export function applyActionAndGetNextSession(schema, state, action) {
    const nextState = schema.from(state, action).reduce();
    return schema.from(nextState);
}

export class ReduxORMAdapter {
    constructor(session) {
        this.session = session;
    }

    build(modelName, props) {
        return this.session[modelName].create(props);
    }

    get(doc, attr) {
        return doc[attr];
    }

    set(props, doc) {
        doc.update(props);
    }

    save(doc, modelName, cb) {
        process.nextTick(cb);
    }

    destroy(doc, modelName, cb) {
        doc.delete();
        process.nextTick(cb);
    }
}
