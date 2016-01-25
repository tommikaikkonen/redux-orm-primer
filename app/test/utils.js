export function applyActionAndGetNextSession(schema, state, action) {
    const nextState = schema.from(state, action).reduce();
    return schema.from(nextState);
}

export class ReduxORMAdapter {
    build(Model, props) {
        return Model.create(props);
    }

    get(doc, attr) {
        return doc[attr];
    }

    set(props, doc) {
        doc.update(props);
    }

    save(doc, Model, cb) {
        process.nextTick(cb);
    }

    destroy(doc, Model, cb) {
        doc.delete();
        process.nextTick(cb);
    }
}
